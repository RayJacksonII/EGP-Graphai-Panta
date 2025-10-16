#!/usr/bin/env node

import { writeFileSync, mkdirSync, readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { discoverVersions } from "../utils/versionDiscovery";
import { loadBookMetadata, getBookById } from "../utils/bookMetadata";
import convertVerseToBB from "../functions/convertVerseToBB";
import ProcessingResult, {
  ProcessingError,
  ProcessingWarning,
} from "../types/ProcessingResult";
import BBVerse from "../types/BBVerse";
import VerseSchema from "../../types/VerseSchema";
import {
  ProgressBar,
  PerformanceMonitor,
  formatDuration,
  formatMemoryUsage,
} from "../utils/progressTracker";
import { BenchmarkSuite } from "../utils/benchmarking";

/**
 * Version name crosswalk mapping for output file naming
 */
const VERSION_CROSSWALK: Record<string, string> = {
  webus2020: "webp",
};

/**
 * Apply version crosswalk to translate version names for output
 */
function applyVersionCrosswalk(version: string): string {
  return VERSION_CROSSWALK[version] || version;
}

export interface ExportOptions {
  versionsDir?: string;
  booksPath?: string;
  outputDir?: string;
  versions?: string[];
  verbose?: boolean;
  failFast?: boolean;
  parallel?: boolean;
  maxConcurrency?: number;
  benchmark?: boolean;
  chunkSize?: number;
}

export interface ExportOptions {
  versionsDir?: string;
  booksPath?: string;
  outputDir?: string;
  versions?: string[];
  verbose?: boolean;
  failFast?: boolean;
  parallel?: boolean;
  maxConcurrency?: number;
}

/**
 * Process versions sequentially (original implementation)
 */
async function processVersionsSequentially(
  versions: string[],
  versionsDir: string,
  bookMetadata: any,
  outputDir: string,
  verbose: boolean,
  failFast: boolean,
  result: ProcessingResult,
  progressBar: ProgressBar,
  performanceMonitor: PerformanceMonitor,
  chunkSize: number
): Promise<void> {
  for (let i = 0; i < versions.length; i++) {
    const version = versions[i];
    if (verbose) {
      console.log(
        `\n[${i + 1}/${versions.length}] Processing version: ${version}`
      );
    } else {
      console.log(`\nProcessing ${version}...`);
    }

    performanceMonitor.checkpoint(`version-${version}-start`);

    try {
      const versionStartTime = Date.now();
      const versionResult = await processVersion(
        version,
        versionsDir,
        bookMetadata,
        outputDir,
        verbose,
        chunkSize
      );
      const versionDuration = Date.now() - versionStartTime;

      result.totalVerses += versionResult.totalVerses;
      result.processedVersions.push(version);

      if (versionResult.errors.length > 0) {
        result.errors.push(...versionResult.errors);
        if (failFast) {
          throw new Error(
            `Version ${version} failed with ${versionResult.errors.length} errors. Fail-fast enabled.`
          );
        }
      }

      if (versionResult.warnings.length > 0) {
        result.warnings.push(...versionResult.warnings);
      }

      if (verbose) {
        console.log(
          `✓ ${version}: ${versionResult.totalVerses} verses processed in ${versionDuration}ms`
        );
      }

      // Memory optimization: clear large objects after processing
      if (global.gc && !verbose) {
        // Suggest garbage collection for large datasets
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > 100 * 1024 * 1024) {
          // > 100MB
          global.gc();
        }
      }
    } catch (error) {
      const errorMsg: ProcessingError = {
        type: "file",
        message: `Failed to process version ${version}: ${error}`,
        version,
      };
      result.errors.push(errorMsg);
      if (verbose) console.error(`✗ ${version}: ${errorMsg.message}`);

      if (failFast) {
        throw error; // Re-throw to stop processing
      }
    }
  }

  // Complete progress bar
  progressBar.complete();
}

/**
 * Process versions in parallel with controlled concurrency
 */
