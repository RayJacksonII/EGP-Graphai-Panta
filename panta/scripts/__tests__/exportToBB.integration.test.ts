/**
 * Integration tests for the Bible data export system
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  existsSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  rmdirSync,
} from "fs";
import { join } from "path";
import { exportToBB } from "../exportToBB";

describe("Bible Data Export Integration Tests", () => {
  const testOutputDir = "./test-exports";
  const testVersionsDir = "./bible-versions";
  const testBooksPath = "./bible-books/bible-books.json";

  beforeAll(() => {
    // Ensure test output directory exists
    if (!existsSync(testOutputDir)) {
      require("fs").mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test files
    if (existsSync(testOutputDir)) {
      try {
        const files = readdirSync(testOutputDir);
        files.forEach((file) => {
          if (file.endsWith(".json")) {
            unlinkSync(join(testOutputDir, file));
          }
        });
        rmdirSync(testOutputDir);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  it("should export KJV version successfully", async () => {
    const result = await exportToBB({
      versionsDir: testVersionsDir,
      booksPath: testBooksPath,
      outputDir: testOutputDir,
      versions: ["kjv"],
      verbose: false,
    });

    expect(result.success).toBe(true);
    expect(result.processedVersions).toContain("kjv");
    expect(result.totalVerses).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);

    // Check output file exists
    const outputFile = join(testOutputDir, "BibleDB.bibleVerses-kjv.json");
    expect(existsSync(outputFile)).toBe(true);

    // Validate output format
    const outputData = JSON.parse(readFileSync(outputFile, "utf-8"));
    expect(Array.isArray(outputData)).toBe(true);
    expect(outputData.length).toBe(result.totalVerses);

    // Check first verse structure
    const firstVerse = outputData[0];
    expect(firstVerse).toHaveProperty("_id");
    expect(firstVerse).toHaveProperty("version", "kjv");
    expect(firstVerse).toHaveProperty("chapter");
    expect(firstVerse).toHaveProperty("sequence");
    expect(firstVerse).toHaveProperty("number");
    expect(firstVerse).toHaveProperty("text");
  }, 30000); // 30 second timeout

  it("should handle parallel processing", async () => {
    const result = await exportToBB({
      versionsDir: testVersionsDir,
      booksPath: testBooksPath,
      outputDir: testOutputDir,
      versions: ["kjv", "asv"], // Test with multiple versions
      verbose: false,
      parallel: true,
      maxConcurrency: 2,
    });

    expect(result.success).toBe(true);
    expect(result.processedVersions).toContain("kjv");
    expect(result.processedVersions).toContain("asv");
    expect(result.totalVerses).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  }, 60000); // 60 second timeout

  it("should handle benchmarking", async () => {
    const result = await exportToBB({
      versionsDir: testVersionsDir,
      booksPath: testBooksPath,
      outputDir: testOutputDir,
      versions: ["kjv"],
      verbose: true, // Need verbose for benchmark output
      benchmark: true,
    });

    expect(result.success).toBe(true);
    expect(result.processedVersions).toContain("kjv");
    expect(result.totalVerses).toBeGreaterThan(0);
  }, 30000);

  it("should handle chunked processing", async () => {
    const result = await exportToBB({
      versionsDir: testVersionsDir,
      booksPath: testBooksPath,
      outputDir: testOutputDir,
      versions: ["kjv"],
      verbose: false,
      chunkSize: 500, // Smaller chunks for testing
    });

    expect(result.success).toBe(true);
    expect(result.processedVersions).toContain("kjv");
    expect(result.totalVerses).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  }, 30000);

  it("should handle fail-fast error handling", async () => {
    // Test with invalid version to trigger error
    const result = await exportToBB({
      versionsDir: testVersionsDir,
      booksPath: testBooksPath,
      outputDir: testOutputDir,
      versions: ["invalid-version"],
      verbose: false,
      failFast: true,
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  }, 10000);

  it("should validate output format compliance", async () => {
    const result = await exportToBB({
      versionsDir: testVersionsDir,
      booksPath: testBooksPath,
      outputDir: testOutputDir,
      versions: ["kjv"],
      verbose: false,
    });

    expect(result.success).toBe(true);

    // Read and validate output
    const outputFile = join(testOutputDir, "BibleDB.bibleVerses-kjv.json");
    const outputData = JSON.parse(readFileSync(outputFile, "utf-8"));

    // Validate each verse has required fields
    outputData.forEach((verse: any, index: number) => {
      expect(verse).toHaveProperty("_id");
      expect(verse).toHaveProperty("version");
      expect(verse).toHaveProperty("chapter");
      expect(verse).toHaveProperty("sequence");
      expect(verse).toHaveProperty("number");
      expect(verse).toHaveProperty("text");

      // Validate _id format
      expect(verse._id).toMatch(/^kjv-\d{9}$/);

      // Validate sequence format
      expect(verse.sequence).toMatch(/^\d{9}$/);

      // Validate chapter format
      expect(verse.chapter).toMatch(/^[a-z0-9-]+-\d+$/);

      // Validate text is not empty
      expect(verse.text).toBeTruthy();
      expect(verse.text.trim().length).toBeGreaterThan(0);
    });

    // Validate verses are sorted by sequence
    for (let i = 1; i < Math.min(outputData.length, 100); i++) {
      expect(
        outputData[i].sequence.localeCompare(outputData[i - 1].sequence)
      ).toBeGreaterThanOrEqual(0);
    }
  }, 30000);

  it("should handle memory optimization for large datasets", async () => {
    // Test with a version that has many verses
    const result = await exportToBB({
      versionsDir: testVersionsDir,
      booksPath: testBooksPath,
      outputDir: testOutputDir,
      versions: ["kjv"],
      verbose: false,
      chunkSize: 100, // Very small chunks to test memory management
    });

    expect(result.success).toBe(true);
    expect(result.totalVerses).toBeGreaterThan(30000); // KJV has ~31K verses
    expect(result.errors).toHaveLength(0);

    // Verify output file integrity
    const outputFile = join(testOutputDir, "BibleDB.bibleVerses-kjv.json");
    const outputData = JSON.parse(readFileSync(outputFile, "utf-8"));
    expect(outputData.length).toBe(result.totalVerses);
  }, 45000); // 45 second timeout for memory-intensive test
});
