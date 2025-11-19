// Use unique Unicode placeholders that won't appear in Bible text
const OPEN_MARKER = "🔓";
const CLOSE_MARKER = "🔒";
const SELF_CLOSE_MARKER = "🔐";

export function convertBBToGraphai(bb: {
  text: string;
  paragraphs?: number[];
  footnotes?: { type?: string; text: string }[];
}): any[] {
  const footnotes = bb.footnotes ? [...bb.footnotes] : [];

  let processedText = preprocessBBText(bb.text);
  let elements = parseBBText(processedText, footnotes);

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
  let processed = text;

  // Bugfixes for Greek punctuation
  processed = processed
    .replace(/(.)\[\/greek\]̈\[greek\]/g, "̈$1")
    .replace(/(.)\[\/greek\]̈/g, "̈$1[/greek]")
    .replace(/\[\/greek\]’ \[greek\]/g, "’ ")
    .replace(/\[\/greek\]’/g, "’[/greek]")
    .replace(/\[\/greek\] \[greek\]/g, " ");

  // Bugfixes for Hebrew TVM2
  processed = processed.replace(
    /(\[strongs id=\"h[0-9]+\" tvm=\"[0-9]+\")( \/\]) \(([0-9]+)\)/g,
    '$1 tvm2="$3"$2'
  );

  // Move spaces into script tags ONLY when the space follows a strongs tag
  // Pattern: [strongs...] [greek] becomes [strongs...][greek]
  processed = processed.replace(
    /(\[strongs[^\]]*\]) \[(greek|hebrew)\]/g,
    "$1[$2] "
  );

  // Replace BB code brackets with unique placeholders
  // Handle self-closing tags: [tag .../] -> 🔓tag ...🔐
  processed = processed.replace(
    /\[(strongs)\s+([^\]]*?)\/\]/g,
    `${OPEN_MARKER}$1 $2${SELF_CLOSE_MARKER}`
  );
  processed = processed.replace(
    /\[(strongs)\s*\/\]/g,
    `${OPEN_MARKER}$1${SELF_CLOSE_MARKER}`
  );

  // Handle opening tags: [tag] -> 🔓tag🔒
  processed = processed.replace(
    /\[(greek|hebrew|i|b|sc|red|verse)\]/g,
    `${OPEN_MARKER}$1${CLOSE_MARKER}`
  );

  // Handle closing tags: [/tag] -> 🔓/tag🔒
  processed = processed.replace(
    /\[\/(greek|hebrew|i|b|sc|red|verse)\]/g,
    `${OPEN_MARKER}/$1${CLOSE_MARKER}`
  );

  return processed;
}