async function processVersionsInParallel(
  versions: string[],
  versionsDir: string,
  bookMetadata: any,
  outputDir: string,
  verbose: boolean,
  failFast: boolean,
  maxConcurrency: number,
  result: ProcessingResult,
  progressBar: ProgressBar,
  performanceMonitor: PerformanceMonitor,
  chunkSize: number
): Promise<void> {
  let completedCount = 0;
  const activePromises = new Map<string, Promise<void>>();
  const results: Array<{
    version: string;
    result: ProcessingResult;
    error?: Error;
  }> = [];

  // Process versions with controlled concurrency
  for (let i = 0; i < versions.length; i++) {
    const version = versions[i];

    // Wait if we've reached max concurrency
    if (activePromises.size >= maxConcurrency) {
      await Promise.race(activePromises.values());
    }

    // Start processing this version
    const versionPromise = processVersionAsync(
      version,
      versionsDir,
      bookMetadata,
      outputDir,
      verbose,
      chunkSize,
      performanceMonitor
    )
      .then((versionResult) => {
        results.push({ version, result: versionResult });
        activePromises.delete(version);
        completedCount++;
        progressBar.update(completedCount);
      })
      .catch((error) => {
        results.push({
          version,
          result: {
            success: false,
            totalVersions: 1,
            totalBooks: 0,
            totalVerses: 0,
            processedVersions: [],
            errors: [],
            warnings: [],
            startTime: new Date(),
          },
          error,
        });
        activePromises.delete(version);
        completedCount++;
        progressBar.update(completedCount);

        if (failFast) {
          throw error;
        }
      });

    activePromises.set(version, versionPromise);

    if (verbose) {
      console.log(
        `Started processing ${version} (${activePromises.size}/${maxConcurrency} concurrent)`
      );
    }
  }

  // Wait for all remaining promises to complete
  await Promise.allSettled(activePromises.values());

  // Process results
  for (const { version, result: versionResult, error } of results) {
    if (error) {
      const errorMsg: ProcessingError = {
        type: "file",
        message: `Failed to process version ${version}: ${error}`,
        version,
      };
      result.errors.push(errorMsg);
    } else {
      result.totalVerses += versionResult.totalVerses;
      result.processedVersions.push(version);

      if (versionResult.errors.length > 0) {
        result.errors.push(...versionResult.errors);
      }

      if (versionResult.warnings.length > 0) {
        result.warnings.push(...versionResult.warnings);
      }

      if (verbose) {
        console.log(
          `✓ ${version}: ${versionResult.totalVerses} verses processed`
        );
      }
    }
  }

  // Complete progress bar
  progressBar.complete();
}

/**
 * Async wrapper for processVersion
 */
async function processVersionAsync(
  version: string,
  versionsDir: string,
  bookMetadata: any,
  outputDir: string,
  verbose: boolean,
  chunkSize: number,
  performanceMonitor: PerformanceMonitor
): Promise<ProcessingResult> {
  performanceMonitor.checkpoint(`version-${version}-start`);

  try {
    const result = await processVersion(
      version,
      versionsDir,
      bookMetadata,
      outputDir,
      verbose,
      chunkSize
    );

    performanceMonitor.checkpoint(`version-${version}-complete`);
    return result;
  } catch (error) {
    performanceMonitor.checkpoint(`version-${version}-error`);
    throw error;
  }
}

/**
 * Validate data integrity of verse conversion
 */
