interface BBResult {
  text: string;
  paragraphs?: number[];
  footnotes?: { text: string }[];
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
      text += result.text.replace(/\[(greek|hebrew)\] /g, " [$1]");
      paragraphs.push(...(result.paragraphs || []).map((p) => p + offset));
      footnotes.push(...(result.footnotes || []));
      offset += result.text.length;
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
        if (content.marks.includes("i")) inner = `[i]${inner}[/i]`;
        if (content.marks.includes("b")) inner = `[b]${inner}[/b]`;
        if (content.marks.includes("sc")) inner = `[sc]${inner}[/sc]`;
        if (content.marks.includes("woc")) inner = `[red]${inner}[/red]`;
        // Add more if needed
      }
      let resultText = inner;
      let paragraphs: number[] = [];
      let footnotes: { text: string }[] = [];
      if (content.strong && content.morph) {
        const script =
          content.script || (content.strong.startsWith("H") ? "H" : "G");
        const morphAttr =
          script === "H" ? `tvm="${content.morph}"` : `m="${content.morph}"`;
        resultText += ` [strongs id="${content.strong.toLowerCase()}" ${morphAttr} /]`;
      } else if (content.strong) {
        resultText += ` [strongs id="${content.strong.toLowerCase()}" /]`;
      }
      if (content.foot) {
        resultText += "°";
        const footResult = convertGraphaiToBB(content.foot.content);
        footnotes.push({ text: footResult.text });
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
      return convertGraphaiToBB(content.heading);
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
