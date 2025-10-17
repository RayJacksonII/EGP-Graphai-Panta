import { describe, it, expect } from "vitest";
import convertFromBB from "../convertFromBB";

describe("convertFromBB", () => {
  it("should convert basic Greek text with Strong's numbers", () => {
    const input = '[greek]Καὶ[/greek] [strongs id="g2532" m="CONJ" /]';
    const result = convertFromBB(input);

    expect(result).toEqual([
      {
        text: "Καὶ",
        script: "G",
        strong: "G2532",
        morph: "CONJ",
      },
    ]);
  });

  it("should convert standalone Greek text", () => {
    const input = "[greek]Καὶ[/greek]";
    const result = convertFromBB(input);

    expect(result).toEqual([
      {
        text: "Καὶ",
        script: "G",
      },
    ]);
  });

  it("should handle mixed content with Greek and Strong's", () => {
    const input =
      '[greek]Καὶ[/greek] [strongs id="g2532" m="CONJ" /] [greek]ἐκ[/greek] [strongs id="g1537" m="PREP" /]';
    const result = convertFromBB(input);

    expect(result).toEqual([
      {
        text: "Καὶ",
        script: "G",
        strong: "G2532",
        morph: "CONJ",
      },
      {
        text: "ἐκ",
        script: "G",
        strong: "G1537",
        morph: "PREP",
      },
    ]);
  });

  it("should handle plain text without markup", () => {
    const input = "Hello world";
    const result = convertFromBB(input);

    expect(result).toEqual([
      {
        text: "Hello world",
      },
    ]);
  });

  it("should handle footnotes with Greek text", () => {
    const input = "[greek]Καὶ[/greek]°";
    const footnotes = [
      { type: "var", text: "N [greek]Καὶ ἐκ[/greek] ⇒ [greek]Ὅτι ἐκ[/greek]" },
    ];
    const result = convertFromBB(input, footnotes);

    expect(result).toEqual([
      {
        text: "Καὶ",
        script: "G",
        foot: {
          type: "var",
          content: [
            { text: "N" },
            { text: "Καὶ ἐκ", script: "G" },
            { text: "⇒" },
            { text: "Ὅτι ἐκ", script: "G" },
          ],
        },
      },
    ]);
  });

  it("should handle multiple footnotes", () => {
    const input = "[greek]Καὶ[/greek]° [greek]ἐκ[/greek]°";
    const footnotes = [
      { type: "var", text: "Variant 1" },
      { type: "trn", text: "Translation note" },
    ];
    const result = convertFromBB(input, footnotes);

    expect(result).toEqual([
      {
        text: "Καὶ",
        script: "G",
        foot: {
          type: "var",
          content: [{ text: "Variant 1" }],
        },
      },
      {
        text: "ἐκ",
        script: "G",
        foot: {
          type: "trn",
          content: [{ text: "Translation note" }],
        },
      },
    ]);
  });

  it("should handle line breaks", () => {
    const input = "[greek]Καὶ[/greek]\n[greek]ἐκ[/greek]";
    const result = convertFromBB(input);

    expect(result).toEqual([
      {
        text: "Καὶ",
        script: "G",
      },
      { type: "n" },
      {
        text: "ἐκ",
        script: "G",
      },
    ]);
  });

  it("should handle empty input", () => {
    const result = convertFromBB("");
    expect(result).toEqual([]);
  });

  it("should handle complex footnotes with mixed content", () => {
    const input = "[greek]Καὶ[/greek]°";
    const footnotes = [
      {
        type: "var",
        text: 'Some text [greek]γὰρ[/greek] more text. [strongs id="g1063" m="CONJ" /]',
      },
    ];
    const result = convertFromBB(input, footnotes);

    expect(result).toEqual([
      {
        text: "Καὶ",
        script: "G",
        foot: {
          type: "var",
          content: [
            { text: "Some text" },
            { text: "γὰρ", script: "G" },
            { text: "more text.", morph: "CONJ", strong: "G1063" },
          ],
        },
      },
    ]);
  });

  it("should handle different footnote types", () => {
    const input = "[greek]Καὶ[/greek]°";
    const footnotes = [{ type: "map", text: "Map reference" }];
    const result = convertFromBB(input, footnotes);

    expect(result).toEqual([
      {
        text: "Καὶ",
        script: "G",
        foot: {
          type: "map",
          content: [{ text: "Map reference" }],
        },
      },
    ]);
  });

  it("should handle malformed BBCode gracefully", () => {
    const input = '[greek]Unclosed greek text [strong id="g123" m="NOUN" /]';
    const result = convertFromBB(input);

    expect(result).toEqual([
      {
        text: '[greek]Unclosed greek text [strong id="g123" m="NOUN" /]',
      },
    ]);
  });

  it("should handle Strong's tags without preceding Greek text", () => {
    const input = 'Some text [strongs id="g123" m="NOUN" /] more text';
    const result = convertFromBB(input);

    expect(result).toEqual([
      {
        text: "Some text",
        morph: "NOUN",
        strong: "G123",
      },
      { text: "more text" },
    ]);
  });

  it("should preserve whitespace and punctuation", () => {
    const input = "[greek]Καὶ,[/greek] [greek]ἐκ[/greek]!";
    const result = convertFromBB(input);

    expect(result).toEqual([
      {
        text: "Καὶ,",
        script: "G",
      },
      {
        text: "ἐκ",
        script: "G",
      },
      {
        text: "!",
      },
    ]);
  });

  it("should parse Strong's numbers and TVM data correctly for KJV-style markup", () => {
    const input =
      'In the beginning [strongs id="h7225" /] God [strongs id="h0430" /] created [strongs id="h1254" tvm="8804" /] [strongs id="h0853" /] the heaven [strongs id="h8064" /] and [strongs id="h0853" /] the earth [strongs id="h0776" /].';

    const expected = [
      {
        text: "In the beginning",
        strong: "H7225",
      },
      {
        text: "God",
        strong: "H0430",
      },
      {
        text: "created",
        strong: "H1254",
        morph: "8804",
      },
      {
        strong: "H0853",
      },
      {
        text: "the heaven",
        strong: "H8064",
      },
      {
        text: "and",
        strong: "H0853",
      },
      {
        text: "the earth",
        strong: "H0776",
      },
      {
        text: ".",
      },
    ];

    const result = convertFromBB(input);
    expect(result).toEqual(expected);
  });
});
