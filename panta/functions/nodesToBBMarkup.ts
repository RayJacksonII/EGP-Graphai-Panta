import Node from "../../types/Node";

/**
 * Converts structured content nodes to BBCode-style markup
 * @param nodes - Array of content nodes to convert
 * @returns BBCode-formatted text string
 */
export default function nodesToBBMarkup(nodes: Node[]): string {
  let result = "";
  let footnoteCounter = 0;
  let previousWasText = false;

  for (const node of nodes) {
    switch (node.type) {
      case "p":
        // Paragraph break - add paragraph marker
        result += "¶ ";
        previousWasText = false;
        break;

      case "n":
        // Line break - add newline
        result += "\n";
        previousWasText = false;
        break;

      case "h":
      case "t":
      case undefined:
        // Text node (default type is "t")
        if (node.text !== undefined) {
          let textContent = node.text;

          // Apply formatting marks
          if (node.marks && node.marks.length > 0) {
            for (const mark of node.marks) {
              const tag = getFormattingTag(mark);
              if (tag) {
                textContent = `[${tag}]${textContent}[/${tag}]`;
              }
            }
          }

          // Handle Greek text
          if (node.script === "G") {
            textContent = `[greek]${textContent}[/greek]`;
          }

          // Add space if previous node was also text, unless current text starts with punctuation
          if (previousWasText && !textContent.match(/^[.,;:!?\)\]\}]/)) {
            result += " ";
          }

          result += textContent;

          // Handle footnotes - add marker immediately after text, before Strong's
          // The footnote content itself is handled separately in the BBVerse footnotes array
          if (node.foot) {
            result += `°`;
            footnoteCounter++;
          }

          // Add Strong's number if present
          if (node.strong) {
            const strongsTag = createStrongsTag(node.strong, node.morph);
            result += ` ${strongsTag}`;
          }

          previousWasText = true;
        } else if (node.strong) {
          // Node with only Strong's number (no text)
          if (previousWasText) {
            result += " ";
          }
          const strongsTag = createStrongsTag(node.strong, node.morph);
          result += strongsTag;
          previousWasText = true;
        }
        break;

      default:
        // Unknown node type - skip
        break;
    }
  }

  return result;
}

/**
 * Creates a Strong's tag with optional morphological information
 */
function createStrongsTag(strongId: string, morph?: string): string {
  const normalizedId = strongId.toLowerCase();
  let tag = `[strongs id="${normalizedId}"`;

  if (morph) {
    // Check if morph is numeric (should use tvm) or alphabetic (should use m)
    const isNumeric = /^\d+$/.test(morph);
    if (isNumeric) {
      tag += ` tvm="${morph}"`;
    } else if (morph.includes("/")) {
      // Handle TVM format with two values
      const [tvm, tvm2] = morph.split("/");
      tag += ` tvm="${tvm}" tvm2="${tvm2}"`;
    } else {
      // Alphabetic morphology
      tag += ` m="${morph}"`;
    }
  }

  tag += " /]";
  return tag;
}

/**
 * Gets the BB tag for a formatting mark
 */
function getFormattingTag(mark: string): string | null {
  switch (mark) {
    case "woc":
      return "red";
    case "sc":
      return "sc";
    case "i":
      return "i";
    case "b":
      return "b";
    default:
      return null;
  }
}
