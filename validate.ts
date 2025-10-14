import validateJsonAgainstSchema from "./functions/validateJsonAgainstSchema";
import * as fs from "fs";
import _ from "lodash";
import Ajv from "ajv";

const schemaPath = "./bible-books/bible-book-schema.json";
const jsonPath = "./bible-books/bible-books.json";

// First, validate against the schema
const result = validateJsonAgainstSchema(schemaPath, jsonPath);

console.log("Schema validation result:", result);

if (result.valid) {
  // Additional validation: Check order field integrity for each canon
  const booksContent = fs.readFileSync(jsonPath, "utf-8");
  const books = JSON.parse(booksContent);

  const canons = ["protestant", "catholic", "orthodox", "lxx", "hebrew"];
  let orderValidationPassed = true;

  for (const canon of canons) {
    // Collect all order values for this canon
    const orderValues = books
      .map((book: any, index: number) => ({
        bookId: book._id,
        bookIndex: index,
        order: book.order?.[canon],
      }))
      .filter((item: any) => item.order !== undefined);

    if (orderValues.length === 0) {
      continue; // This canon is not used
    }

    const orders = orderValues.map((item: any) => item.order);
    const sortedOrders = _.sortBy(orders);

    // Check for duplicates
    const duplicates = _.filter(
      _.groupBy(orderValues, "order"),
      (group) => group.length > 1
    );

    if (duplicates.length > 0) {
      console.error(`\n❌ ${canon} canon has duplicate order numbers:`);
      duplicates.forEach((group) => {
        const bookIds = group.map((item: any) => item.bookId).join(", ");
        console.error(`  Order ${group[0].order}: ${bookIds}`);
      });
      orderValidationPassed = false;
    }

    // Check if starts at 1
    if (sortedOrders[0] !== 1) {
      console.error(
        `\n❌ ${canon} canon does not start at 1 (starts at ${sortedOrders[0]})`
      );
      orderValidationPassed = false;
    }

    // Check for gaps in sequence
    const expectedCount = sortedOrders[sortedOrders.length - 1];
    if (sortedOrders.length !== expectedCount) {
      const allExpected = _.range(1, expectedCount + 1);
      const missing = _.difference(allExpected, sortedOrders);
      if (missing.length > 0) {
        console.error(
          `\n❌ ${canon} canon has gaps in numbering. Missing: ${missing.join(
            ", "
          )}`
        );
        orderValidationPassed = false;
      }
    }

    // Success message
    if (
      sortedOrders[0] === 1 &&
      sortedOrders.length === expectedCount &&
      duplicates.length === 0
    ) {
      console.log(
        `✅ ${canon} canon: ${sortedOrders.length} books, numbered 1–${expectedCount}`
      );
    }
  }

  if (!orderValidationPassed) {
    console.error("\n❌ Order validation failed!");
    process.exit(1);
  } else {
    console.log("\n✅ All order validations passed!");
  }
} else {
  process.exit(1);
}

// Now, validate bible-versions
const versionsSchemaPath = "./bible-versions/bible-versions-schema.json";
const versionsJsonPath = "./bible-versions/bible-versions.json";

const versionsResult = validateJsonAgainstSchema(
  versionsSchemaPath,
  versionsJsonPath
);

console.log("\nBible versions schema validation result:", versionsResult);

if (!versionsResult.valid) {
  process.exit(1);
} else {
  console.log("\n✅ Bible versions validation passed!");
}

// Now, validate bible-versions verse files
console.log("\n🔍 Validating Bible verse files...");

const bibleVersionsDir = "./bible-versions";
const verseSchemaPath = "./bible-versions/bible-verses-schema.json";

// Get all version directories
const versionDirs = fs.readdirSync(bibleVersionsDir).filter((item) => {
  const itemPath = `${bibleVersionsDir}/${item}`;
  return fs.statSync(itemPath).isDirectory();
});

let verseValidationPassed = true;

// Load books for validation
const books = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
const validBookIds = new Set(books.map((book: any) => book._id));

// Load and compile the verse schema once
const verseSchemaContent = fs.readFileSync(verseSchemaPath, "utf-8");
const verseSchema = JSON.parse(verseSchemaContent);
const ajv = new Ajv();
const validateVerse = ajv.compile(verseSchema);

for (const version of versionDirs) {
  const versionPath = `${bibleVersionsDir}/${version}`;
  const verseFiles = fs
    .readdirSync(versionPath)
    .filter((file) => file.endsWith(".json"));

  console.log(`\n📖 Checking version: ${version}`);

  for (const file of verseFiles) {
    const filePath = `${versionPath}/${file}`;
    const bookIdFromFilename = file.replace(".json", "");

    // Check if filename matches a valid book ID
    if (!validBookIds.has(bookIdFromFilename)) {
      console.error(
        `❌ Invalid filename: ${file} (book ID "${bookIdFromFilename}" not found in bible-books.json)`
      );
      verseValidationPassed = false;
      continue;
    }

    // Check that all verses have the correct book field
    const verses = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Validate each verse individually against the schema
    for (const verse of verses) {
      const valid = validateVerse(verse);
      if (!valid) {
        console.error(
          `❌ Schema validation failed for verse ${verse.chapter}:${verse.verse} in ${filePath}:`,
          validateVerse.errors
        );
        verseValidationPassed = false;
      }

      if (verse.book !== bookIdFromFilename) {
        console.error(
          `❌ Book field mismatch in ${filePath}: verse ${verse.chapter}:${verse.verse} has book="${verse.book}" but filename indicates "${bookIdFromFilename}"`
        );
        verseValidationPassed = false;
      }
    }

    console.log(`✅ ${file}: ${verses.length} verses validated`);
  }
}

if (!verseValidationPassed) {
  console.error("\n❌ Verse file validation failed!");
  process.exit(1);
} else {
  console.log("\n✅ All verse file validations passed!");
}