function validateVerseIntegrity(
  originalVerse: VerseSchema,
  convertedVerse: BBVerse,
  version: string,
  bookId: string
): { valid: boolean; message: string; details?: any } {
  // Check that essential fields are present
  if (!convertedVerse._id || !convertedVerse.version || !convertedVerse.text) {
    return {
      valid: false,
      message: "Missing essential fields in converted verse",
      details: { convertedVerse },
    };
  }

  // Check that verse has content
  if (!originalVerse.content || originalVerse.content.length === 0) {
    return {
      valid: false,
      message: "Original verse has no content",
      details: { originalVerse },
    };
  }

  // Check that converted text is not empty
  if (!convertedVerse.text.trim()) {
    return {
      valid: false,
      message: "Converted verse text is empty",
      details: { originalVerse, convertedVerse },
    };
  }

  // Check for Strong's numbers in original that should be in converted
  const originalStrongs = countStrongsInContent(originalVerse.content);
  const convertedStrongs = countStrongsInText(convertedVerse.text);

  if (originalStrongs > 0 && convertedStrongs === 0) {
    return {
      valid: false,
      message: "Strong's numbers lost during conversion",
      details: {
        originalStrongs,
        convertedStrongs,
        originalContent: originalVerse.content,
      },
    };
  }

  // Check for footnotes in original that should be in converted
  const originalFootnotes = countFootnotesInContent(originalVerse.content);
  const convertedFootnotes = convertedVerse.footnotes?.length || 0;

  if (originalFootnotes > 0 && convertedFootnotes === 0) {
    return {
      valid: false,
      message: "Footnotes lost during conversion",
      details: {
        originalFootnotes,
        convertedFootnotes,
        originalContent: originalVerse.content,
      },
    };
  }

  return { valid: true, message: "Verse integrity check passed" };
}

/**
 * Count Strong's numbers in verse content
 */
function countStrongsInContent(content: any[]): number {
  let count = 0;
  for (const node of content) {
    if (node.strong) count++;
    if (node.content) count += countStrongsInContent(node.content);
  }
  return count;
}

/**
 * Count Strong's numbers in converted text
 */
function countStrongsInText(text: string): number {
  const strongsRegex = /\[strongs id="[^"]+"[^]*?\]/g;
  const matches = text.match(strongsRegex);
  return matches ? matches.length : 0;
}

/**
 * Count footnotes in verse content
 */
function countFootnotesInContent(content: any[]): number {
  let count = 0;
  for (const node of content) {
    if (node.foot) count++;
    if (node.content) count += countFootnotesInContent(node.content);
  }
  return count;
}

/**
 * Generate a comprehensive processing digest
 */