function parseBBText(
  text: string,
  footnotes: { type?: string; text: string }[]
): any[] {
  let elements: any[] = [];
  const openRegex = new RegExp(
    `${OPEN_MARKER}([^${CLOSE_MARKER}${SELF_CLOSE_MARKER}]+?)(?:${CLOSE_MARKER}|${SELF_CLOSE_MARKER})`,
    "g"
  );
  let lastIndex = 0;
  let match;

  while ((match = openRegex.exec(text)) !== null) {
    // Add plain text before tag
    if (match.index > lastIndex) {
      const plainText = text.substring(lastIndex, match.index);
      addPlainText(plainText, elements, footnotes);
    }

    const tagContent = match[1];
    const isSelfClosing = match[0].endsWith(SELF_CLOSE_MARKER);

    // Self-closing tag
    if (isSelfClosing) {
      const tagStr = tagContent.trim();
      if (tagStr.startsWith("strongs ") || tagStr === "strongs") {
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
      }
      // Ignore other self-closing tags
    } else {
      // Opening tag
      const tag = tagContent.trim();
      const closeTag = `${OPEN_MARKER}/${tag}${CLOSE_MARKER}`;
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
        } else if (tag === "verse") {
          const foot = {
            type: "var",
            content: `Originally verse ${innerText}.`,
          };

          if (elements.length > 0) {
            let lastElem = elements[elements.length - 1];
            if (typeof lastElem === "string") {
              elements[elements.length - 1] = {
                text: lastElem,
                foot: foot,
              };
            } else if (typeof lastElem === "object" && !lastElem.foot) {
              lastElem.foot = foot;
            } else {
              elements.push({ text: "", foot: foot });
            }
          } else {
            elements.push({ text: "", foot: foot });
          }
        } else if (
          tag === "i" ||
          tag === "b" ||
          tag === "sc" ||
          tag === "red"
        ) {
          const mark = tag === "red" ? "woc" : tag;

          // Check if innerText contains more BB tags (nested tags)
          const hasNestedTags = innerText.includes(OPEN_MARKER);

          if (hasNestedTags) {
            // Parse nested content
            const nestedElements = parseBBText(innerText, []);

            // Apply this mark to all nested elements
            for (const nested of nestedElements) {
              if (typeof nested === "string") {
                elements.push({ text: nested, marks: [mark] });
              } else if (typeof nested === "object" && nested.text) {
                // Prepend the outer mark (not append) to maintain tag order
                const marks = nested.marks ? [mark, ...nested.marks] : [mark];
                elements.push({ ...nested, marks });
              } else {
                elements.push(nested);
              }
            }
          } else {
            // No nested tags - simple text
            // Check for nested marks on same text
            if (elements.length > 0) {
              const prev = elements[elements.length - 1];
              if (
                typeof prev === "object" &&
                prev.text === innerText &&
                prev.marks
              ) {
                // Nested marks on same text element
                prev.marks.push(mark);
              } else {
                elements.push({ text: innerText, marks: [mark] });
              }
            } else {
              elements.push({ text: innerText, marks: [mark] });
            }
          }
        }
        // Ignore verse tags and other unknown tags

        openRegex.lastIndex = closeIndex + closeTag.length;

        // Special handling for verse tag to skip space
        if (tag === "verse" && text[openRegex.lastIndex] === " ") {
          openRegex.lastIndex++;
        }
      }
      // If no closing tag, ignore (it's probably not a valid BB tag)
    }

    lastIndex = openRegex.lastIndex;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    const plainText = text.substring(lastIndex);
    addPlainText(plainText, elements, footnotes);
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
        const footContent = parseBBText(preprocessedFootnote, []);

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
  let pos0Processed = false;

  for (let i = 0; i < elemMap.length; i++) {
    const { elem, start, end } = elemMap[i];
    const text = typeof elem === "string" ? elem : elem.text || "";

    // Check if this element starts at position 0 and position 0 is marked
    if (start === 0 && positions.includes(0) && !pos0Processed) {
      pos0Processed = true;
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

      for (let j = 0; j < innerPositions.length; j++) {
        const pos = innerPositions[j];
        const offset = pos - start;

        // Text before the space
        const beforeText = text.substring(lastOffset, offset);
        if (beforeText.length > 0) {
          // All parts when position 0 is marked get paragraph markers
          if (typeof elem === "string") {
            result.push({ text: beforeText, paragraph: true });
          } else {
            result.push({ ...elem, text: beforeText, paragraph: true });
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
    }
  }

  return result;
}

function mergeConsecutiveStrings(elements: any[]): any[] {
  // First pass: merge consecutive strings
  const afterStringMerge = [];
  for (const elem of elements) {
    if (
      typeof elem === "string" &&
      afterStringMerge.length > 0 &&
      typeof afterStringMerge[afterStringMerge.length - 1] === "string"
    ) {
      afterStringMerge[afterStringMerge.length - 1] += elem;
    } else {
      afterStringMerge.push(elem);
    }
  }

  // Second pass: merge text objects with paragraph markers + strings + strong-tagged text objects
  const afterParagraphMerge = [];
  for (let i = 0; i < afterStringMerge.length; i++) {
    const elem = afterStringMerge[i];

    // NOTE: Do NOT drop or move leading paragraph markers
    // We intentionally keep objects like { text: "", strong: "G1161", paragraph: true }
    // as their own elements so the first Strong's-only token is preserved.

    // Check for pattern: {text, paragraph} + string + {text, strong}
    if (
      typeof elem === "object" &&
      elem.text &&
      elem.paragraph &&
      !elem.strong &&
      !elem.script &&
      i + 2 < afterStringMerge.length
    ) {
      const next1 = afterStringMerge[i + 1];
      const next2 = afterStringMerge[i + 2];

      // Check if next1 is a string and next2 has strong
      if (
        typeof next1 === "string" &&
        typeof next2 === "object" &&
        next2.text &&
        next2.strong
      ) {
        // Merge all three: paragraph text + string + strong text
        next2.text = elem.text + next1 + next2.text;
        next2.paragraph = true;
        i += 2; // Skip both next elements
        afterParagraphMerge.push(next2);
        continue;
      }
    }

    // Check for pattern: {text, paragraph} + {text, strong}
    if (
      typeof elem === "object" &&
      elem.text &&
      elem.paragraph &&
      !elem.strong &&
      !elem.script &&
      i + 1 < afterStringMerge.length
    ) {
      const next = afterStringMerge[i + 1];
      if (typeof next === "object" && next.text && next.strong) {
        // Merge text object with paragraph marker with following strong-tagged text object
        next.text = elem.text + next.text;
        next.paragraph = true;
        i++; // Skip the next element since we merged it
        afterParagraphMerge.push(next);
        continue;
      }
    }

    afterParagraphMerge.push(elem);
  }

  // Third pass: merge strings with following text objects that have strong numbers
  const result = [];
  for (let i = 0; i < afterParagraphMerge.length; i++) {
    const elem = afterParagraphMerge[i];
    if (typeof elem === "string" && i + 1 < afterParagraphMerge.length) {
      const next = afterParagraphMerge[i + 1];
      if (
        typeof next === "object" &&
        next.hasOwnProperty("text") &&
        next.strong
      ) {
        // Merge string with following text object that has a strong number
        // Trim trailing space from the string if the next text is empty/whitespace
        const stringToMerge = next.text.trim() === "" ? elem.trimEnd() : elem;
        next.text = stringToMerge + next.text;
        i++; // Skip the next element since we merged it
        result.push(next);
      } else {
        result.push(elem);
      }
    } else {
      result.push(elem);
    }
  }

  // Final pass: if the first element is the special
  // { text: "", strong: ..., paragraph: true } case,
  // ensure the second element does NOT also carry paragraph: true.
  if (
    result.length >= 2 &&
    typeof result[0] === "object" &&
    result[0].paragraph &&
    result[0].strong &&
    typeof result[0].text === "string" &&
    result[0].text === "" &&
    typeof result[1] === "object" &&
    result[1].paragraph
  ) {
    delete result[1].paragraph;
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
