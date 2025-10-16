import { describe, it, expect, vi } from "vitest";
import { discoverVersions } from "../versionDiscovery";
import { readdirSync, statSync } from "fs";

// Mock fs module
vi.mock("fs", () => ({
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

describe("discoverVersions", () => {
  const mockReaddirSync = vi.mocked(readdirSync);
  const mockStatSync = vi.mocked(statSync);

  it("should return sorted list of version directories", () => {
    mockReaddirSync.mockReturnValue([
      "bible-versions.json",
      "bible-verses-schema.json",
      "asv",
      "kjv",
      "byz",
      "webus2020",
      "vul",
      "ylt",
      "bible-versions-schema.json",
    ] as any);

    // Mock statSync to return directory for version folders and file for others
    mockStatSync.mockImplementation(
      (path: any) =>
        ({
          isDirectory: () => !path.includes(".json"),
        } as any)
    );

    const result = discoverVersions("./bible-versions");

    expect(result).toEqual(["asv", "byz", "kjv", "vul", "webus2020", "ylt"]);
    expect(mockReaddirSync).toHaveBeenCalledWith("./bible-versions");
  });

  it("should handle empty directory", () => {
    mockReaddirSync.mockReturnValue([] as any);

    const result = discoverVersions("./bible-versions");

    expect(result).toEqual([]);
  });

  it("should handle directory with only files", () => {
    mockReaddirSync.mockReturnValue([
      "bible-versions.json",
      "bible-verses-schema.json",
      "bible-versions-schema.json",
    ] as any);

    mockStatSync.mockImplementation(
      () =>
        ({
          isDirectory: () => false,
        } as any)
    );

    const result = discoverVersions("./bible-versions");

    expect(result).toEqual([]);
  });

  it("should throw error when directory doesn't exist", () => {
    mockReaddirSync.mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    expect(() => discoverVersions("./nonexistent")).toThrow(
      "Failed to discover versions in ./nonexistent: Error: ENOENT: no such file or directory"
    );
  });

  it("should use default path when no path provided", () => {
    mockReaddirSync.mockReturnValue(["asv", "kjv"] as any);
    mockStatSync.mockImplementation(
      () =>
        ({
          isDirectory: () => true,
        } as any)
    );

    discoverVersions();

    expect(mockReaddirSync).toHaveBeenCalledWith("./bible-versions");
  });
});
