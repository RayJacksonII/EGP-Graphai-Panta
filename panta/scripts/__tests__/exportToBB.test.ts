import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportToBB } from "../exportToBB";
import { discoverVersions } from "../../utils/versionDiscovery";
import { loadBookMetadata } from "../../utils/bookMetadata";

// Mock dependencies
vi.mock("../../utils/versionDiscovery", () => ({
  discoverVersions: vi.fn(),
}));

vi.mock("../../utils/bookMetadata", () => ({
  loadBookMetadata: vi.fn(),
}));

vi.mock("fs", () => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readdirSync: vi.fn(() => []),
  readFileSync: vi.fn(),
}));

describe("exportToBB", () => {
  const mockDiscoverVersions = vi.mocked(discoverVersions);
  const mockLoadBookMetadata = vi.mocked(loadBookMetadata);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should discover versions and load book metadata", async () => {
    mockDiscoverVersions.mockReturnValue(["kjv", "asv"]);
    mockLoadBookMetadata.mockReturnValue({
      books: [],
      byId: new Map(),
      byOrder: new Map(),
    });

    const result = await exportToBB({ verbose: false });

    expect(mockDiscoverVersions).toHaveBeenCalledWith("./bible-versions");
    expect(mockLoadBookMetadata).toHaveBeenCalledWith(
      "./bible-books/bible-books.json"
    );
    expect(result.success).toBe(true);
    expect(result.totalVersions).toBe(2);
    expect(result.processedVersions).toEqual(["kjv", "asv"]);
  });

  it("should use custom paths when provided", async () => {
    mockDiscoverVersions.mockReturnValue(["kjv"]);
    mockLoadBookMetadata.mockReturnValue({
      books: [],
      byId: new Map(),
      byOrder: new Map(),
    });

    const result = await exportToBB({
      versionsDir: "./custom-versions",
      booksPath: "./custom-books.json",
      verbose: false,
    });

    expect(mockDiscoverVersions).toHaveBeenCalledWith("./custom-versions");
    expect(mockLoadBookMetadata).toHaveBeenCalledWith("./custom-books.json");
  });

  it("should process only specified versions", async () => {
    mockDiscoverVersions.mockReturnValue(["kjv", "asv", "webus2020"]);
    mockLoadBookMetadata.mockReturnValue({
      books: [],
      byId: new Map(),
      byOrder: new Map(),
    });

    const result = await exportToBB({
      versions: ["kjv", "webus2020"],
      verbose: false,
    });

    expect(result.totalVersions).toBe(2);
    expect(result.processedVersions).toEqual(["kjv", "webus2020"]);
  });

  it("should handle errors gracefully", async () => {
    mockDiscoverVersions.mockImplementation(() => {
      throw new Error("Discovery failed");
    });

    const result = await exportToBB({ verbose: false });

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Export failed");
  });
});
