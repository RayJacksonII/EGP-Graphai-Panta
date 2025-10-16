import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { loadBookMetadata, getBookById } from "../utils/bookMetadata";
import convertVerseToBB from "../functions/convertVerseToBB";

/**
 * Compare original import data with exported data for validation
 */
async function compareImportToExport(
  originalVersion: string = "webus2020",
  exportedVersion: string = "webp",
  versionsDir: string = "./bible-versions",
  booksPath: string = "./bible-books/bible-books.json",
  exportsDir: string = "./exports"
) {
  console.log(
    `🔍 Comparing ${originalVersion} import data with ${exportedVersion} export data...\n`
  );

  const results = {
    totalOriginalVerses: 0,
    totalExportedVerses: 0,
    differences: [] as string[],
    success: true,
  };

  try {
    // Load book metadata
    console.log("📚 Loading book metadata...");
    const bookMetadata = loadBookMetadata(booksPath);

    // Read exported data
    console.log(`📖 Reading exported ${exportedVersion} data...`);
    const exportFile = join(
      exportsDir,
      `BibleDB.bibleVerses-${exportedVersion}.json`
    );
    const exportedData = JSON.parse(readFileSync(exportFile, "utf-8"));
    results.totalExportedVerses = exportedData.length;

    console.log(`📊 Found ${results.totalExportedVerses} verses in export`);

    // Process original data
    console.log(`📖 Reading original ${originalVersion} data...`);
    const versionDir = join(versionsDir, originalVersion);
    const bookFiles = readdirSync(versionDir)
      .filter((file) => file.endsWith(".json"))
      .sort();

    const originalVerses: any[] = [];

    for (const bookFile of bookFiles) {
      const bookData = JSON.parse(
        readFileSync(join(versionDir, bookFile), "utf-8")
      );

      for (const verse of bookData) {
        // Convert to the same format as export
        const book = getBookById(bookMetadata, verse.book);
        if (!book) {
          results.differences.push(`Book ${verse.book} not found in metadata`);
          continue;
        }

        const convertedVerse = convertVerseToBB(verse, book, exportedVersion);
        originalVerses.push(convertedVerse);
      }
    }

    results.totalOriginalVerses = originalVerses.length;
    console.log(
      `📊 Found ${results.totalOriginalVerses} verses in original data`
    );

    // Sort both arrays by sequence for proper comparison
    console.log(`🔄 Sorting verses by sequence...`);
    originalVerses.sort((a, b) => a.sequence.localeCompare(b.sequence));
    exportedData.sort((a: any, b: any) => a.sequence.localeCompare(b.sequence));

    // Compare counts
    if (results.totalOriginalVerses !== results.totalExportedVerses) {
      results.differences.push(
        `Verse count mismatch: ${results.totalOriginalVerses} original vs ${results.totalExportedVerses} exported`
      );
      results.success = false;
    }

    // Compare verses
    const minVerses = Math.min(originalVerses.length, exportedData.length);

    for (let i = 0; i < minVerses; i++) {
      const original = originalVerses[i];
      const exported = exportedData[i];

      // Compare all fields
      const fieldsToCompare = [
        "_id",
        "version",
        "chapter",
        "sequence",
        "number",
        "text",
      ];

      for (const field of fieldsToCompare) {
        if (original[field] !== exported[field]) {
          results.differences.push(
            `Verse ${i + 1} field '${field}' mismatch:\n` +
              `  Original: ${JSON.stringify(original[field])}\n` +
              `  Exported: ${JSON.stringify(exported[field])}`
          );
          results.success = false;
        }
      }

      // Compare paragraphs if they exist
      if (original.paragraphs && exported.paragraphs) {
        if (
          JSON.stringify(original.paragraphs) !==
          JSON.stringify(exported.paragraphs)
        ) {
          results.differences.push(
            `Verse ${i + 1} paragraphs mismatch:\n` +
              `  Original: ${JSON.stringify(original.paragraphs)}\n` +
              `  Exported: ${JSON.stringify(exported.paragraphs)}`
          );
          results.success = false;
        }
      }

      // Compare footnotes if they exist
      if (original.footnotes && exported.footnotes) {
        if (
          JSON.stringify(original.footnotes) !==
          JSON.stringify(exported.footnotes)
        ) {
          results.differences.push(
            `Verse ${i + 1} footnotes mismatch:\n` +
              `  Original: ${JSON.stringify(original.footnotes)}\n` +
              `  Exported: ${JSON.stringify(exported.footnotes)}`
          );
          results.success = false;
        }
      }
    }

    // Report results
    console.log(`\n📋 COMPARISON RESULTS:`);
    console.log(`   Original verses: ${results.totalOriginalVerses}`);
    console.log(`   Exported verses: ${results.totalExportedVerses}`);

    if (results.success) {
      console.log(`✅ SUCCESS: All data matches perfectly!`);
    } else {
      console.log(
        `❌ ISSUES FOUND: ${results.differences.length} differences detected`
      );

      if (results.differences.length <= 10) {
        console.log(`\n🔍 DIFFERENCES:`);
        results.differences.forEach((diff, index) => {
          console.log(`${index + 1}. ${diff}`);
        });
      } else {
        console.log(`\n🔍 FIRST 10 DIFFERENCES:`);
        results.differences.slice(0, 10).forEach((diff, index) => {
          console.log(`${index + 1}. ${diff}`);
        });
        console.log(
          `... and ${results.differences.length - 10} more differences`
        );
      }
    }
  } catch (error) {
    console.error(`❌ Error during comparison: ${error}`);
    results.success = false;
  }

  return results;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  let originalVersion = "webus2020";
  let exportedVersion = "webp";

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--original":
        originalVersion = args[++i];
        break;
      case "--exported":
        exportedVersion = args[++i];
        break;
      case "--help":
        console.log("Usage: ts-node compareImportToExport.ts [options]");
        console.log("Options:");
        console.log(
          "  --original <version>    Original version directory name (default: webus2020)"
        );
        console.log(
          "  --exported <version>    Exported version filename suffix (default: webp)"
        );
        console.log("  --help                  Show this help");
        process.exit(0);
      default:
        console.error(`Unknown argument: ${arg}`);
        process.exit(1);
    }
  }

  compareImportToExport(originalVersion, exportedVersion)
    .then((result) => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error(`Unexpected error: ${error}`);
      process.exit(1);
    });
}
