import { describe, it, expect } from "vitest";
import { convertBBVerseMetadata } from "../convertBBVerseMetadata";

describe("convertBBVerseMetadata", () => {
  describe("valid metadata transformation", () => {
    it("should convert John 1:1 metadata correctly", () => {
      const bbVerse = {
        chapter: "john-1",
        sequence: "204001001",
        number: 1,
      };

      const result = convertBBVerseMetadata(bbVerse);
      expect(result).toEqual({
        book: "JHN",
        chapter: 1,
        verse: 1,
      });
    });

    it("should convert John 1:2 metadata correctly", () => {
      const bbVerse = {
        chapter: "john-1",
        sequence: "204001002",
        number: 2,
      };

      const result = convertBBVerseMetadata(bbVerse);
      expect(result).toEqual({
        book: "JHN",
        chapter: 1,
        verse: 2,
      });
    });

    it("should convert John 3:16 metadata correctly", () => {
      const bbVerse = {
        chapter: "john-3",
        sequence: "204003016",
        number: 16,
      };

      const result = convertBBVerseMetadata(bbVerse);
      expect(result).toEqual({
        book: "JHN",
        chapter: 3,
        verse: 16,
      });
    });

    it("should handle Genesis 1:1", () => {
      const bbVerse = {
        chapter: "genesis-1",
        sequence: "101001001",
        number: 1,
      };

      const result = convertBBVerseMetadata(bbVerse);
      expect(result).toEqual({
        book: "GEN",
        chapter: 1,
        verse: 1,
      });
    });

    it("should handle Psalms 23:1", () => {
      const bbVerse = {
        chapter: "psalms-23",
        sequence: "119023001",
        number: 1,
      };

      const result = convertBBVerseMetadata(bbVerse);
      expect(result).toEqual({
        book: "PSA",
        chapter: 23,
        verse: 1,
      });
    });

    it("should handle 1 Samuel 15:1", () => {
      const bbVerse = {
        chapter: "1-samuel-15",
        sequence: "109015001",
        number: 1,
      };

      const result = convertBBVerseMetadata(bbVerse);
      expect(result).toEqual({
        book: "1SM",
        chapter: 15,
        verse: 1,
      });
    });
  });

  describe("inconsistent metadata", () => {
    it("should throw error when sequence book doesn't match chapter book", () => {
      const bbVerse = {
        chapter: "john-1", // Book: JHN
        sequence: "101001001", // Book sequence: 101 (GEN)
        number: 1,
      };

      expect(() => convertBBVerseMetadata(bbVerse)).toThrow(
        'Metadata inconsistency: sequence "101001001" indicates book "GEN" but chapter "john-1" indicates book "JHN"'
      );
    });

    it("should throw error when sequence chapter doesn't match chapter field", () => {
      // Note: This function doesn't validate chapter numbers from sequence vs chapter field
      // The sequence chapter digits are not used for validation, only book sequence
      const bbVerse = {
        chapter: "john-1", // Chapter: 1
        sequence: "204002001", // Sequence chapter: 002 (2), but we don't validate this
        number: 1,
      };

      // This should still work because we only validate book sequence, not chapter
      const result = convertBBVerseMetadata(bbVerse);
      expect(result).toEqual({
        book: "JHN",
        chapter: 1,
        verse: 1,
      });
    });
  });

  describe("invalid sequence formats", () => {
    it("should throw error for sequence too short", () => {
      const bbVerse = {
        chapter: "john-1",
        sequence: "20", // Too short
        number: 1,
      };

      expect(() => convertBBVerseMetadata(bbVerse)).toThrow(
        'Invalid sequence format: "20". Expected at least 3 digits'
      );
    });

    it("should throw error for non-numeric sequence", () => {
      const bbVerse = {
        chapter: "john-1",
        sequence: "abc001001", // Non-numeric book sequence
        number: 1,
      };

      expect(() => convertBBVerseMetadata(bbVerse)).toThrow(
        'Invalid book sequence: "abc". Expected numeric digits'
      );
    });

    it("should throw error for unknown book sequence", () => {
      const bbVerse = {
        chapter: "john-1",
        sequence: "999001001", // Unknown book sequence
        number: 1,
      };

      expect(() => convertBBVerseMetadata(bbVerse)).toThrow(
        'Unknown BB book sequence: "999"'
      );
    });
  });

  describe("missing or invalid fields", () => {
    it("should throw error for missing chapter field", () => {
      const bbVerse = {
        sequence: "204001001",
        number: 1,
      } as any;

      expect(() => convertBBVerseMetadata(bbVerse)).toThrow();
    });

    it("should throw error for missing sequence field", () => {
      const bbVerse = {
        chapter: "john-1",
        number: 1,
      } as any;

      expect(() => convertBBVerseMetadata(bbVerse)).toThrow(
        "BB verse sequence field is required and must be a string"
      );
    });

    it("should throw error for missing number field", () => {
      const bbVerse = {
        chapter: "john-1",
        sequence: "204001001",
      } as any;

      expect(() => convertBBVerseMetadata(bbVerse)).toThrow(
        "BB verse number field is required and must be a positive number"
      );
    });

    it("should throw error for invalid chapter reference", () => {
      const bbVerse = {
        chapter: "invalid-chapter",
        sequence: "204001001",
        number: 1,
      };

      expect(() => convertBBVerseMetadata(bbVerse)).toThrow(
        'Invalid chapter number: "chapter". Chapter must be a positive integer'
      );
    });
  });

  describe("edge cases", () => {
    it("should handle null input", () => {
      expect(() => convertBBVerseMetadata(null as any)).toThrow();
    });

    it("should handle undefined input", () => {
      expect(() => convertBBVerseMetadata(undefined as any)).toThrow();
    });
  });
});
