import { describe, it, expect } from "vitest";
import { crosswalkVersionID } from "../crosswalkVersionID";

describe("crosswalkVersionID", () => {
  describe("valid mappings", () => {
    it("should map 'asv' to 'ASV1901'", () => {
      expect(crosswalkVersionID("asv")).toBe("ASV1901");
    });

    it("should map 'byz' to 'BYZ2018'", () => {
      expect(crosswalkVersionID("byz")).toBe("BYZ2018");
    });

    it("should map 'clv' to 'CLV1880'", () => {
      expect(crosswalkVersionID("clv")).toBe("CLV1880");
    });

    it("should map 'kjv' to 'KJV1769'", () => {
      expect(crosswalkVersionID("kjv")).toBe("KJV1769");
    });

    it("should map 'webp' to 'WEBUS2020'", () => {
      expect(crosswalkVersionID("webp")).toBe("WEBUS2020");
    });

    it("should map 'ylt' to 'YLT1898'", () => {
      expect(crosswalkVersionID("ylt")).toBe("YLT1898");
    });
  });

  describe("case insensitivity", () => {
    it("should handle uppercase input", () => {
      expect(crosswalkVersionID("ASV")).toBe("ASV1901");
      expect(crosswalkVersionID("KJV")).toBe("KJV1769");
    });

    it("should handle mixed case input", () => {
      expect(crosswalkVersionID("AsV")).toBe("ASV1901");
      expect(crosswalkVersionID("KjV")).toBe("KJV1769");
      expect(crosswalkVersionID("WebP")).toBe("WEBUS2020");
    });
  });

  describe("invalid version IDs", () => {
    it("should throw error for unmapped version ID", () => {
      expect(() => crosswalkVersionID("nkjv")).toThrow(
        'Unknown BB version ID: "nkjv"'
      );
      expect(() => crosswalkVersionID("esv")).toThrow(
        'Unknown BB version ID: "esv"'
      );
      expect(() => crosswalkVersionID("niv")).toThrow(
        'Unknown BB version ID: "niv"'
      );
    });

    it("should include supported versions in error message", () => {
      expect(() => crosswalkVersionID("unknown")).toThrow(
        /Supported versions: asv, byz, clv, kjv, webp, ylt/
      );
    });
  });

  describe("edge cases", () => {
    it("should throw error for empty string", () => {
      expect(() => crosswalkVersionID("")).toThrow('Unknown BB version ID: ""');
    });

    it("should throw error for whitespace-only string", () => {
      expect(() => crosswalkVersionID("   ")).toThrow(
        'Unknown BB version ID: "   "'
      );
    });

    it("should throw error for null input", () => {
      // TypeScript will catch this at compile time, but let's test runtime behavior
      expect(() => crosswalkVersionID(null as any)).toThrow();
    });

    it("should throw error for undefined input", () => {
      // TypeScript will catch this at compile time, but let's test runtime behavior
      expect(() => crosswalkVersionID(undefined as any)).toThrow();
    });
  });
});
