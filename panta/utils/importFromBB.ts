#!/usr/bin/env ts-node

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { execSync } from "child_process";
import { crosswalkVersionID } from "../functions/crosswalkVersionID";
import { crosswalkBookSequence } from "../functions/crosswalkBookSequence";
import { convertBBVerseMetadata } from "../functions/convertBBVerseMetadata";
import { convertBBToGraphai } from "../functions/convertBBToGraphai";

// Load book registry for progress messages
const bookRegistry: Array<{ _id: string; name: string }> = JSON.parse(
  readFileSync("./bible-books/bible-books.json", "utf-8")
);

function getBookName(bookId: string): string {
  const book = bookRegistry.find((b) => b._id === bookId);
  return book ? book.name : bookId;
}

function main() {
  try {
    // Parse command-line arguments
    const bbVersionId = process.argv[2];
    const bbBookSequence = process.argv[3];

    // Validate required version argument
    if (!bbVersionId) {
      console.error("Usage: ts-node importFromBB.ts <version> [book-sequence]");
      console.error(
        "  <version>: BB version ID (asv, byz, clv, kjv, webp, ylt)"
      );
      console.error(
        "  [book-sequence]: Optional BB book sequence (101-139 OT, 201-227 NT) for single-book migration"
      );
      console.error("Examples:");
      console.error(
        "  ts-node importFromBB.ts kjv          # Migrate entire KJV version"
      );
      console.error(
        "  ts-node importFromBB.ts kjv 204      # Migrate only John from KJV"
      );
      process.exit(1);
    }

    // Convert BB version ID to Graphai version ID
    const graphaiVersionId = crosswalkVersionID(bbVersionId);

    // Load BB export file
    const bbFilePath = `./exports/BibleDB.bibleVerses-${bbVersionId}.json`;
    if (!existsSync(bbFilePath)) {
      throw new Error(`BB export file not found: ${bbFilePath}`);
    }

    const bbVerses: Array<{
      chapter: string;
      sequence: string;
      number: number;
      text: string;
      paragraphs?: number[];
      footnotes?: { type?: string; text: string }[];
    }> = JSON.parse(readFileSync(bbFilePath, "utf-8"));

    console.log(`Loaded ${bbVerses.length} verses from ${bbFilePath}`);

    // Determine migration mode
    if (bbBookSequence) {
      // Single-book migration
      migrateSingleBook(bbVerses, bbBookSequence, graphaiVersionId);
    } else {
      // Full-version migration
      migrateFullVersion(bbVerses, graphaiVersionId);
    }

    // Run validation
    console.log("Running validation...");
    execSync("npm run validate", { stdio: "inherit" });

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error(
      "Migration failed:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

function migrateSingleBook(
  bbVerses: Array<any>,
  bbBookSequence: string,
  graphaiVersionId: string
) {
  // Validate book sequence
  const bookInfo = crosswalkBookSequence(bbBookSequence);

  // Filter verses for this book
  const bookVerses = bbVerses.filter((verse) =>
    verse.sequence.startsWith(bbBookSequence)
  );

  if (bookVerses.length === 0) {
    throw new Error(`No verses found for book sequence ${bbBookSequence}`);
  }

  console.log(
    `Migrating ${bookVerses.length} verses for ${bookInfo._id} (${getBookName(
      bookInfo._id
    )})`
  );

  // Group verses by chapter
  const chapters = new Map<number, Array<any>>();
  for (const verse of bookVerses) {
    const { chapter } = convertBBVerseMetadata(verse);
    if (!chapters.has(chapter)) {
      chapters.set(chapter, []);
    }
    chapters.get(chapter)!.push(verse);
  }

  // Process each chapter
  const graphaiVerses: Array<{
    book: string;
    chapter: number;
    verse: number;
    content: any[];
  }> = [];

  for (const [chapterNum, chapterVerses] of chapters) {
    // Sort verses by verse number
    chapterVerses.sort((a, b) => a.number - b.number);

    for (const verse of chapterVerses) {
      const metadata = convertBBVerseMetadata(verse);
      const content = convertBBToGraphai({
        text: verse.text,
        paragraphs: verse.paragraphs,
        footnotes: verse.footnotes,
      });

      graphaiVerses.push({
        book: metadata.book,
        chapter: metadata.chapter,
        verse: metadata.verse,
        content,
      });
    }
  }

  // Sort all verses by chapter, then verse
  graphaiVerses.sort((a, b) => {
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  // Create output directory
  const outputDir = `./bible-versions/${graphaiVersionId}`;
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Write book file
  const orderPadded = bookInfo.order.toString().padStart(2, "0");
  const outputPath = `${outputDir}/${orderPadded}-${bookInfo._id}.json`;

  writeFileSync(outputPath, JSON.stringify(graphaiVerses, null, 2));
  console.log(`Processing ${getBookName(bookInfo._id)}... Done`);
}

function migrateFullVersion(bbVerses: Array<any>, graphaiVersionId: string) {
  // Group verses by book sequence
  const books = new Map<string, Array<any>>();

  for (const verse of bbVerses) {
    const bookSequence = verse.sequence.substring(0, 3);
    if (!books.has(bookSequence)) {
      books.set(bookSequence, []);
    }
    books.get(bookSequence)!.push(verse);
  }

  // Sort book sequences numerically
  const sortedBookSequences = Array.from(books.keys()).sort(
    (a, b) => parseInt(a) - parseInt(b)
  );

  console.log(`Migrating ${sortedBookSequences.length} books...`);

  let totalBooks = 0;
  let totalChapters = 0;
  let totalVerses = 0;

  // Create output directory
  const outputDir = `./bible-versions/${graphaiVersionId}`;
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Process each book in order
  for (const bookSequence of sortedBookSequences) {
    const bookVerses = books.get(bookSequence)!;
    const bookInfo = crosswalkBookSequence(bookSequence);

    // Group verses by chapter
    const chapters = new Map<number, Array<any>>();
    for (const verse of bookVerses) {
      const { chapter } = convertBBVerseMetadata(verse);
      if (!chapters.has(chapter)) {
        chapters.set(chapter, []);
      }
      chapters.get(chapter)!.push(verse);
    }

    // Process each chapter
    const graphaiVerses: Array<{
      book: string;
      chapter: number;
      verse: number;
      content: any[];
    }> = [];

    for (const [chapterNum, chapterVerses] of chapters) {
      // Sort verses by verse number
      chapterVerses.sort((a, b) => a.number - b.number);

      for (const verse of chapterVerses) {
        const metadata = convertBBVerseMetadata(verse);
        const content = convertBBToGraphai({
          text: verse.text,
          paragraphs: verse.paragraphs,
          footnotes: verse.footnotes,
        });

        graphaiVerses.push({
          book: metadata.book,
          chapter: metadata.chapter,
          verse: metadata.verse,
          content,
        });
      }
    }

    // Sort all verses by chapter, then verse
    graphaiVerses.sort((a, b) => {
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });

    // Write book file
    const orderPadded = bookInfo.order.toString().padStart(2, "0");
    const outputPath = `${outputDir}/${orderPadded}-${bookInfo._id}.json`;

    writeFileSync(outputPath, JSON.stringify(graphaiVerses, null, 2));
    console.log(`Processing ${getBookName(bookInfo._id)}... Done`);

    totalBooks++;
    totalChapters += chapters.size;
    totalVerses += graphaiVerses.length;
  }

  console.log(
    `Migration complete: ${totalBooks} books, ${totalChapters} chapters, ${totalVerses} verses`
  );
}

// Run the script
if (require.main === module) {
  main();
}
