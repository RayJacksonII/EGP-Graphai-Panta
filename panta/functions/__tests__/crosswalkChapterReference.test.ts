import { describe, it, expect } from "vitest";
import { crosswalkChapterReference } from "../crosswalkChapterReference";

describe("crosswalkChapterReference", () => {
  describe("simple book names", () => {
    it("should parse 'genesis-1' correctly", () => {
      expect(crosswalkChapterReference("genesis-1")).toEqual({
        bookId: "GEN",
        chapter: 1,
      });
    });

    it("should parse 'john-3' correctly", () => {
      expect(crosswalkChapterReference("john-3")).toEqual({
        bookId: "JHN",
        chapter: 3,
      });
    });

    it("should parse 'psalms-23' correctly", () => {
      expect(crosswalkChapterReference("psalms-23")).toEqual({
        bookId: "PSA",
        chapter: 23,
      });
    });

    it("should parse 'psalm-23' correctly (singular form)", () => {
      expect(crosswalkChapterReference("psalm-23")).toEqual({
        bookId: "PSA",
        chapter: 23,
      });
    });
  });

  describe("numbered books", () => {
    it("should parse '1-samuel-15' correctly", () => {
      expect(crosswalkChapterReference("1-samuel-15")).toEqual({
        bookId: "1SM",
        chapter: 15,
      });
    });

    it("should parse '2-kings-10' correctly", () => {
      expect(crosswalkChapterReference("2-kings-10")).toEqual({
        bookId: "2KG",
        chapter: 10,
      });
    });

    it("should parse '1-john-2' correctly", () => {
      expect(crosswalkChapterReference("1-john-2")).toEqual({
        bookId: "1JN",
        chapter: 2,
      });
    });

    it("should parse '1-corinthians-13' correctly", () => {
      expect(crosswalkChapterReference("1-corinthians-13")).toEqual({
        bookId: "1CO",
        chapter: 13,
      });
    });
  });

  describe("multi-word books", () => {
    it("should parse 'song-of-solomon-1' correctly", () => {
      expect(crosswalkChapterReference("song-of-solomon-1")).toEqual({
        bookId: "SOS",
        chapter: 1,
      });
    });

    it("should parse 'song-of-songs-1' correctly (alternative name)", () => {
      expect(crosswalkChapterReference("song-of-songs-1")).toEqual({
        bookId: "SOS",
        chapter: 1,
      });
    });

    it("should parse '1-chronicles-5' correctly", () => {
      expect(crosswalkChapterReference("1-chronicles-5")).toEqual({
        bookId: "1CH",
        chapter: 5,
      });
    });
  });

  describe("chapter number validation", () => {
    it("should accept large chapter numbers", () => {
      expect(crosswalkChapterReference("psalms-150")).toEqual({
        bookId: "PSA",
        chapter: 150,
      });
    });

    it("should reject zero chapter number", () => {
      expect(() => crosswalkChapterReference("genesis-0")).toThrow(
        'Invalid chapter number: "0". Chapter must be a positive integer'
      );
    });

    it("should reject non-numeric chapter", () => {
      expect(() => crosswalkChapterReference("genesis-abc")).toThrow(
        'Invalid chapter number: "abc". Chapter must be a positive integer'
      );
    });
  });

  describe("invalid formats", () => {
    it("should reject reference with no hyphen", () => {
      expect(() => crosswalkChapterReference("genesis1")).toThrow(
        'Invalid chapter reference format: "genesis1". Expected format: "book-chapter"'
      );
    });

    it("should reject reference with only one part", () => {
      expect(() => crosswalkChapterReference("genesis")).toThrow(
        "Invalid chapter reference format"
      );
    });

    it("should reject empty string", () => {
      expect(() => crosswalkChapterReference("")).toThrow(
        "Invalid chapter reference format"
      );
    });

    it("should reject reference ending with hyphen", () => {
      expect(() => crosswalkChapterReference("genesis-")).toThrow(
        "Invalid chapter number"
      );
    });
  });

  describe("unknown book slugs", () => {
    it("should reject unknown book slug", () => {
      expect(() => crosswalkChapterReference("unknown-1")).toThrow(
        'Unknown book slug: "unknown"'
      );
    });

    it("should reject misspelled book name", () => {
      expect(() => crosswalkChapterReference("genisis-1")).toThrow(
        'Unknown book slug: "genisis"'
      );
    });

    it("should reject book with wrong numbering", () => {
      expect(() => crosswalkChapterReference("3-samuel-1")).toThrow(
        'Unknown book slug: "3-samuel"'
      );
    });
  });

  describe("edge cases", () => {
    it("should handle null input", () => {
      expect(() => crosswalkChapterReference(null as any)).toThrow();
    });

    it("should handle undefined input", () => {
      expect(() => crosswalkChapterReference(undefined as any)).toThrow();
    });

    it("should handle multiple hyphens in book name", () => {
      expect(crosswalkChapterReference("song-of-solomon-8")).toEqual({
        bookId: "SOS",
        chapter: 8,
      });
    });
  });
});
