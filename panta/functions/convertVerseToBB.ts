import VerseSchema from "../../types/VerseSchema";
import BBVerse from "../types/BBVerse";
import Node from "../../types/Node";
import Book from "../../types/Book";
import nodesToBBMarkup from "./nodesToBBMarkup";

/**
 * Converts a VerseSchema from structured format to legacy BB format
 * @param verse - The structured verse with content array
 * @param book - The book metadata containing order information
 * @param versionId - The version identifier (e.g., "kjvs", "byz")
 * @returns A BBVerse object in legacy format
 */
export default function convertVerseToBB(
  verse: VerseSchema,
  book: Book,
  versionId: string
): BBVerse {
  const { content, chapter, verse: verseNum } = verse;

  // Extract paragraph positions and footnotes from content
  const { textNodes, paragraphs, footnotes } = processContent(content);

  // Convert text nodes to BB markup
  const text = nodesToBBMarkup(textNodes);

  // Generate sequence ID: {version}-{testament}{book}{chapter}{verse}
  const order = book.order?.protestant || 0;
  const testament = order <= 39 ? 1 : 2;
  const bookNum = testament === 1 ? order : order - 39;
  const sequence = `${testament}${String(bookNum).padStart(2, "0")}${String(
    chapter
  ).padStart(3, "0")}${String(verseNum).padStart(3, "0")}`;

  // Generate _id
  const _id = `${versionId}-${sequence}`;

  // Generate chapter reference (lowercase book name with chapter)
  const chapterRef = `${book.name
    .toLowerCase()
    .replace(/\s+/g, "-")}-${chapter}`;

  const bbVerse: BBVerse = {
    _id,
    version: versionId,
    chapter: chapterRef,
    sequence,
    number: verseNum,
    text,
  };

  // Add optional fields only if they have values
  if (paragraphs.length > 0) {
    bbVerse.paragraphs = paragraphs;
  }

  if (footnotes.length > 0) {
    bbVerse.footnotes = footnotes;
  }

  return bbVerse;
}

/**
 * Process content array to extract text nodes, paragraph positions, and footnotes
 */
function processContent(content: Node[]): {
  textNodes: Node[];
  paragraphs: number[];
  footnotes: Array<{ text: string }>;
} {
  const textNodes: Node[] = [];
  const paragraphs: number[] = [];
  const footnotes: Array<{ text: string }> = [];

  for (const node of content) {
    if (node.type === "p") {
      // Track paragraph position (index in textNodes array)
      paragraphs.push(textNodes.length);
    } else {
      // Extract footnote if present
      if (node.foot) {
        footnotes.push({
          text: nodesToBBMarkup(node.foot.content),
        });
      }

      // Add to text nodes (paragraph markers are not included in text output)
      textNodes.push(node);
    }
  }

  return { textNodes, paragraphs, footnotes };
}
