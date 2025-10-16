import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loadBookMetadata,
  getBookById,
  getBookByOrder,
  getBookOrder,
  type BookMetadata,
} from "../bookMetadata";
import { readFileSync } from "fs";

// Mock fs module
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

describe("bookMetadata", () => {
  const mockReadFileSync = vi.mocked(readFileSync);

  const mockBooksData = [
    {
      _id: "Gen",
      name: "Genesis",
      testament: "OT",
      alt: ["Ge", "Gn", "Gen"],
      order: {
        protestant: 1,
        catholic: 1,
        lxx: 1,
        hebrew: 1,
      },
    },
    {
      _id: "Exod",
      name: "Exodus",
      testament: "OT",
      alt: ["Ex", "Exo", "Exod"],
      order: {
        protestant: 2,
        catholic: 2,
        lxx: 2,
        hebrew: 2,
      },
    },
    {
      _id: "Matt",
      name: "Matthew",
      testament: "NT",
      alt: ["Mt", "Matt"],
      order: {
        protestant: 40,
        catholic: 40,
        lxx: 40,
        hebrew: 40,
      },
    },
  ];

  describe("loadBookMetadata", () => {
    it("should load and parse book metadata correctly", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify(mockBooksData));

      const result = loadBookMetadata("./bible-books/bible-books.json");

      expect(result.books).toEqual(mockBooksData);
      expect(result.byId.get("Gen")).toEqual(mockBooksData[0]);
      expect(result.byId.get("Matt")).toEqual(mockBooksData[2]);
      expect(result.byOrder.get(1)).toEqual(mockBooksData[0]);
      expect(result.byOrder.get(40)).toEqual(mockBooksData[2]);
      expect(mockReadFileSync).toHaveBeenCalledWith(
        "./bible-books/bible-books.json",
        "utf-8"
      );
    });

    it("should use default path when no path provided", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify(mockBooksData));

      loadBookMetadata();

      expect(mockReadFileSync).toHaveBeenCalledWith(
        "./bible-books/bible-books.json",
        "utf-8"
      );
    });

    it("should throw error when file cannot be read", () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      expect(() => loadBookMetadata("./nonexistent.json")).toThrow(
        "Failed to load book metadata from ./nonexistent.json: Error: ENOENT: no such file or directory"
      );
    });

    it("should throw error when JSON is invalid", () => {
      mockReadFileSync.mockReturnValue("invalid json");

      expect(() => loadBookMetadata()).toThrow(
        "Failed to load book metadata from ./bible-books/bible-books.json: SyntaxError: Unexpected token 'i', \"invalid json\" is not valid JSON"
      );
    });
  });

  describe("getBookById", () => {
    let metadata: BookMetadata;

    beforeEach(() => {
      mockReadFileSync.mockReturnValue(JSON.stringify(mockBooksData));
      metadata = loadBookMetadata();
    });

    it("should return book when found by ID", () => {
      const result = getBookById(metadata, "Gen");
      expect(result).toEqual(mockBooksData[0]);
    });

    it("should return undefined when book not found", () => {
      const result = getBookById(metadata, "NonExistent");
      expect(result).toBeUndefined();
    });
  });

  describe("getBookByOrder", () => {
    let metadata: BookMetadata;

    beforeEach(() => {
      mockReadFileSync.mockReturnValue(JSON.stringify(mockBooksData));
      metadata = loadBookMetadata();
    });

    it("should return book when found by order", () => {
      const result = getBookByOrder(metadata, 1);
      expect(result).toEqual(mockBooksData[0]);
    });

    it("should return undefined when order not found", () => {
      const result = getBookByOrder(metadata, 99);
      expect(result).toBeUndefined();
    });
  });

  describe("getBookOrder", () => {
    let metadata: BookMetadata;

    beforeEach(() => {
      mockReadFileSync.mockReturnValue(JSON.stringify(mockBooksData));
      metadata = loadBookMetadata();
    });

    it("should return order when book found", () => {
      const result = getBookOrder(metadata, "Gen");
      expect(result).toBe(1);
    });

    it("should return undefined when book not found", () => {
      const result = getBookOrder(metadata, "NonExistent");
      expect(result).toBeUndefined();
    });
  });
});
