interface BBResult {
  text: string;
  paragraphs?: number[];
  footnotes?: { type?: string; text: string }[];
}

export function convertGraphaiToBB(content: any): BBResult {
  if (typeof content === "string") {
    return { text: content };
  }
  if (Array.isArray(content)) {
    let text = "";
    let paragraphs: number[] = [];
    let footnotes: { text: string }[] = [];
    let offset = 0;
    for (const item of content) {
      const result = convertGraphaiToBB(item);
      const leadingSpaces = result.text.length - result.text.trimStart().length;
      const trimmedText = result.text;
      const addSpace = offset > 0 && item.paragraph ? 1 : 0;
      paragraphs.push(...(result.paragraphs || []).map((p) => p + offset));
      if (addSpace) text += " ";
      text += trimmedText.replace(/\[(greek|hebrew)\] /g, " [$1]");
      offset += addSpace + trimmedText.length;
      footnotes.push(...(result.footnotes || []));
    }
    if (paragraphs.length === 0 && footnotes.length === 0) {
      return { text };
    }
    const result: BBResult = { text };
    if (paragraphs.length > 0) result.paragraphs = paragraphs;
    if (footnotes.length > 0) result.footnotes = footnotes;
    return result;
  }
  if (typeof content === "object" && content !== null) {
    if (content.text) {
      const tag =
        content.script === "H"
          ? "hebrew"
          : content.script === "G"
          ? "greek"
          : undefined;
      let inner = content.text;
      if (tag) {
        inner = `[${tag}]${content.text}[/${tag}]`;
      }
      if (content.marks) {
        for (const mark of content.marks.slice().reverse()) {
          const tag = mark === "woc" ? "red" : mark;
          inner = `[${tag}]${inner}[/${tag}]`;
        }
      }
      let resultText = inner;
      let paragraphs: number[] = [];
      let footnotes: { text: string }[] = [];
      if (content.strong && content.morph) {
        let morphParts = content.morph.split("/");
        let morphAttr: string;
        if (content.script === "G") {
          morphAttr = `m="${morphParts[0]}"`;
        } else if (/^\d+$/.test(morphParts[0])) {
          morphAttr = `tvm="${morphParts[0]}"`;
          if (morphParts[1]) morphAttr += ` tvm2="${morphParts[1]}"`;
        } else {
          morphAttr = `tvm="${morphParts[0]}"`;
          if (morphParts[1]) morphAttr += ` tvm2="${morphParts[1]}"`;
        }
        resultText += ` [strongs id="${content.strong
          .toLowerCase()
          .replace(/^g0+/, "g")
          .replace(/^h0+/, "h")}" ${morphAttr} /]`;
      } else if (content.strong) {
        resultText += ` [strongs id="${content.strong
          .toLowerCase()
          .replace(/^g0+/, "g")
          .replace(/^h0+/, "h")}" /]`;
      }
      if (content.foot) {
        resultText += "°";
        const footResult = convertGraphaiToBB(content.foot.content);
        const footObj: any = { text: footResult.text };
        if (content.foot.type) footObj.type = content.foot.type;
        footnotes.push(footObj);
      }
      if (content.paragraph) {
        paragraphs.push(0);
      }
      if (content.break) {
        resultText += "\n";
      }
      const result: BBResult = { text: resultText };
      if (paragraphs.length > 0) result.paragraphs = paragraphs;
      if (footnotes.length > 0) result.footnotes = footnotes;
      return result;
    }
    if (content.heading) {
      // Drop headings as they are not supported in BB format
      return { text: "" };
    }
    if (content.paragraph) {
      return convertGraphaiToBB(content.paragraph);
    }
    if (content.subtitle) {
      return convertGraphaiToBB(content.subtitle);
    }
    // Ignore other properties like foot for now
    return { text: "" };
  }
  return { text: "" };
}
