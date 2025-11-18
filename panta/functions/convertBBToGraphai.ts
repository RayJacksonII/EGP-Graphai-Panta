export function convertBBToGraphai(bb: {
  text: string;
  paragraphs?: number[];
  footnotes?: { type?: string; text: string }[];
}): any[] {
  const footnotes = bb.footnotes ? [...bb.footnotes] : [];

  let processedText = preprocessBBText(bb.text);
  let elements = parseBBText(processedText, footnotes, true);

  // Merge script tags with following Strong's tags
  elements = mergeScriptAndStrongs(elements);

  // Handle paragraphs
  if (bb.paragraphs && bb.paragraphs.length > 0) {
    elements = applyParagraphMarkers(elements, bb.paragraphs);
  }

  // Merge consecutive strings
  elements = mergeConsecutiveStrings(elements);

  return elements;
}

function preprocessBBText(text: string): string {
  // Bugfixes for Greek punctuation
  let processed = text.replace(/(.)\[\/greek\]̈\[greek\]/g, "̈$1");
  processed = processed.replace(/(.)\[\/greek\]̈/g, "̈$1[/greek]");
  processed = processed.replace(/\[\/greek\]’ \[greek\]/g, "’ ");
  processed = processed.replace(/\[\/greek\]’/g, "’[/greek]");
  processed = processed.replace(/\[\/greek\] \[greek\]/g, " ");

  // Handle escaped brackets for script tags: [[greek]...[/greek]]
  // Replace [[greek] with ◄LBRACKET◄[greek] (literal [ before the tag)
  // Replace [/greek]] with [/greek]◄RBRACKET◄ (literal ] after the tag)
  processed = processed.replace(/\[\[(greek|hebrew)\]/g, "◄LBRACKET◄[$1]");
  processed = processed.replace(/\[\/(greek|hebrew)\]\]/g, "[/$1]◄RBRACKET◄");

  // Handle OTHER double brackets (not for script tags) as literal brackets
  // These are just plain [[...]] that should remain as literal text
  processed = processed.replace(/\[\[/g, "◄LBRACKET◄◄LBRACKET◄");
  processed = processed.replace(/\]\]/g, "◄RBRACKET◄◄RBRACKET◄");

  // Move spaces into script tags ONLY when the space follows a strongs tag
  // Pattern: [strongs...] [greek] becomes [strongs...][greek]
  processed = processed.replace(
    /(\[strongs[^\]]*\]) \[(greek|hebrew)\]/g,
    "$1[$2] "
  );

  return processed;
}

function restoreLiteralBrackets(elements: any[]): any[] {
  return elements.map((elem) => {
    if (typeof elem === "string") {
      return elem.replace(/◄LBRACKET◄/g, "[").replace(/◄RBRACKET◄/g, "]");
    } else if (typeof elem === "object") {
      // Recursively restore in nested structures (like footnote content, text property)
      if (elem.text && typeof elem.text === "string") {
        elem.text = elem.text
          .replace(/◄LBRACKET◄/g, "[")
          .replace(/◄RBRACKET◄/g, "]");
      }
      if (elem.foot && Array.isArray(elem.foot.content)) {
        elem.foot.content = restoreLiteralBrackets(elem.foot.content);
      }
    }
    return elem;
  });
}

