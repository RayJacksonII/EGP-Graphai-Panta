import { crosswalkChapterReference } from "./crosswalkChapterReference";
import { crosswalkBookSequence } from "./crosswalkBookSequence";

/**
 * Convert BB verse metadata to Graphai verse metadata
 * @param bbVerse - BB verse object with chapter, sequence, and number fields
 * @returns Graphai verse metadata: { book: string, chapter: number, verse: number }
 * @throws Error if metadata is inconsistent or invalid
 */
export function convertBBVerseMetadata(bbVerse: {
  chapter: string;
  sequence: string;
  number: number;
}): { book: string; chapter: number; verse: number } {
  // Validate required fields
  if (!bbVerse) {
    throw new Error("BB verse object is required");
  }

  if (!bbVerse.chapter || typeof bbVerse.chapter !== "string") {
    throw new Error("BB verse chapter field is required and must be a string");
  }

  if (!bbVerse.sequence || typeof bbVerse.sequence !== "string") {
    throw new Error("BB verse sequence field is required and must be a string");
  }

  if (typeof bbVerse.number !== "number" || bbVerse.number <= 0) {
    throw new Error(
      "BB verse number field is required and must be a positive number"
    );
  }

  // Parse chapter reference to get book ID and chapter number
  const { bookId, chapter } = crosswalkChapterReference(bbVerse.chapter);

  // Extract verse number
  const verse = bbVerse.number;

  // Extract book sequence from first 3 digits of sequence field
  if (bbVerse.sequence.length < 3) {
    throw new Error(
      `Invalid sequence format: "${bbVerse.sequence}". Expected at least 3 digits`
    );
  }

  const bookSequenceStr = bbVerse.sequence.substring(0, 3);
  const bookSequence = parseInt(bookSequenceStr, 10);

  if (isNaN(bookSequence)) {
    throw new Error(
      `Invalid book sequence: "${bookSequenceStr}". Expected numeric digits`
    );
  }

  // Get expected book info from sequence
  const expectedBook = crosswalkBookSequence(bookSequenceStr);

  // Validate that sequence matches chapter reference
  if (expectedBook._id !== bookId) {
    throw new Error(
      `Metadata inconsistency: sequence "${bbVerse.sequence}" indicates book "${expectedBook._id}" ` +
        `but chapter "${bbVerse.chapter}" indicates book "${bookId}"`
    );
  }

  return {
    book: bookId,
    chapter,
    verse,
  };
}
