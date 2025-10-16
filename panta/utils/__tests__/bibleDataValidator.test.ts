import { describe, it, expect, vi, beforeEach } from "vitest";
import { BibleDataValidator } from "../bibleDataValidator";
import { readFileSync, existsSync, readdirSync } from "fs";
import { discoverVersions } from "../versionDiscovery";

// Mock fs module
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
}));

// Mock version discovery
vi.mock("../versionDiscovery", () => ({
  discoverVersions: vi.fn(),
}));

describe("BibleDataValidator", () => {
  const mockReadFileSync = vi.mocked(readFileSync);
  const mockExistsSync = vi.mocked(existsSync);
  const mockReaddirSync = vi.mocked(readdirSync);
  const mockDiscoverVersions = vi.mocked(discoverVersions);

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
  });

  describe("validate", () => {
    it("should validate successfully with correct data", async () => {
      // Mock file existence
      mockExistsSync.mockReturnValue(true);
      mockDiscoverVersions.mockReturnValue(["kjv"]);

      // Mock version metadata
      mockReadFileSync.mockImplementation((path: any) => {
        if (path.includes("bible-versions.json")) {
          return JSON.stringify([
            { _id: "kjv", name: "King James Version", license: "CC0-1.0" },
          ]);
        }
        if (path.includes("bible-books.json")) {
          return JSON.stringify([
            {
              _id: "Gen",
              name: "Genesis",
              testament: "OT",
              alt: ["Ge", "Gn", "Gen"],
              order: { protestant: 1, catholic: 1, lxx: 1, hebrew: 1 },
            },
          ]);
        }
        if (path.includes("Gen.json")) {
          return JSON.stringify([
            {
              book: "Gen",
              chapter: 1,
              verse: 1,
              content: [{ text: "In the beginning" }],
            },
          ]);
        }
        return "";
      });

      mockReaddirSync.mockImplementation((path: any) => {
        if (path.includes("kjv")) {
          return ["Gen.json"] as any;
        }
        return [] as any;
      });

      const validator = new BibleDataValidator();
      const result = await validator.validate();

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.totalVersions).toBe(1);
      expect(result.processedVersions).toEqual(["kjv"]);
    });

    it("should detect missing required files", async () => {
      mockExistsSync.mockReturnValue(false);

      const validator = new BibleDataValidator();
      const result = await validator.validate();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.message.includes("not found"))).toBe(
        true
      );
    });

    it("should detect unknown versions", async () => {
      mockExistsSync.mockReturnValue(true);
      mockDiscoverVersions.mockReturnValue(["kjv", "unknown"]);

      mockReadFileSync.mockImplementation((path: any) => {
        if (path.includes("bible-versions.json")) {
          return JSON.stringify([
            { _id: "kjv", name: "King James Version", license: "CC0-1.0" },
          ]);
        }
        if (path.includes("bible-books.json")) {
          return JSON.stringify([]);
        }
        return "";
      });

      mockReaddirSync.mockImplementation((path: any) => {
        return [] as any; // No book files to avoid parsing errors
      });

      const validator = new BibleDataValidator();
      const result = await validator.validate();

      expect(result.success).toBe(true); // Warnings don't fail validation
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.message.includes("unknown"))).toBe(
        true
      );
    });

    it("should detect missing version directories", async () => {
      mockExistsSync.mockReturnValue(true);
      mockDiscoverVersions.mockReturnValue(["kjv"]);

      mockReadFileSync.mockImplementation((path: any) => {
        if (path.includes("bible-versions.json")) {
          return JSON.stringify([
            { _id: "kjv", name: "King James Version", license: "CC0-1.0" },
            {
              _id: "asv",
              name: "American Standard Version",
              license: "CC0-1.0",
            },
          ]);
        }
        if (path.includes("bible-books.json")) {
          return JSON.stringify([]);
        }
        return "";
      });

      const validator = new BibleDataValidator();
      const result = await validator.validate();

      expect(result.success).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("directory not found"))
      ).toBe(true);
    });

    it("should validate verse structure", async () => {
      mockExistsSync.mockReturnValue(true);
      mockDiscoverVersions.mockReturnValue(["kjv"]);

      mockReadFileSync.mockImplementation((path: any) => {
        if (path.includes("bible-versions.json")) {
          return JSON.stringify([
            { _id: "kjv", name: "King James Version", license: "CC0-1.0" },
          ]);
        }
        if (path.includes("bible-books.json")) {
          return JSON.stringify([
            {
              _id: "Gen",
              name: "Genesis",
              testament: "OT",
              alt: ["Ge", "Gn", "Gen"],
              order: { protestant: 1, catholic: 1, lxx: 1, hebrew: 1 },
            },
          ]);
        }
        if (path.includes("Gen.json")) {
          return JSON.stringify([
            {
              book: "Gen",
              chapter: 1,
              verse: 1,
              content: [{ text: "In the beginning" }],
            },
            {
              book: "Invalid",
              chapter: 1,
              verse: 2,
              content: [{ text: "Invalid book" }],
            },
          ]);
        }
        return "";
      });

      mockReaddirSync.mockImplementation((path: any) => {
        if (path.includes("kjv")) {
          return ["Gen.json"] as any;
        }
        return [] as any;
      });

      const validator = new BibleDataValidator();
      const result = await validator.validate();

      expect(result.success).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("Unknown book"))
      ).toBe(true);
    });
  });
});
