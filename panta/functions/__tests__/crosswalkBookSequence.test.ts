import { describe, it, expect } from "vitest";
import { crosswalkBookSequence } from "../crosswalkBookSequence";

describe("crosswalkBookSequence", () => {
  describe("Old Testament sequences", () => {
    it("should map '101' to Genesis", () => {
      expect(crosswalkBookSequence("101")).toEqual({ _id: "GEN", order: 1 });
    });

    it("should map '119' to Psalms", () => {
      expect(crosswalkBookSequence("119")).toEqual({ _id: "PSA", order: 19 });
    });

    it("should map '139' to Malachi", () => {
      expect(crosswalkBookSequence("139")).toEqual({ _id: "MAL", order: 39 });
    });

    it("should map first OT book '101' correctly", () => {
      expect(crosswalkBookSequence("101")).toEqual({ _id: "GEN", order: 1 });
    });

    it("should map last OT book '139' correctly", () => {
      expect(crosswalkBookSequence("139")).toEqual({ _id: "MAL", order: 39 });
    });
  });

  describe("New Testament sequences", () => {
    it("should map '201' to Matthew", () => {
      expect(crosswalkBookSequence("201")).toEqual({ _id: "MAT", order: 40 });
    });

    it("should map '204' to John", () => {
      expect(crosswalkBookSequence("204")).toEqual({ _id: "JHN", order: 43 });
    });

    it("should map '227' to Revelation", () => {
      expect(crosswalkBookSequence("227")).toEqual({ _id: "REV", order: 66 });
    });

    it("should map first NT book '201' correctly", () => {
      expect(crosswalkBookSequence("201")).toEqual({ _id: "MAT", order: 40 });
    });

    it("should map last NT book '227' correctly", () => {
      expect(crosswalkBookSequence("227")).toEqual({ _id: "REV", order: 66 });
    });
  });

  describe("order calculation", () => {
    it("should calculate OT orders correctly (101-139 → 1-39)", () => {
      expect(crosswalkBookSequence("101").order).toBe(1);
      expect(crosswalkBookSequence("110").order).toBe(10);
      expect(crosswalkBookSequence("139").order).toBe(39);
    });

    it("should calculate NT orders correctly (201-227 → 40-66)", () => {
      expect(crosswalkBookSequence("201").order).toBe(40);
      expect(crosswalkBookSequence("210").order).toBe(49);
      expect(crosswalkBookSequence("227").order).toBe(66);
    });
  });

  describe("invalid sequences", () => {
    it("should throw error for unmapped sequence '000'", () => {
      expect(() => crosswalkBookSequence("000")).toThrow(
        'Unknown BB book sequence: "000"'
      );
    });

    it("should throw error for unmapped sequence '100'", () => {
      expect(() => crosswalkBookSequence("100")).toThrow(
        'Unknown BB book sequence: "100"'
      );
    });

    it("should throw error for unmapped sequence '300'", () => {
      expect(() => crosswalkBookSequence("300")).toThrow(
        'Unknown BB book sequence: "300"'
      );
    });

    it("should throw error for out of range OT sequence '140'", () => {
      expect(() => crosswalkBookSequence("140")).toThrow(
        'Unknown BB book sequence: "140"'
      );
    });

    it("should throw error for out of range NT sequence '228'", () => {
      expect(() => crosswalkBookSequence("228")).toThrow(
        'Unknown BB book sequence: "228"'
      );
    });

    it("should throw error for non-numeric string 'abc'", () => {
      expect(() => crosswalkBookSequence("abc")).toThrow(
        'Unknown BB book sequence: "abc"'
      );
    });

    it("should throw error for empty string", () => {
      expect(() => crosswalkBookSequence("")).toThrow(
        'Unknown BB book sequence: ""'
      );
    });

    it("should throw error for wrong length string '12'", () => {
      expect(() => crosswalkBookSequence("12")).toThrow(
        'Unknown BB book sequence: "12"'
      );
    });

    it("should throw error for wrong length string '1234'", () => {
      expect(() => crosswalkBookSequence("1234")).toThrow(
        'Unknown BB book sequence: "1234"'
      );
    });

    it("should include supported ranges in error message", () => {
      expect(() => crosswalkBookSequence("999")).toThrow(
        /Supported sequences: 101-139 \(OT\), 201-227 \(NT\)/
      );
    });
  });

  describe("edge cases", () => {
    it("should handle null input", () => {
      expect(() => crosswalkBookSequence(null as any)).toThrow();
    });

    it("should handle undefined input", () => {
      expect(() => crosswalkBookSequence(undefined as any)).toThrow();
    });
  });
});
