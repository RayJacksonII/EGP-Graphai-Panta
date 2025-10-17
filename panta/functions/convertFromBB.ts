import Node from "../../types/Node";
import Footnote from "../../types/Footnote";

/**
 * Converts BBCode-style markup to structured JSON content nodes
 * @param text - Text containing BBCode markup
 * @param footnotes - Optional array of footnote objects
 * @returns Array of content nodes
 */
export default function convertFromBB(
  text: string,
  footnotes?: Array<{ type: string; text: string }>
): Node[] {
  const nodes: Node[] = [];
  let footnoteIndex = 0;

  // First, split text by line breaks and process each line
  const lines = text.split("\n");

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    // Split line by footnote markers
    const parts = line.split("°");

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      let partNodes: Node[] = [];

      if (part.trim()) {
        // Parse this part for various markup styles
        partNodes = parseBBCode(part);
        nodes.push(...partNodes);
      }

      // If there's a footnote available and this isn't the last part, attach it to the last node
      if (
        i < parts.length - 1 &&
        footnotes &&
        footnoteIndex < footnotes.length
      ) {
        const footnote = footnotes[footnoteIndex];
        const footnoteNodes = parseBBCode(footnote.text);

        // Map footnote type
        let footnoteType: "stu" | "trn" | "var" | "map" | "xrf" = "stu";
        if (footnote.type === "var") {
          footnoteType = "var";
        } else if (footnote.type === "trn") {
          footnoteType = "trn";
        } else if (footnote.type === "map") {
          footnoteType = "map";
        } else if (footnote.type === "xrf") {
          footnoteType = "xrf";
        }

        const footnoteObj: Footnote = {
          type: footnoteType,
          content: footnoteNodes,
        };

        // Attach footnote to the last text node, or create an empty one if needed
        let targetNode: Node | undefined;
        if (nodes.length > 0) {
          // Find the last text node
          for (let j = nodes.length - 1; j >= 0; j--) {
            if (nodes[j].text !== undefined) {
              targetNode = nodes[j];
              break;
            }
          }
        }

        // If no text node found, create an empty one
        if (!targetNode) {
          targetNode = { text: "" };
          nodes.push(targetNode);
        }

        targetNode.foot = footnoteObj;
        footnoteIndex++;
      }
    }

    // Add line break node if this isn't the last line
    if (lineIndex < lines.length - 1) {
      nodes.push({ type: "n" });
    }
  }

  return nodes;
}

/**
 * Parse BBCode markup - handles multiple styles:
 * 1. Greek text with following Strong's: [greek]Καὶ[/greek] [strongs id="g2532" m="CONJ" /]
 * 2. KJV style with preceding text: "In the beginning [strongs id="h7225" /]"
 * 3. Standalone Greek text: [greek]Καὶ[/greek]
 * 4. Formatting tags: [red]...[/red], [sc]...[/sc]
 */
function parseBBCode(text: string): Node[] {
  const nodes: Node[] = [];

  // Regex to match all BBCode elements
  const regex =
    /\[greek\](.*?)\[\/greek\]|\[strongs id="([^"]*)"(?: m="([^"]*)")?(?: tvm="([^"]*)")?(?: tvm2="([^"]*)")? \/\]|\[(red|sc)\](.*?)\[\/(red|sc)\]/g;

  let lastIndex = 0;
  let pendingText = "";
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Collect text before this match
    if (match.index > lastIndex) {
      pendingText += text.slice(lastIndex, match.index);
    }

    if (match[1] !== undefined) {
      // Greek text match: [greek]...[/greek]
      // Push any pending text first
      if (pendingText.trim()) {
        nodes.push({ text: pendingText.trim() });
        pendingText = "";
      }

      nodes.push({
        text: match[1],
        script: "G",
      });
    } else if (match[2] !== undefined) {
      // Strong's tag: [strongs id="..." /]
      const strongId = match[2].toUpperCase();
      const morphValue = match[4] || match[3]; // Prefer tvm over m
      const tvm2Value = match[5];
      const finalMorph = tvm2Value ? `${morphValue}/${tvm2Value}` : morphValue;

      // Trim pending text and attach Strong's to it
      const trimmed = pendingText.trim();

      if (trimmed) {
        // Create node with the preceding text and Strong's data
        const node: Node = { text: trimmed };
        node.strong = strongId;
        if (finalMorph) {
          node.morph = finalMorph;
        }
        nodes.push(node);
        pendingText = "";
      } else {
        // No preceding text - check if we can attach to the last node
        let attached = false;
        if (nodes.length > 0) {
          const lastNode = nodes[nodes.length - 1];
          if (lastNode.text !== undefined && !lastNode.strong) {
            lastNode.strong = strongId;
            if (finalMorph) {
              lastNode.morph = finalMorph;
            }
            attached = true;
          }
        }

        if (!attached) {
          // Create a node with just Strong's data (no text)
          const node: Node = { strong: strongId };
          if (finalMorph) {
            node.morph = finalMorph;
          }
          nodes.push(node);
        }
      }
    } else if (match[6] !== undefined) {
      // Formatting tag: [red] or [sc]
      // Push any pending text first
      if (pendingText.trim()) {
        nodes.push({ text: pendingText.trim() });
        pendingText = "";
      }

      const tagType = match[6];
      const content = match[7];
      const mark = tagType === "red" ? "woc" : "sc";

      // Parse content recursively
      const contentNodes = parseBBCode(content);
      for (const node of contentNodes) {
        if (node.text !== undefined) {
          node.marks = node.marks || [];
          if (!node.marks.includes(mark)) {
            node.marks.push(mark);
          }
        }
      }
      nodes.push(...contentNodes);
    }

    lastIndex = regex.lastIndex;
  }

  // Handle remaining text
  if (lastIndex < text.length) {
    pendingText += text.slice(lastIndex);
  }

  if (pendingText.trim()) {
    nodes.push({ text: pendingText.trim() });
  }

  return nodes;
}
