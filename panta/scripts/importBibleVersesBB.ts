import * as fs from "fs";
import * as path from "path";
import Ajv from "ajv";
import Node from "../../types/Node";
import Book from "../../types/Book";
import VerseSchema from "../../types/VerseSchema";
import Verse from "../../types/Verse";
import convertFromBB from "../functions/convertFromBB";

function main() {
  const importsDir = "./imports/bb";
  const booksPath = "./bible-books/bible-books.json";
  const versionsPath = "./bible-versions/bible-versions.json";
  const schemaPath = "./bible-versions/bible-verses-schema.json";

  // Load books
  const booksContent = fs.readFileSync(booksPath, "utf-8");
  const books: Book[] = JSON.parse(booksContent);

  // Load versions
  const versionsContent = fs.readFileSync(versionsPath, "utf-8");
  const versions = JSON.parse(versionsContent);
  const validVersions = new Set(versions.map((v: any) => v._id));

  // Load schema and compile validator
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");
  const schema = JSON.parse(schemaContent);
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  // Get files
  const files = fs.readdirSync(importsDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const match = file.match(/^BibleDB\.bibleVerses-(.+)\.json$/);
    if (!match) {
      console.error(`Invalid filename format: ${file}`);
      continue;
    }
    const versionID = match[1];
    if (!validVersions.has(versionID)) {
      console.error(`Unknown version: ${versionID}`);
      continue;
    }

    const inputPath = path.join(importsDir, file);

    // Load input
    const inputContent = fs.readFileSync(inputPath, "utf-8");
    const verses: Verse[] = JSON.parse(inputContent);

    const outputDir = `./bible-versions/${versionID}`;

    // Group by book
    const bookVerses = new Map<string, VerseSchema[]>();
    const bookChapters = new Map<string, number>(); // Track current chapter per book
    for (const verse of verses) {
      const match = verse._id.match(/^([^-]+)-(\d)(\d{2})(\d{3})(\d{3})$/);
      if (!match) {
        console.error(`Invalid _id format: ${verse._id}`);
        continue;
      }
      const testamentNum = parseInt(match[2]);
      const bookNum = parseInt(match[3]);
      const chapterNum = parseInt(match[4]);
      const verseNum = parseInt(match[5]);
      const order = testamentNum === 1 ? bookNum : 39 + bookNum;
      const book = books.find((b) => b.order?.protestant === order);
      if (!book) {
        console.error(`Unknown book for order ${order}, _id ${verse._id}`);
        continue;
      }
      const bookID = book._id;
      if (!bookVerses.has(bookID)) {
        bookVerses.set(bookID, []);
        bookChapters.set(bookID, 0); // Initialize chapter tracking
      }

      const currentChapter = bookChapters.get(bookID)!;
      const isNewChapter = chapterNum !== currentChapter;

      let content = convertFromBB(verse.text, verse.footnotes);

      // Handle paragraphs array first
      if (verse.paragraphs && verse.paragraphs.length > 0) {
        const newContent: Node[] = [];
        let contentIndex = 0;

        for (const paraPos of verse.paragraphs.sort((a, b) => a - b)) {
          if (paraPos === 0) {
            // Paragraph at the beginning
            newContent.push({ type: "p" });
          } else if (paraPos <= content.length) {
            // Insert paragraph marker at the specified position
            // Copy content up to this position
            for (let i = contentIndex; i < paraPos; i++) {
              if (i < content.length) {
                newContent.push(content[i]);
              }
            }
            newContent.push({ type: "p" });
            contentIndex = paraPos;
          }
        }

        // Add remaining content
        for (let i = contentIndex; i < content.length; i++) {
          newContent.push(content[i]);
        }

        content = newContent;
      }

      // Add paragraph marker at start of new chapter (only if not already added by paragraphs array)
      if (
        isNewChapter &&
        (!verse.paragraphs || !verse.paragraphs.includes(0))
      ) {
        content.unshift({ type: "p" });
      }

      bookChapters.set(bookID, chapterNum);

      const verseSchema: VerseSchema = {
        book: bookID,
        chapter: chapterNum,
        verse: verseNum,
        content,
      };
      bookVerses.get(bookID)!.push(verseSchema);
    }

    // Ensure output dir
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save and validate
    for (const [bookID, versesArray] of bookVerses) {
      const outputPath = path.join(outputDir, `${bookID}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(versesArray, null, 2));

      // Validate each verse
      for (const verse of versesArray) {
        const valid = validate(verse);
        if (!valid) {
          const v = verse as VerseSchema;
          console.error(
            `Validation error in ${outputPath}, verse ${v.book} ${v.chapter}:${v.verse}:`,
            validate.errors
          );
          process.exit(1);
        }
      }
      console.log(
        `Processed and validated ${bookID}.json for version ${versionID}`
      );
    }
  }

  console.log("All done!");
}

main();
