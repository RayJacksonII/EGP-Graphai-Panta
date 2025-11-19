import { describe, it, expect } from "vitest";
import { convertBBToGraphai } from "../convertBBToGraphai";

describe("convertBBToGraphai", () => {
  describe("KJVS Strong's tags", () => {
    it("should normalize Strong's numbers to uppercase without zero-padding", () => {
      const bb = {
        text: 'the beginning [strongs id="g0746" /]',
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([{ text: "the beginning", strong: "G746" }]);
    });

    it("should parse Strong's tags without leading zeros", () => {
      const bb = {
        text: 'the Word [strongs id="g3056" /]',
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([{ text: "the Word", strong: "G3056" }]);
    });

    it("should parse TVM attributes for Greek Strong's", () => {
      const bb = {
        text: 'was [strongs id="g2258" tvm="ImpfInd" /]',
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([
        { text: "was", strong: "G2258", morph: "ImpfInd" },
      ]);
    });

    it("should parse TVM attributes for Hebrew Strong's", () => {
      const bb = {
        text: 'sang [strongs id="h7891" tvm="8804" /]',
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([
        { text: "sang", strong: "H7891", morph: "8804" },
      ]);
    });

    it("should handle TVM2 attribute with slash separator", () => {
      const bb = {
        text: 'word [strongs id="g0373" tvm="PresMidInd" tvm2="PresMidImpr" /]',
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([
        { text: "word", strong: "G373", morph: "PresMidInd/PresMidImpr" },
      ]);
    });

    it("should treat supplied words in brackets as literal text", () => {
      const bb = {
        text: "whose name [was] John",
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual(["whose name [was] John"]);
    });

    it("should merge bracketed text with following Strong's tagged text", () => {
      const bb = {
        text: 'Now these [are] the generations [strongs id="h8435" /]',
        paragraphs: [0],
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([
        {
          text: "Now these [are] the generations",
          strong: "H8435",
          paragraph: true,
        },
      ]);
    });

    it("should merge bracketed text with Strong's having empty text", () => {
      const bb = {
        text: 'of Siddim [strongs id="h7708" /] [was full of] [strongs id="h0875" /] slimepits',
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([
        { text: "of Siddim", strong: "H7708" },
        { text: " [was full of]", strong: "H875" },
        " slimepits",
      ]);
    });

    it("should convert John 1:26 KJVS with TVM2 morphology", () => {
      const bb = {
        text: 'John [strongs id="g2491" /] answered [strongs id="g0611" m="AorMidDepInd" /] them [strongs id="g0846" /], saying [strongs id="g3004" m="PresActPtc" /], I [strongs id="g1473" /] baptize [strongs id="g0907" m="PresActInd" /] with [strongs id="g1722" /] water [strongs id="g5204" /]: but [strongs id="g1161" /] there standeth one [strongs id="g2476" tvm="ImpfActInd" tvm2="PerfActInd" /] among [strongs id="g3319" /] you [strongs id="g5216" /], whom [strongs id="g3739" /] ye [strongs id="g5210" /] know [strongs id="g1492" m="PerfActInd" /] not [strongs id="g3756" /];',
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([
        { text: "John", strong: "G2491" },
        { text: " answered", strong: "G611", morph: "AorMidDepInd" },
        { text: " them", strong: "G846" },
        { text: ", saying", strong: "G3004", morph: "PresActPtc" },
        { text: ", I", strong: "G1473" },
        { text: " baptize", strong: "G907", morph: "PresActInd" },
        { text: " with", strong: "G1722" },
        { text: " water", strong: "G5204" },
        { text: ": but", strong: "G1161" },
        {
          text: " there standeth one",
          strong: "G2476",
          morph: "ImpfActInd/PerfActInd",
        },
        { text: " among", strong: "G3319" },
        { text: " you", strong: "G5216" },
        { text: ", whom", strong: "G3739" },
        { text: " ye", strong: "G5210" },
        { text: " know", strong: "G1492", morph: "PerfActInd" },
        { text: " not", strong: "G3756" },
        ";",
      ]);
    });
  });

  describe("BYZ Greek text tags", () => {
    it("should parse Greek text tags", () => {
      const bb = {
        text: "[greek]Οὗτος[/greek]",
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([{ text: "Οὗτος", script: "G" }]);
    });

    it("should preserve punctuation inside Greek tags", () => {
      const bb = {
        text: "[greek]λόγος,[/greek]",
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([{ text: "λόγος,", script: "G" }]);
    });

    it("should parse morphology codes from m attribute", () => {
      const bb = {
        text: 'word [strongs id="g3056" m="N-NSM" /]',
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([
        { text: "word", strong: "G3056", morph: "N-NSM" },
      ]);
    });

    it("should handle Greek text and Strong's as separate elements", () => {
      const bb = {
        text: '[greek]λόγος[/greek] [strongs id="g3056" m="N-NSM" /]',
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([
        { text: "λόγος", script: "G", strong: "G3056", morph: "N-NSM" },
      ]);
    });

    it("should handle consecutive Strong's tags", () => {
      const bb = {
        text: 'text [strongs id="h1121" /] [strongs id="h1145" /] more',
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([
        { text: "text", strong: "H1121" },
        { text: "", strong: "H1145" },
        " more",
      ]);
    });
  });

  describe("Footnotes", () => {
    it("should parse simple footnote content as string", () => {
      const bb = {
        text: "text°",
        footnotes: [
          {
            type: "var",
            text: "N 14.24--26 ⇒ ~",
          },
        ],
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([
        {
          text: "text",
          foot: {
            type: "var",
            content: "N 14.24--26 ⇒ ~",
          },
        },
      ]);
    });

    it("should parse footnote content with Greek tags inside brackets", () => {
      const bb = {
        text: "text°",
        footnotes: [
          {
            type: "var",
            text: "N [greek]καὶ[/greek] ⇒ [[greek]καὶ[/greek]]",
          },
        ],
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([
        {
          text: "text",
          foot: {
            type: "var",
            content: [
              "N ",
              { text: "καὶ", script: "G" },
              " ⇒ [",
              { text: "καὶ", script: "G" },
              "]",
            ],
          },
        },
      ]);
    });
  });

  describe("Structural Features", () => {
    describe("Paragraphs", () => {
      it("should handle paragraph position 0", () => {
        const bb = {
          text: "In the beginning was the Word",
          paragraphs: [0],
        };
        const graphai = convertBBToGraphai(bb);
        expect(graphai).toEqual([
          { text: "In the beginning was the Word", paragraph: true },
        ]);
      });

      it("should handle non-zero paragraph positions", () => {
        const bb = {
          text: "First sentence. Second sentence.",
          paragraphs: [0, 15],
        };
        const graphai = convertBBToGraphai(bb);
        expect(graphai).toEqual([
          { text: "First sentence.", paragraph: true },
          { text: "Second sentence.", paragraph: true },
        ]);
      });

      it("should handle line breaks", () => {
        const bb = {
          text: "First line\nSecond line",
        };
        const graphai = convertBBToGraphai(bb);
        expect(graphai).toEqual([
          { text: "First line", break: true },
          "Second line",
        ]);
      });
    });
  });

  describe("Verse References", () => {
    it("should convert [verse] tags to footnotes (Mark 4:41 example)", () => {
      const bb = {
        text: "[verse]4:40[/verse] et timuerunt magno timore et dicebant ad alterutrum quis putas est iste quia et ventus et mare oboediunt ei",
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([
        {
          text: "",
          foot: {
            type: "var",
            content: "Originally verse 4:40.",
          },
        },
        "et timuerunt magno timore et dicebant ad alterutrum quis putas est iste quia et ventus et mare oboediunt ei",
      ]);
    });

    it("should handle multiple verse references (Rev 13:1 example)", () => {
      const bb = {
        text: "[verse]12:17[/verse] et stetit super harenam maris [verse]13:1[/verse] et vidi de mare bestiam ascendentem habentem capita septem et cornua decem et super cornua eius decem diademata et super capita eius nomina blasphemiae",
        paragraphs: [0],
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([
        {
          text: "",
          foot: {
            type: "var",
            content: "Originally verse 12:17.",
          },
          paragraph: true,
        },
        {
          text: "et stetit super harenam maris ",
          foot: {
            type: "var",
            content: "Originally verse 13:1.",
          },
        },
        "et vidi de mare bestiam ascendentem habentem capita septem et cornua decem et super cornua eius decem diademata et super capita eius nomina blasphemiae",
      ]);
    });
  });
});