function parseBBText(
  text: string,
  footnotes: { type?: string; text: string }[],
  restoreBrackets = false
): any[] {
  let elements: any[] = [];
  const tagRegex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    // Add plain text before tag
    if (match.index > lastIndex) {
      const plainText = text.substring(lastIndex, match.index);
      addPlainText(plainText, elements, footnotes);
    }

    const tagContent = match[1];

    // Self-closing tag (ends with /)
    if (tagContent.endsWith("/")) {
      const tagStr = tagContent.slice(0, -1).trim();
      if (tagStr.startsWith("strongs ")) {
        const attrs = parseAttributes(tagStr);
        const strongObj: any = {};

        // Normalize Strong's: uppercase, strip leading zeros
        if (attrs.id) {
          const prefix = attrs.id[0].toUpperCase();
          const num = parseInt(attrs.id.slice(1), 10);
          strongObj.strong = prefix + num;
        }

        // Morphology
        if (attrs.m) {
          strongObj.morph = attrs.m;
        } else if (attrs.tvm) {
          strongObj.morph = attrs.tvm + (attrs.tvm2 ? "/" + attrs.tvm2 : "");
        }

        // Merge with previous element if it's a text string
        if (elements.length > 0) {
          const prev = elements[elements.length - 1];
          if (typeof prev === "string" && prev.trim().length > 0) {
            // Trim trailing space from previous string
            const trimmed = prev.trimEnd();
            elements[elements.length - 1] = { text: trimmed, ...strongObj };
          } else if (typeof prev === "object" && prev.text && !prev.strong) {
            // Merge into existing text object
            Object.assign(prev, strongObj);
          } else {
            elements.push(strongObj);
          }
        } else {
          elements.push(strongObj);
        }
      } else {
        // Unknown self-closing tag, treat as literal text
        elements.push(match[0]);
      }
    } else {
      // Opening tag
      const tag = tagContent.trim();
      const closeTag = `[/${tag}]`;
      const closeIndex = text.indexOf(closeTag, match.index + match[0].length);

      if (closeIndex !== -1) {
        const innerText = text.substring(
          match.index + match[0].length,
          closeIndex
        );

        if (tag === "greek" || tag === "hebrew") {
          elements.push({
            text: innerText,
            script: tag === "greek" ? "G" : "H",
          });
        } else if (
          tag === "i" ||
          tag === "b" ||
          tag === "sc" ||
          tag === "red"
        ) {
          const mark = tag === "red" ? "woc" : tag;

          // Check for nested marks
          if (elements.length > 0) {
            const prev = elements[elements.length - 1];
            if (
              typeof prev === "object" &&
              prev.text === innerText &&
              prev.marks
            ) {
              // Nested marks
              prev.marks.push(mark);
            } else {
              elements.push({ text: innerText, marks: [mark] });
            }
          } else {
            elements.push({ text: innerText, marks: [mark] });
          }
        } else {
          // Unknown tag, treat as literal text
          elements.push(match[0]);
        }

        tagRegex.lastIndex = closeIndex + closeTag.length;
      } else {
        // No closing tag, treat as literal text
        elements.push(match[0]);
      }
    }

    lastIndex = tagRegex.lastIndex;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    const plainText = text.substring(lastIndex);
    addPlainText(plainText, elements, footnotes);
  }

  // Restore literal brackets if requested
  if (restoreBrackets) {
    elements = restoreLiteralBrackets(elements);
  }

  return elements;
}

function addPlainText(
  text: string,
  elements: any[],
  footnotes: { type?: string; text: string }[]
): void {
  // Handle line breaks
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle footnotes (° markers)
    const parts = line.split("°");

    for (let j = 0; j < parts.length; j++) {
      if (parts[j]) {
        elements.push(parts[j]);
      }

      // Add footnote after this part
      if (j < parts.length - 1 && footnotes.length > 0) {
        const footnote = footnotes.shift()!;
        const preprocessedFootnote = preprocessBBText(footnote.text);
        const footContent = parseBBText(preprocessedFootnote, [], true);

        // If footnote content is just a single string, use it directly
        const content =
          footContent.length === 1 && typeof footContent[0] === "string"
            ? footContent[0]
            : mergeConsecutiveStrings(footContent);

        const footObj: any = {
          foot: {
            ...(footnote.type && { type: footnote.type }),
            content,
          },
        };

        // Attach footnote to last element
        const lastIdx = elements.length - 1;
        if (lastIdx >= 0) {
          if (typeof elements[lastIdx] === "string") {
            elements[lastIdx] = { text: elements[lastIdx], ...footObj };
          } else {
            Object.assign(elements[lastIdx], footObj);
          }
        }
      }
    }

    // Add line break (except after last line)
    if (i < lines.length - 1) {
      const lastIdx = elements.length - 1;
      if (lastIdx >= 0) {
        if (typeof elements[lastIdx] === "string") {
          elements[lastIdx] = { text: elements[lastIdx], break: true };
        } else {
          elements[lastIdx].break = true;
        }
      }
    }
  }
}

function mergeScriptAndStrongs(elements: any[]): any[] {
  let result: any[] = [];

  for (let i = 0; i < elements.length; i++) {
    const elem = elements[i];

    // Check if this is a script element followed by space and Strong's
    if (typeof elem === "object" && elem.script && elem.text) {
      const next = i + 1 < elements.length ? elements[i + 1] : null;
      const nextNext = i + 2 < elements.length ? elements[i + 2] : null;

      // Pattern: [greek]text[/greek] [strongs...]
      // next is " ", nextNext is {strong:...}
      if (
        next &&
        typeof next === "string" &&
        next.trim() === "" &&
        nextNext &&
        typeof nextNext === "object" &&
        nextNext.strong &&
        !nextNext.text
      ) {
        // Merge script + strong + morph
        result.push({
          ...elem,
          strong: nextNext.strong,
          ...(nextNext.morph && { morph: nextNext.morph }),
        });
        i += 2; // Skip next two elements
      } else {
        result.push(elem);
      }
    } else {
      result.push(elem);
    }
  }

  // Remove whitespace-only strings between two Strong's-only objects
  // AND ensure all objects have text property
  result = result.filter((elem, i) => {
    if (typeof elem === "string" && elem.trim() === "") {
      const prev = i > 0 ? result[i - 1] : null;
      const next = i < result.length - 1 ? result[i + 1] : null;

      // Drop space between two strong-only objects
      if (
        prev &&
        typeof prev === "object" &&
        prev.strong &&
        next &&
        typeof next === "object" &&
        next.strong &&
        !next.text
      ) {
        return false;
      }
    }
    return true;
  });

  // Add empty text property to objects that don't have one
  result = result.map((elem) => {
    if (
      typeof elem === "object" &&
      !elem.text &&
      !elem.heading &&
      !elem.paragraph &&
      !elem.subtitle
    ) {
      return { text: "", ...elem };
    }
    return elem;
  });

  return result;
}

