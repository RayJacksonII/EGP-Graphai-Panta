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
        { strong: "H1145" },
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

    it("should handle paragraph markers correctly when spaces between Strong's tags are involved", () => {
      // Original text: " " (between strongs) + " " (before text) + "text"
      // Index of second space is 1.
      const bb = {
        text: '[strongs id="H1" /] [strongs id="H2" /] text',
        paragraphs: [39], // The space before "text"
      };

      const graphai = convertBBToGraphai(bb);

      // Expectation:
      // 1. [strongs H1]
      // 2. [strongs H2] (space between them removed by mergeScriptAndStrongs)
      // 3. Paragraph break at the space before "text"
      // 4. "text" starts new paragraph

      expect(graphai).toEqual([
        { strong: "H1" },
        { strong: "H2" },
        { text: "text", paragraph: true },
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

    it("should handle verses with only footnote markers", () => {
      const bb = {
        text: "°",
        footnotes: [
          {
            text: "Some Greek manuscripts add: “Two will be in the field: the one taken, and the other left.”",
          },
        ],
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([
        {
          foot: {
            type: "stu",
            content:
              "Some Greek manuscripts add: “Two will be in the field: the one taken, and the other left.”",
          },
        },
      ]);
    });

    it("should handle woc tag with leading/trailing spaces", () => {
      const bb = {
        text: " [red]But I told you that you have seen me, and yet you don’t believe. [/red]",
      };
      const graphai = convertBBToGraphai(bb);
      expect(graphai).toEqual([
        {
          text: "But I told you that you have seen me, and yet you don’t believe.",
          marks: ["woc"],
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

  describe("Subtitles", () => {
    it("should extract subtitle with Strong's tags as subtitle object", () => {
      const bb = {
        text: '«A Psalm [strongs id="h4210" /] of David [strongs id="h1732" /], when he fled [strongs id="h1272" tvm="8800" /] from [strongs id="h6440" /] Absalom [strongs id="h53" /] his son [strongs id="h1121" /].» LORD [strongs id="h3068" /], how are they increased [strongs id="h7231" tvm="8804" /] that trouble [strongs id="h6862" /] me!',
        paragraphs: [0],
      };

      const result = convertBBToGraphai(bb);

      expect(result).toEqual([
        {
          subtitle: [
            { text: "A Psalm", strong: "H4210" },
            { text: " of David", strong: "H1732" },
            { text: ", when he fled", strong: "H1272", morph: "8800" },
            { text: " from", strong: "H6440" },
            { text: " Absalom", strong: "H53" },
            { text: " his son", strong: "H1121" },
            ".",
          ],
        },
        { text: "LORD", strong: "H3068", paragraph: true },
        { text: ", how are they increased", strong: "H7231", morph: "8804" },
        { text: " that trouble", strong: "H6862" },
        " me!",
      ]);
    });

    it("should handle subtitle without Strong's tags", () => {
      const bb = {
        text: "«A Psalm of David.» LORD, how are they increased that trouble me!",
        paragraphs: [0],
      };

      const result = convertBBToGraphai(bb);

      expect(result).toEqual([
        {
          subtitle: "A Psalm of David.",
        },
        {
          text: "LORD, how are they increased that trouble me!",
          paragraph: true,
        },
      ]);
    });

    it("should handle verse without subtitle", () => {
      const bb = {
        text: 'In the beginning [strongs id="g1722" /] God [strongs id="g2316" /] created [strongs id="g2936" m="V-AAI-3S" /] the heaven [strongs id="g3772" /] and [strongs id="g2532" /] the earth [strongs id="g1093" /].',
        paragraphs: [0],
      };

      const result = convertBBToGraphai(bb);

      expect(result).toEqual([
        { text: "In the beginning", strong: "G1722", paragraph: true },
        { text: " God", strong: "G2316" },
        { text: " created", strong: "G2936", morph: "V-AAI-3S" },
        { text: " the heaven", strong: "G3772" },
        { text: " and", strong: "G2532" },
        { text: " the earth", strong: "G1093" },
        ".",
      ]);
    });
  });

  describe("Headings", () => {
    it("should handle heading and headingFootnote", () => {
      const bb = {
        text: "Lord,° you have been our dwelling place for all generations.",
        footnotes: [
          {
            type: "trn",
            text: "The word translated “Lord” is “Adonai.”",
          },
        ],
        paragraphs: [0],
        heading: "A Prayer by Moses, the man of God.°",
        headingFootnote: {
          type: "trn",
          text: "The Hebrew word rendered “God” is “[hebrew]אֱלֹהִ֑ים[/hebrew]” (Elohim).",
        },
      };

      const graphai = convertBBToGraphai(bb);

      // Expected output:
      // 1. Heading element (with footnote attached)
      // 2. Text element (with paragraph marker and its own footnote)
      expect(graphai).toEqual([
        {
          heading: {
            text: "A Prayer by Moses, the man of God.",
            foot: {
              type: "trn",
              content: [
                "The Hebrew word rendered “God” is “",
                {
                  text: "אֱלֹהִ֑ים",
                  script: "H",
                },
                "” (Elohim).",
              ],
            },
          },
        },
        {
          text: "Lord,",
          paragraph: true,
          foot: {
            type: "trn",
            content: "The word translated “Lord” is “Adonai.”",
          },
        },
        " you have been our dwelling place for all generations.",
      ]);
    });
  });
});
