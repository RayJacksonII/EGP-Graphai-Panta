export function convertBBToGraphai(bb: {
  text: string;
  paragraphs?: number[];
  footnotes?: { type?: string; text: string }[];
}): any[] {
  const footnotes = bb.footnotes ? [...bb.footnotes] : [];
  const elements = parseBBText(bb.text, footnotes);
  return cleanupElements(elements, bb.paragraphs);
}

function cleanupElements(
  elements: any[],
  paragraphPositions: number[] = []
): any[] {
  // Pass 1: Convert non-whitespace plain text strings that directly precede strongs into text objects
  for (let k = 0; k < elements.length - 1; k++) {
    if (
      typeof elements[k] === "string" &&
      !/^\s+$/.test(elements[k]) && // Not just whitespace
      typeof elements[k + 1] === "object" &&
      elements[k + 1].strong &&
      !elements[k + 1].text
    ) {
      // Convert to object so it can be merged with strongs
      elements[k] = { text: elements[k] };
    }
  }

  // Pass 2: Remove whitespace-only strings that come before strongs-only objects
  for (let k = elements.length - 1; k >= 0; k--) {
    if (
      k + 1 < elements.length &&
      typeof elements[k + 1] === "object" &&
      elements[k + 1].strong &&
      !elements[k + 1].text &&
      typeof elements[k] === "string" &&
      /^\s+$/.test(elements[k])
    ) {
      elements.splice(k, 1);
    }
  }

  // Pass 3: Trim trailing spaces from text before script/strong tags (but not marks)
  for (let k = 0; k < elements.length - 1; k++) {
    const nextEl = elements[k + 1];
    // If next element is a script or strong object (not marks)
    if (
      typeof nextEl === "object" &&
      (nextEl.script || nextEl.strong) &&
      !nextEl.marks
    ) {
      if (
        typeof elements[k] === "object" &&
        elements[k].text &&
        typeof elements[k].text === "string"
      ) {
        elements[k].text = elements[k].text.replace(/\s+$/, "");
      } else if (typeof elements[k] === "string") {
        elements[k] = elements[k].replace(/\s+$/, "");
        if (elements[k].length === 0) {
          elements.splice(k, 1);
          k--;
        }
      }
    }
  }

  // Pass 3b: Trim leading spaces from strings after script tags (but not after marks)
  for (let k = 1; k < elements.length; k++) {
    const prevEl = elements[k - 1];
    if (
      typeof elements[k] === "string" &&
      typeof prevEl === "object" &&
      prevEl.script &&
      !prevEl.marks &&
      elements[k].startsWith(" ")
    ) {
      elements[k] = elements[k].replace(/^\s+/, "");
      if (elements[k].length === 0) {
        elements.splice(k, 1);
        k--;
      }
    }
  }

  // Pass 3c: Trim leading spaces from text objects with strong attributes
  // These are created when plain text that precedes a strong tag is converted to an object
  // DISABLED: This was breaking paragraph splitting by removing spaces from split elements
  // for (let k = 0; k < elements.length; k++) {
  //   ...
  // }

  // Pass 4: Merge strongs into preceding text objects
  for (let k = 0; k < elements.length - 1; k++) {
    if (
      typeof elements[k] === "object" &&
      elements[k].text &&
      !elements[k].strong &&
      typeof elements[k + 1] === "object" &&
      elements[k + 1].strong &&
      !elements[k + 1].text
    ) {
      // Merge strongs data into the text object
      elements[k].strong = elements[k + 1].strong;
      if (elements[k + 1].morph) elements[k].morph = elements[k + 1].morph;
      elements.splice(k + 1, 1);
      k--;
    }
  }

  // Pass 6: Normalize spaces: collapse multiple consecutive spaces to single space
  for (let k = 0; k < elements.length; k++) {
    if (typeof elements[k] === "string") {
      elements[k] = elements[k].replace(/  +/g, " ");
    } else if (typeof elements[k] === "object" && elements[k].text) {
      elements[k].text = elements[k].text.replace(/  +/g, " ");
    }
  }

  // Pass 7: Remove whitespace-only elements between two objects that both have strong attributes
  for (let k = elements.length - 1; k >= 1; k--) {
    if (typeof elements[k] === "string" && /^\s+$/.test(elements[k])) {
      const prev = elements[k - 1];
      const next = k + 1 < elements.length ? elements[k + 1] : null;
      const prevHasStrong = typeof prev === "object" && prev.strong;
      const nextHasStrong = typeof next === "object" && next.strong;

      // Remove space between two strongs
      if (prevHasStrong && nextHasStrong) {
        elements.splice(k, 1);
      }
    }
  }

  // Pass 8: NOTE: Removed - was too aggressive. The real issues need to be fixed at parsing level

  // Pass 6: Trim leading spaces from plain text after footnotes
  for (let k = 1; k < elements.length; k++) {
    if (
      typeof elements[k] === "string" &&
      typeof elements[k - 1] === "object" &&
      elements[k - 1].foot
    ) {
      elements[k] = elements[k].replace(/^\s{2,}/, " ");
      if (elements[k].length === 0) {
        elements.splice(k, 1);
        k--;
      }
    }
  }

  // Recursively clean up footnote content
  for (let k = 0; k < elements.length; k++) {
    if (typeof elements[k] === "object" && elements[k].foot) {
      elements[k].foot.content = cleanupElements(elements[k].foot.content, []);
    }
  }

  // Handle paragraphs - split elements at paragraph positions and mark them
  if (paragraphPositions.length > 0) {
    // Build a list of (position, element_index) for where to split
    const splitPoints: {
      pos: number;
      elemIndex: number;
      offsetInElem: number;
    }[] = [];

    for (const pos of paragraphPositions) {
      let currentPos = 0;
      for (let k = 0; k < elements.length; k++) {
        const el = elements[k];
        const len = typeof el === "string" ? el.length : el.text.length;
        if (currentPos <= pos && pos < currentPos + len) {
          let offsetInElem = pos - currentPos;
          // Adjust split position to include leading space in the next paragraph
          if (offsetInElem > 0) {
            const text = typeof el === "string" ? el : el.text;
            if (text[offsetInElem] !== " " && text[offsetInElem - 1] === " ") {
              offsetInElem -= 1;
            }
          }
          splitPoints.push({ pos, elemIndex: k, offsetInElem });
          break;
        }
        currentPos += len;
      }
    }

    // Split elements at marked positions (iterate backwards to maintain indices)
    for (let s = splitPoints.length - 1; s >= 0; s--) {
      const { elemIndex, offsetInElem } = splitPoints[s];
      const el = elements[elemIndex];

      if (offsetInElem > 0 && typeof el === "string") {
        // Split string element
        const part1 = el.substring(0, offsetInElem);
        const part2 = el.substring(offsetInElem);
        elements[elemIndex] = part1;
        if (part2.length > 0) {
          elements.splice(elemIndex + 1, 0, part2);
        }
      } else if (offsetInElem > 0 && typeof el === "object" && el.text) {
        // Split object element
        const text = el.text;
        const part1Text = text.substring(0, offsetInElem);
        const part2Text = text.substring(offsetInElem);
        el.text = part1Text;
        const part2Obj: any = { text: part2Text };
        if (el.script) part2Obj.script = el.script;
        if (el.marks) part2Obj.marks = el.marks;
        if (el.strong) part2Obj.strong = el.strong;
        if (el.morph) part2Obj.morph = el.morph;
        elements.splice(elemIndex + 1, 0, part2Obj);
      }
    }

    // Now mark paragraph elements and trim spaces at split boundaries
    const paragraphIndices = new Set<number>();
    for (const pos of paragraphPositions) {
      let currentPos = 0;
      for (let k = 0; k < elements.length; k++) {
        const el = elements[k];
        const len = typeof el === "string" ? el.length : el.text.length;
        if (currentPos <= pos && pos < currentPos + len) {
          paragraphIndices.add(k);
          break;
        }
        currentPos += len;
      }
    }

    // Apply paragraph markers and trim spaces at boundaries
    for (const k of paragraphIndices) {
      if (typeof elements[k] === "object") {
        elements[k].paragraph = true;
        // Trim trailing space
        if (elements[k].text && typeof elements[k].text === "string") {
          elements[k].text = elements[k].text.replace(/\s+$/, "");
        }
        // Trim leading spaces
        if (elements[k].text && typeof elements[k].text === "string") {
          elements[k].text = elements[k].text.replace(/^\s+/, "");
        }
      } else if (typeof elements[k] === "string") {
        elements[k] = { text: elements[k], paragraph: true };
        // Trim trailing space
        elements[k].text = elements[k].text.replace(/\s+$/, "");
        // Trim leading spaces
        elements[k].text = elements[k].text.replace(/^\s+/, "");
      }
    }
  }

  // Merge consecutive strings
  for (let k = elements.length - 1; k > 0; k--) {
    if (
      typeof elements[k] === "string" &&
      typeof elements[k - 1] === "string"
    ) {
      elements[k - 1] += elements[k];
      elements.splice(k, 1);
    }
  }

  return elements;
}