function applyParagraphMarkers(elements: any[], positions: number[]): any[] {
  // Build cumulative text string to map positions
  let currentPos = 0;
  const elemMap: { elem: any; start: number; end: number }[] = [];

  for (const elem of elements) {
    const text = typeof elem === "string" ? elem : elem.text || "";
    const start = currentPos;
    const end = currentPos + text.length;
    elemMap.push({ elem, start, end });
    currentPos = end;
  }

  const result: any[] = [];

  for (let i = 0; i < elemMap.length; i++) {
    const { elem, start, end } = elemMap[i];
    const text = typeof elem === "string" ? elem : elem.text || "";

    // Check if this element starts at position 0 and position 0 is marked
    if (start === 0 && positions.includes(0)) {
      // Don't return yet - check if there are also inner positions
      const innerPositions = positions.filter(
        (pos) => pos > 0 && pos >= start && pos < end
      );

      if (innerPositions.length === 0) {
        // Just mark as paragraph and continue
        if (typeof elem === "string") {
          result.push({ text: elem, paragraph: true });
        } else {
          result.push({ ...elem, paragraph: true });
        }
        continue;
      }

      // There are inner positions too, so split
      let lastOffset = 0;
      const firstPart: any = {};

      for (let j = 0; j < innerPositions.length; j++) {
        const pos = innerPositions[j];
        const offset = pos - start;

        // Text before the space
        const beforeText = text.substring(lastOffset, offset);
        if (beforeText.length > 0) {
          if (j === 0) {
            // First part gets paragraph marker
            if (typeof elem === "string") {
              result.push({ text: beforeText, paragraph: true });
            } else {
              result.push({ ...elem, text: beforeText, paragraph: true });
            }
          } else {
            // Subsequent parts also get paragraph markers
            if (typeof elem === "string") {
              result.push({ text: beforeText, paragraph: true });
            } else {
              result.push({ ...elem, text: beforeText, paragraph: true });
            }
          }
        }

        // Skip the space at offset (it gets dropped)
        lastOffset = offset + 1;
      }

      // Add remaining text with paragraph marker
      const afterText = text.substring(lastOffset);
      if (afterText.length > 0) {
        if (typeof elem === "string") {
          result.push({ text: afterText, paragraph: true });
        } else {
          result.push({ ...elem, text: afterText, paragraph: true });
        }
      }

      continue;
    }

    // Find paragraph positions within this element's range (excluding position 0)
    const innerPositions = positions.filter(
      (pos) => pos > 0 && pos >= start && pos < end
    );

    if (innerPositions.length === 0) {
      result.push(elem);
    } else {
      // Split this element at paragraph positions
      let lastOffset = 0;

      for (let j = 0; j < innerPositions.length; j++) {
        const pos = innerPositions[j];
        const offset = pos - start;

        // Text before the space
        const beforeText = text.substring(lastOffset, offset);

        if (beforeText.length > 0) {
          if (j === 0) {
            // First piece - no paragraph marker
            if (typeof elem === "string") {
              result.push(beforeText);
            } else {
              result.push({ ...elem, text: beforeText });
            }
          } else {
            // Subsequent pieces - they start a new paragraph
            if (typeof elem === "string") {
              const obj = { text: beforeText, paragraph: true };
              result.push(obj);
            } else {
              result.push({ ...elem, text: beforeText, paragraph: true });
            }
          }
        }

        // Skip the space at offset (it gets dropped)
        lastOffset = offset + 1;
      }

      // Add remaining text with paragraph marker
      const afterText = text.substring(lastOffset);
      if (afterText.length > 0) {
        if (typeof elem === "string") {
          result.push({ text: afterText, paragraph: true });
        } else {
          result.push({ ...elem, text: afterText, paragraph: true });
        }
      }
    }
  }

  return result;
}

function mergeConsecutiveStrings(elements: any[]): any[] {
  const result: any[] = [];

  for (const elem of elements) {
    if (
      typeof elem === "string" &&
      result.length > 0 &&
      typeof result[result.length - 1] === "string"
    ) {
      result[result.length - 1] += elem;
    } else {
      result.push(elem);
    }
  }

  return result;
}

function parseAttributes(tagStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const parts = tagStr.split(/\s+/);

  for (const part of parts.slice(1)) {
    const eqIndex = part.indexOf("=");
    if (eqIndex !== -1) {
      const key = part.substring(0, eqIndex);
      const value = part.substring(eqIndex + 1).replace(/^["']|["']$/g, "");
      attrs[key] = value;
    }
  }

  return attrs;
}