function generateProcessingDigest(
  result: ProcessingResult,
  performanceReport?: any
): string {
  const lines: string[] = [];
  lines.push("=".repeat(60));
  lines.push("BIBLE DATA EXPORT PROCESSING DIGEST");
  lines.push("=".repeat(60));

  lines.push(`\n📊 OVERVIEW:`);
  lines.push(`   Status: ${result.success ? "✅ SUCCESS" : "❌ FAILED"}`);
  lines.push(`   Total Versions: ${result.totalVersions}`);
  lines.push(`   Processed Versions: ${result.processedVersions.length}`);
  lines.push(`   Total Books: ${result.totalBooks}`);
  lines.push(`   Total Verses: ${result.totalVerses}`);
  lines.push(
    `   Duration: ${result.durationMs ? `${result.durationMs}ms` : "N/A"}`
  );

  if (performanceReport) {
    lines.push(
      `   Performance: ${formatDuration(performanceReport.totalDuration)}`
    );
    lines.push(
      `   Peak Memory: ${formatMemoryUsage(performanceReport.peakMemoryUsage)}`
    );
  }

  if (result.processedVersions.length > 0) {
    lines.push(`   Versions Processed: ${result.processedVersions.join(", ")}`);
  }

  if (result.errors.length > 0) {
    lines.push(`\n❌ ERRORS (${result.errors.length}):`);
    const errorTypes = result.errors.reduce((acc, err) => {
      acc[err.type] = (acc[err.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(errorTypes).forEach(([type, count]) => {
      lines.push(`   ${type}: ${count}`);
    });

    // Show first few errors
    result.errors.slice(0, 5).forEach((error, i) => {
      lines.push(`   ${i + 1}. ${error.message}`);
      if (error.version) lines.push(`      Version: ${error.version}`);
      if (error.book) lines.push(`      Book: ${error.book}`);
      if (error.chapter) lines.push(`      Chapter: ${error.chapter}`);
    });

    if (result.errors.length > 5) {
      lines.push(`   ... and ${result.errors.length - 5} more errors`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push(`\n⚠️  WARNINGS (${result.warnings.length}):`);
    const warningTypes = result.warnings.reduce((acc, warn) => {
      acc[warn.type] = (acc[warn.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(warningTypes).forEach(([type, count]) => {
      lines.push(`   ${type}: ${count}`);
    });

    // Show first few warnings
    result.warnings.slice(0, 3).forEach((warning, i) => {
      lines.push(`   ${i + 1}. ${warning.message}`);
    });

    if (result.warnings.length > 3) {
      lines.push(`   ... and ${result.warnings.length - 3} more warnings`);
    }
  }

  if (result.success && result.errors.length === 0) {
    lines.push(`\n🎉 SUCCESS: All data processed without critical errors!`);
  } else if (result.errors.length > 0) {
    lines.push(
      `\n⚠️  CAUTION: Processing completed with errors. Review the output carefully.`
    );
  }

  lines.push("=".repeat(60));

  return lines.join("\n");
}

/**
 * Validate the output format of generated BB verses
 */
function validateOutputFormat(
  verses: BBVerse[],
  version: string
): { valid: boolean; message: string; details?: any } {
  if (!Array.isArray(verses)) {
    return {
      valid: false,
      message: "Output is not an array",
      details: { type: typeof verses },
    };
  }

  if (verses.length === 0) {
    return {
      valid: false,
      message: "Output array is empty",
    };
  }

  // Validate first verse structure
  const firstVerse = verses[0];
  const requiredFields = [
    "_id",
    "version",
    "chapter",
    "sequence",
    "number",
    "text",
  ];

  for (const field of requiredFields) {
    if (!(field in firstVerse)) {
      return {
        valid: false,
        message: `Missing required field '${field}' in verse`,
        details: { verse: firstVerse, missingField: field },
      };
    }
  }

  // Validate _id format
  const idRegex = new RegExp(`^${version}-\\d{9}$`);
  if (!idRegex.test(firstVerse._id)) {
    return {
      valid: false,
      message: `Invalid _id format: ${firstVerse._id}`,
      details: {
        expectedFormat: `${version}-NNNNNNNNN`,
        actual: firstVerse._id,
      },
    };
  }

  // Validate version field
  if (firstVerse.version !== version) {
    return {
      valid: false,
      message: `Version mismatch: expected '${version}', got '${firstVerse.version}'`,
      details: { expected: version, actual: firstVerse.version },
    };
  }

  // Validate sequence format
  const sequenceRegex = /^\d{9}$/;
  if (!sequenceRegex.test(firstVerse.sequence)) {
    return {
      valid: false,
      message: `Invalid sequence format: ${firstVerse.sequence}`,
      details: { expectedFormat: "NNNNNNNNN", actual: firstVerse.sequence },
    };
  }

  // Validate chapter format
  const chapterRegex = /^[a-z]+-\d+$/;
  if (!chapterRegex.test(firstVerse.chapter)) {
    return {
      valid: false,
      message: `Invalid chapter format: ${firstVerse.chapter}`,
      details: { expectedFormat: "book-name", actual: firstVerse.chapter },
    };
  }

  // Validate text is not empty
  if (!firstVerse.text || firstVerse.text.trim().length === 0) {
    return {
      valid: false,
      message: "Verse text is empty",
      details: { verse: firstVerse },
    };
  }

  // Validate Strong's markup format (if present)
  if (firstVerse.text.includes("[strongs")) {
    const strongsRegex = /\[strongs id="[^"]+"[^]*?\]/g;
    const matches = firstVerse.text.match(strongsRegex);
    if (matches) {
      for (const match of matches) {
        if (!match.includes('id="') || !match.endsWith("/]")) {
          return {
            valid: false,
            message: `Invalid Strong's markup format: ${match}`,
            details: { text: firstVerse.text, invalidMarkup: match },
          };
        }
      }
    }
  }

  // Validate sorting (first few verses should be in order)
  for (let i = 1; i < Math.min(verses.length, 10); i++) {
    if (verses[i].sequence.localeCompare(verses[i - 1].sequence) < 0) {
      return {
        valid: false,
        message: "Verses are not properly sorted by sequence",
        details: {
          verse1: verses[i - 1].sequence,
          verse2: verses[i].sequence,
          index: i,
        },
      };
    }
  }

  return { valid: true, message: "Output format validation passed" };
}

export interface ExportOptions {
  versionsDir?: string;
  booksPath?: string;
  outputDir?: string;
  versions?: string[];
  verbose?: boolean;
  failFast?: boolean;
}

/**
 * Main export function that transforms structured Bible data back to legacy BB format
 */
export async function exportToBB(
  options: ExportOptions = {}
): Promise<ProcessingResult> {
  const benchmarkSuite = options.benchmark ? new BenchmarkSuite() : null;
  const performanceMonitor = new PerformanceMonitor();

  const {
    versionsDir = "./bible-versions",
    booksPath = "./bible-books/bible-books.json",
    outputDir = "./exports",
    versions: specifiedVersions,
    verbose = false,
    failFast = false,
    parallel = false,
    maxConcurrency = 3,
    benchmark = false,
    chunkSize = 1000,
  } = options;

  const result: ProcessingResult = {
    success: true,
    totalVersions: 0,
    totalBooks: 0,
    totalVerses: 0,
    processedVersions: [],
    errors: [],
    warnings: [],
    startTime: new Date(),
  };

  try {
    // Discover available versions
    if (verbose) console.log("Discovering available versions...");
    const allVersions = discoverVersions(versionsDir);
    const versionsToProcess = specifiedVersions || allVersions;

    if (verbose) {
      console.log(`Found versions: ${allVersions.join(", ")}`);
      console.log(`Processing versions: ${versionsToProcess.join(", ")}`);
    }

    result.totalVersions = versionsToProcess.length;

    // Load book metadata
    if (verbose) console.log("Loading book metadata...");
    const bookMetadata = loadBookMetadata(booksPath);

    // Ensure output directory exists
    mkdirSync(outputDir, { recursive: true });

    // Process versions with benchmarking if enabled
    const processingFunction = async () => {
      // Process each version
      const versionProgressBar = new ProgressBar(versionsToProcess.length);
      if (!verbose) {
        console.log(`Processing ${versionsToProcess.length} version(s)...`);
      }

      if (parallel && versionsToProcess.length > 1) {
        await processVersionsInParallel(
          versionsToProcess,
          versionsDir,
          bookMetadata,
          outputDir,
          verbose,
          failFast,
          maxConcurrency,
          result,
          versionProgressBar,
          performanceMonitor,
          chunkSize
        );
      } else {
        await processVersionsSequentially(
          versionsToProcess,
          versionsDir,
          bookMetadata,
          outputDir,
          verbose,
          failFast,
          result,
          versionProgressBar,
          performanceMonitor,
          chunkSize
        );
      }
    };

    if (benchmarkSuite) {
      await benchmarkSuite.benchmark("bible-export", processingFunction, {
        itemCount: result.totalVersions,
        metadata: {
          versions: versionsToProcess.length,
          parallel,
          maxConcurrency,
        },
      });
    } else {
      await processingFunction();
    }

    if (result.errors.length > 0) {
      result.success = false;
    }

    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - result.startTime.getTime();

    // Generate performance report
    performanceMonitor.checkpoint("export-complete");
    const performanceReport = performanceMonitor.getReport();

    if (verbose) {
      console.log(
        `\nExport completed. Processed ${result.totalVerses} verses across ${result.processedVersions.length} versions.`
      );
      if (result.errors.length > 0) {
        console.log(`Errors: ${result.errors.length}`);
      }
      if (result.warnings.length > 0) {
        console.log(`Warnings: ${result.warnings.length}`);
      }

      // Display performance summary
      console.log(`\n⏱️  Performance Summary:`);
      console.log(
        `   Total Time: ${formatDuration(performanceReport.totalDuration)}`
      );
      console.log(
        `   Peak Memory: ${formatMemoryUsage(
          performanceReport.peakMemoryUsage
        )}`
      );
      console.log(
        `   Average Memory: ${formatMemoryUsage(
          performanceReport.averageMemoryUsage
        )}`
      );
    }

    // Generate processing digest
    const digest = generateProcessingDigest(result, performanceReport);
    if (verbose) {
      console.log("\n" + digest);
    }

    // Generate benchmark report if enabled
    if (benchmarkSuite && verbose) {
      console.log("\n" + benchmarkSuite.generateReport());
    }
  } catch (error) {
    result.success = false;
    const errorMsg: ProcessingError = {
      type: "file",
      message: `Export failed: ${error}`,
    };
    result.errors.push(errorMsg);
    if (verbose) console.error(errorMsg.message);
  }

  return result;
}

/**
 * Process a single version
 */
async function processVersion(
  version: string,
  versionsDir: string,
  bookMetadata: any,
  outputDir: string,
  verbose: boolean,
  chunkSize: number = 1000
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    success: true,
    totalVersions: 1,
    totalBooks: 0,
    totalVerses: 0,
    processedVersions: [],
    errors: [],
    warnings: [],
    startTime: new Date(),
  };

  try {
    const versionDir = join(versionsDir, version);
    const bookFiles = readdirSync(versionDir).filter((file) =>
      file.endsWith(".json")
    );

    if (verbose)
      console.log(
        `Found ${bookFiles.length} book files for version ${version}`
      );

    const allVerses: BBVerse[] = [];
    const bookProgressBar = verbose ? null : new ProgressBar(bookFiles.length);

    for (let bookIndex = 0; bookIndex < bookFiles.length; bookIndex++) {
      const bookFile = bookFiles[bookIndex];
      if (verbose && bookFiles.length > 1) {
        console.log(
          `  [${bookIndex + 1}/${bookFiles.length}] Processing ${bookFile}...`
        );
      }

      try {
        const bookStartTime = Date.now();
        const bookPath = join(versionDir, bookFile);
        const bookData = readFileSync(bookPath, "utf-8");
        const verses: VerseSchema[] = JSON.parse(bookData);

        if (verbose)
          console.log(`    Found ${verses.length} verses in ${bookFile}`);

        let verseCount = 0;
        // Process verses in chunks to manage memory
        for (let i = 0; i < verses.length; i += chunkSize) {
          const chunk = verses.slice(i, i + chunkSize);
          const chunkVerses: BBVerse[] = [];

          for (const verse of chunk) {
            try {
              const book = getBookById(bookMetadata, verse.book);
              if (!book) {
                const warning: ProcessingWarning = {
                  type: "missing_data",
                  message: `Book ${verse.book} not found in metadata`,
                  version,
                  book: verse.book,
                };
                result.warnings.push(warning);
                continue;
              }

              const outputVersionName = applyVersionCrosswalk(version);
              const bbVerse = convertVerseToBB(verse, book, outputVersionName);

              // Data integrity check
              const integrityCheck = validateVerseIntegrity(
                verse,
                bbVerse,
                outputVersionName,
                book._id
              );
              if (!integrityCheck.valid) {
                const warning: ProcessingWarning = {
                  type: "data_integrity",
                  message: integrityCheck.message,
                  version,
                  book: verse.book,
                  chapter: verse.chapter,
                  verse: verse.verse,
                  details: integrityCheck.details,
                };
                result.warnings.push(warning);
              }

              chunkVerses.push(bbVerse);
              result.totalVerses++;
              verseCount++;
            } catch (error) {
              const errorMsg: ProcessingError = {
                type: "conversion",
                message: `Failed to convert verse ${verse.book} ${verse.chapter}:${verse.verse}: ${error}`,
                version,
                book: verse.book,
                chapter: verse.chapter,
                verse: verse.verse,
                filePath: bookPath,
                details: {
                  verseContent: JSON.stringify(verse).substring(0, 200) + "...",
                  error: error instanceof Error ? error.message : String(error),
                  stack: error instanceof Error ? error.stack : undefined,
                },
              };
              result.errors.push(errorMsg);

              // For critical conversion errors, we might want to fail fast
              if (
                error instanceof Error &&
                error.message.includes("Critical")
              ) {
                throw new Error(
                  `Critical conversion error in ${verse.book} ${verse.chapter}:${verse.verse}: ${error.message}`
                );
              }
            }
          }

          // Add chunk verses to all verses
          allVerses.push(...chunkVerses);

          // Memory optimization: clear chunk references
          chunkVerses.length = 0;
        }

        const bookDuration = Date.now() - bookStartTime;
        if (verbose) {
          console.log(
            `    ✓ ${bookFile}: ${verseCount} verses processed in ${bookDuration}ms`
          );
        }

        result.totalBooks++;

        // Update progress bar
        if (bookProgressBar) {
          bookProgressBar.update(bookIndex + 1);
        }
      } catch (error) {
        const errorMsg: ProcessingError = {
          type: "file",
          message: `Failed to process book file ${bookFile}: ${error}`,
          version,
          filePath: join(versionDir, bookFile),
        };
        result.errors.push(errorMsg);
        if (verbose) console.error(`    ✗ ${bookFile}: ${errorMsg.message}`);
      }
    }

    // Complete book progress bar
    if (bookProgressBar) {
      bookProgressBar.complete();
    }

    // Sort verses by sequence for consistent output
    allVerses.sort((a, b) => a.sequence.localeCompare(b.sequence));

    // Write output file
    const outputVersionName = applyVersionCrosswalk(version);
    const outputFile = join(
      outputDir,
      `BibleDB.bibleVerses-${outputVersionName}.json`
    );
    writeFileSync(outputFile, JSON.stringify(allVerses, null, 2));

    // Validate output format
    if (allVerses.length > 0) {
      const formatValidation = validateOutputFormat(
        allVerses,
        outputVersionName
      );
      if (!formatValidation.valid) {
        const errorMsg: ProcessingError = {
          type: "validation",
          message: `Output format validation failed: ${formatValidation.message}`,
          version,
          filePath: outputFile,
          details: formatValidation.details,
        };
        result.errors.push(errorMsg);
      }
    }

    if (verbose)
      console.log(`Wrote ${allVerses.length} verses to ${outputFile}`);

    result.processedVersions.push(version);
    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - result.startTime.getTime();
  } catch (error) {
    result.success = false;
    const errorMsg: ProcessingError = {
      type: "file",
      message: `Failed to process version ${version}: ${error}`,
      version,
    };
    result.errors.push(errorMsg);
  }

  return result;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: ExportOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--versions-dir":
        options.versionsDir = args[++i];
        break;
      case "--books-path":
        options.booksPath = args[++i];
        break;
      case "--output-dir":
        options.outputDir = args[++i];
        break;
      case "--versions":
        options.versions = args[++i].split(",");
        break;
      case "--verbose":
        options.verbose = true;
        break;
      case "--fail-fast":
        options.failFast = true;
        break;
      case "--parallel":
        options.parallel = true;
        break;
      case "--max-concurrency":
        options.maxConcurrency = parseInt(args[++i]);
        break;
      case "--benchmark":
        options.benchmark = true;
        break;
      case "--chunk-size":
        options.chunkSize = parseInt(args[++i]);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        process.exit(1);
    }
  }

  exportToBB(options)
    .then((result) => {
      if (!result.success) {
        console.error("Export failed with errors:");
        result.errors.forEach((error: ProcessingError) =>
          console.error(`  - ${error.message}`)
        );
        process.exit(1);
      } else {
        console.log("Export completed successfully!");
        if (result.warnings.length > 0) {
          console.log("Warnings:");
          result.warnings.forEach((warning: ProcessingWarning) =>
            console.log(`  - ${warning.message}`)
          );
        }
      }
    })
    .catch((error) => {
      console.error(`Unexpected error: ${error}`);
      process.exit(1);
    });
}