function parseBBText(
  text: string,
  footnotes: { type?: string; text: string }[]
): any[] {
  const elements: any[] = [];
  const tagRegex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    // Plain text before
    if (match.index > lastIndex) {
      const plain = text.substring(lastIndex, match.index);
      addPlainText(plain, elements, footnotes);
    }

    const tagContent = match[1];
    if (tagContent.endsWith("/")) {
      // Self-closing tag
      const tag = tagContent.slice(0, -1).trim();
      const attrs = parseAttributes(tag);
      if (tag.startsWith("strongs")) {
        const obj: any = { strong: attrs.id.toUpperCase() };
        if (attrs.m) obj.morph = attrs.m;
        if (attrs.tvm)
          obj.morph = attrs.tvm + (attrs.tvm2 ? "/" + attrs.tvm2 : "");
        elements.push(obj);
      } else {
        // Unknown self-closing tag, treat as literal text
        elements.push(match[0]);
      }
    } else {
      // Opening tag with closing tag
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
          elements.push({ text: innerText, marks: [mark] });
        } else if (tag === "footnote") {
          const footElements = parseBBText(innerText, []);
          elements.push({ foot: { type: "stu", content: footElements } });
        } else {
          // Unknown opening tag, treat as literal text
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

  // Plain text after
  if (lastIndex < text.length) {
    const plain = text.substring(lastIndex);
    addPlainText(plain, elements, footnotes);
  }

  return elements;
}

function addPlainText(
  plain: string,
  elements: any[],
  footnotes: { type?: string; text: string }[]
) {
  const lines = plain.split("\n");
  for (let l = 0; l < lines.length; l++) {
    let line = lines[l];
    // Trim leading space from lines that are not the first line
    if (l > 0) {
      line = line.replace(/^\s+/, "");
    }
    const parts = line.split("°");
    for (let p = 0; p < parts.length; p++) {
      const part = parts[p];
      // Push parts as-is (including spaces)
      if (part.length > 0) {
        elements.push(part);
      }
      if (p < parts.length - 1 && footnotes.length > 0) {
        const foot = footnotes.shift()!;
        const footElements = parseBBText(foot.text, []);
        const footObj: any = {
          foot: { content: footElements },
        };
        if (foot.type) footObj.foot.type = foot.type;
        // Attach to the last element
        const lastIndex = elements.length - 1;
        const last = elements[lastIndex];
        if (typeof last === "string") {
          elements[lastIndex] = { text: last, ...footObj };
        } else {
          Object.assign(last, footObj);
        }
      }
    }
    if (l < lines.length - 1) {
      // Add break to the last element
      if (elements.length > 0) {
        const last = elements[elements.length - 1];
        if (typeof last === "object") {
          last.break = true;
        } else if (typeof last === "string") {
          // Convert to object and add break
          elements[elements.length - 1] = { text: last, break: true };
        }
      }
    }
  }
}

function parseAttributes(tag: string): any {
  const attrs: any = {};
  const parts = tag.split(" ");
  for (const part of parts.slice(1)) {
    if (part.includes("=")) {
      const [key, value] = part.split("=");
      attrs[key] = value.replace(/"/g, "");
    }
  }
  return attrs;
}
