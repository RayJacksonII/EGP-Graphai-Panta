import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { discoverVersions } from "./versionDiscovery";
import { loadBookMetadata, BookMetadata } from "./bookMetadata";
import ProcessingResult, {
  ProcessingError,
  ProcessingWarning,
} from "../types/ProcessingResult";
import VerseSchema from "../../types/VerseSchema";

export interface VersionMetadata {
  _id: string;
  name: string;
  license: string;
  script?: string;
}

/**
 * Validates the Bible data structure and metadata consistency
 */
export class BibleDataValidator {
  private versionsDir: string;
  private booksPath: string;
  private versionsPath: string;

  constructor(
    versionsDir: string = "./bible-versions",
    booksPath: string = "./bible-books/bible-books.json",
    versionsPath: string = "./bible-versions/bible-versions.json"
  ) {
    this.versionsDir = versionsDir;
    this.booksPath = booksPath;
    this.versionsPath = versionsPath;
  }

  /**
   * Run comprehensive validation
   */
  async validate(): Promise<ProcessingResult> {
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
      // Validate file existence
      await this.validateFileExistence(result);

      // Load metadata
      const bookMetadata = loadBookMetadata(this.booksPath);
      const versionMetadata = this.loadVersionMetadata();

      // Validate versions
      await this.validateVersions(result, versionMetadata);

      // Validate books
      this.validateBooks(result, bookMetadata);

      // Validate sample data structure
      await this.validateDataStructure(result, bookMetadata);
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: "validation",
        message: `Validation failed: ${error}`,
      });
    }

    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - result.startTime.getTime();

    if (result.errors.length > 0) {
      result.success = false;
    }

    return result;
  }

  private async validateFileExistence(result: ProcessingResult): Promise<void> {
    const requiredFiles = [
      { path: this.booksPath, name: "bible-books.json" },
      { path: this.versionsPath, name: "bible-versions.json" },
      { path: this.versionsDir, name: "bible-versions directory" },
    ];

    for (const file of requiredFiles) {
      if (!existsSync(file.path)) {
        result.errors.push({
          type: "validation",
          message: `Required file/directory not found: ${file.name} at ${file.path}`,
        });
      }
    }
  }

  private loadVersionMetadata(): VersionMetadata[] {
    try {
      const data = readFileSync(this.versionsPath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to load version metadata: ${error}`);
    }
  }

  private async validateVersions(
    result: ProcessingResult,
    versionMetadata: VersionMetadata[]
  ): Promise<void> {
    const discoveredVersions = discoverVersions(this.versionsDir);
    const knownVersions = new Set(versionMetadata.map((v) => v._id));

    result.totalVersions = discoveredVersions.length;

    // Check for unknown versions
    for (const version of discoveredVersions) {
      if (!knownVersions.has(version)) {
        result.warnings.push({
          type: "missing_data",
          message: `Version '${version}' found in directory but not in bible-versions.json`,
          version,
        });
      }
    }

    // Check for missing version directories
    for (const version of versionMetadata) {
      if (!discoveredVersions.includes(version._id)) {
        result.errors.push({
          type: "validation",
          message: `Version '${version._id}' defined in metadata but directory not found`,
          version: version._id,
        });
      }
    }

    result.processedVersions = discoveredVersions;
  }

  private validateBooks(
    result: ProcessingResult,
    bookMetadata: BookMetadata
  ): void {
    // Validate book ordering
    const orderedBooks = Array.from(bookMetadata.byOrder.values());
    result.totalBooks = orderedBooks.length;

    // Check for gaps in ordering
    for (let i = 1; i <= orderedBooks.length; i++) {
      if (!bookMetadata.byOrder.has(i)) {
        result.errors.push({
          type: "validation",
          message: `Missing book at position ${i} in protestant ordering`,
        });
      }
    }

    // Validate alternative names don't conflict
    const altNames = new Map<string, string>();
    for (const book of bookMetadata.books) {
      for (const alt of book.alt) {
        if (altNames.has(alt)) {
          result.errors.push({
            type: "validation",
            message: `Alternative name '${alt}' used by both ${altNames.get(
              alt
            )} and ${book._id}`,
          });
        } else {
          altNames.set(alt, book._id);
        }
      }
    }
  }

  private async validateDataStructure(
    result: ProcessingResult,
    bookMetadata: BookMetadata
  ): Promise<void> {
    const versions = discoverVersions(this.versionsDir);

    // Validate a sample version (first one found)
    if (versions.length > 0) {
      const sampleVersion = versions[0];
      await this.validateVersionStructure(result, sampleVersion, bookMetadata);
    }
  }

  private async validateVersionStructure(
    result: ProcessingResult,
    version: string,
    bookMetadata: BookMetadata
  ): Promise<void> {
    const versionDir = join(this.versionsDir, version);

    try {
      // Get first book file as sample
      const fs = await import("fs");
      const files = fs
        .readdirSync(versionDir)
        .filter((f) => f.endsWith(".json"));

      if (files.length === 0) {
        result.warnings.push({
          type: "missing_data",
          message: `No book files found in version ${version}`,
          version,
        });
        return;
      }

      const sampleFile = files[0];
      const filePath = join(versionDir, sampleFile);

      try {
        const data = readFileSync(filePath, "utf-8");
        const verses: VerseSchema[] = JSON.parse(data);

        // Validate verse structure
        for (const verse of verses.slice(0, 5)) {
          // Check first 5 verses
          this.validateVerseStructure(result, verse, version, bookMetadata);
        }

        result.totalVerses += verses.length;
      } catch (error) {
        result.errors.push({
          type: "validation",
          message: `Failed to parse ${sampleFile}: ${error}`,
          version,
          filePath,
        });
      }
    } catch (error) {
      result.errors.push({
        type: "validation",
        message: `Failed to read version directory ${version}: ${error}`,
        version,
      });
    }
  }

  private validateVerseStructure(
    result: ProcessingResult,
    verse: VerseSchema,
    version: string,
    bookMetadata: BookMetadata
  ): void {
    // Validate required fields
    if (!verse.book || !verse.chapter || !verse.verse) {
      result.errors.push({
        type: "validation",
        message: `Verse missing required fields: ${JSON.stringify(verse)}`,
        version,
        book: verse.book,
        chapter: verse.chapter,
        verse: verse.verse,
      });
      return;
    }

    // Validate book exists
    if (!bookMetadata.byId.has(verse.book)) {
      result.errors.push({
        type: "validation",
        message: `Unknown book '${verse.book}' in verse`,
        version,
        book: verse.book,
        chapter: verse.chapter,
        verse: verse.verse,
      });
    }

    // Validate content structure
    if (!verse.content || !Array.isArray(verse.content)) {
      result.errors.push({
        type: "validation",
        message: `Verse content is not an array`,
        version,
        book: verse.book,
        chapter: verse.chapter,
        verse: verse.verse,
      });
      return;
    }

    // Validate content nodes
    for (const node of verse.content) {
      if (typeof node === "object" && node !== null) {
        // Check for valid node types
        if (
          !node.type &&
          !node.text &&
          !node.strong &&
          !node.script &&
          !node.foot
        ) {
          result.warnings.push({
            type: "format_issue",
            message: `Content node has no recognizable properties: ${JSON.stringify(
              node
            )}`,
            version,
            book: verse.book,
            chapter: verse.chapter,
            verse: verse.verse,
          });
        }
      }
    }
  }
}
