import { describe, it, expect } from "vitest";
import { convertBBToGraphai } from "../functions/convertBBToGraphai";
import { convertGraphaiToBB } from "../functions/convertGraphaiToBB";
import webpSamples from "./fixtures/webp-samples.json";

describe("Round-trip conversion", () => {
  it("should round-trip WEBP verses correctly", () => {
    for (const sample of webpSamples) {
      const graphai = convertBBToGraphai(sample);
      const bb = convertGraphaiToBB(graphai);

      // Only compare the BB fields, omitting undefined
      const originalBB: any = { text: sample.text };
      if (sample.paragraphs) originalBB.paragraphs = sample.paragraphs;
      if (sample.footnotes) originalBB.footnotes = sample.footnotes;

      expect(bb).toEqual(originalBB);
    }
  });
});
