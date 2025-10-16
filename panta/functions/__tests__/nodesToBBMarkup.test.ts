import { describe, it, expect } from "vitest";
import nodesToBBMarkup from "../nodesToBBMarkup";
import Node from "../../../types/Node";
import Footnote from "../../../types/Footnote";

describe("nodesToBBMarkup", () => {
  it("should convert basic text node", () => {
    const nodes: Node[] = [{ text: "Hello world" }];
    expect(nodesToBBMarkup(nodes)).toBe("Hello world");
  });

  it("should convert text with Strong's number", () => {
    const nodes: Node[] = [{ text: "God", strong: "H0430" }];
    expect(nodesToBBMarkup(nodes)).toBe('God [strongs id="h0430" /]');
  });

  it("should convert text with Strong's number and morphology", () => {
    const nodes: Node[] = [
      { text: "created", strong: "H1254", morph: "V-AAI-3S" },
    ];
    expect(nodesToBBMarkup(nodes)).toBe(
      'created [strongs id="h1254" m="V-AAI-3S" /]'
    );
  });

  it("should convert Greek text", () => {
    const nodes: Node[] = [{ text: "Καὶ", script: "G" }];
    expect(nodesToBBMarkup(nodes)).toBe("[greek]Καὶ[/greek]");
  });

  it("should convert Greek text with Strong's number", () => {
    const nodes: Node[] = [
      { text: "Καὶ", script: "G", strong: "G2532", morph: "CONJ" },
    ];
    expect(nodesToBBMarkup(nodes)).toBe(
      '[greek]Καὶ[/greek] [strongs id="g2532" m="CONJ" /]'
    );
  });

  it("should handle paragraph breaks", () => {
    const nodes: Node[] = [
      { text: "First paragraph" },
      { type: "p" },
      { text: "Second paragraph" },
    ];
    expect(nodesToBBMarkup(nodes)).toBe("First paragraph¶ Second paragraph");
  });

  it("should handle line breaks", () => {
    const nodes: Node[] = [
      { text: "Line 1" },
      { type: "n" },
      { text: "Line 2" },
    ];
    expect(nodesToBBMarkup(nodes)).toBe("Line 1\nLine 2");
  });

  it("should handle formatting marks", () => {
    const nodes: Node[] = [
      { text: "Jesus", marks: ["woc"] },
      { text: "said", marks: ["sc"] },
    ];
    expect(nodesToBBMarkup(nodes)).toBe("[red]Jesus[/red] [sc]said[/sc]");
  });

  it("should handle footnotes by adding marker", () => {
    const footnote: Footnote = {
      type: "stu",
      content: [{ text: "Study note content" }],
    };

    const nodes: Node[] = [{ text: "word", foot: footnote }];
    // Footnote content is stored separately, only the ° marker appears in text
    expect(nodesToBBMarkup(nodes)).toBe("word°");
  });

  it("should handle multiple footnote markers", () => {
    const footnote1: Footnote = {
      type: "var",
      content: [{ text: "Variant reading" }],
    };

    const footnote2: Footnote = {
      type: "stu",
      content: [{ text: "Study note" }],
    };

    const nodes: Node[] = [
      { text: "word1", foot: footnote1 },
      { text: "word2", foot: footnote2 },
    ];
    expect(nodesToBBMarkup(nodes)).toBe("word1° word2°");
  });

  it("should handle Strong's only nodes", () => {
    const nodes: Node[] = [{ strong: "H0430" }];
    expect(nodesToBBMarkup(nodes)).toBe('[strongs id="h0430" /]');
  });

  it("should handle TVM format morphology", () => {
    const nodes: Node[] = [
      { text: "word", strong: "G1234", morph: "V-AAI-3S/V-AAI-3P" },
    ];
    expect(nodesToBBMarkup(nodes)).toBe(
      'word [strongs id="g1234" tvm="V-AAI-3S" tvm2="V-AAI-3P" /]'
    );
  });

  it("should handle multiple nodes", () => {
    const nodes: Node[] = [
      { text: "In the" },
      { text: "beginning", strong: "H7225" },
      { type: "p" },
      { text: "God", strong: "H0430" },
    ];
    expect(nodesToBBMarkup(nodes)).toBe(
      'In the beginning [strongs id="h7225" /]¶ God [strongs id="h0430" /]'
    );
  });

  it("should convert footnote content separately", () => {
    // Footnote content can be converted using nodesToBBMarkup directly
    const footnoteContent: Node[] = [
      { text: "N" },
      { text: "Καὶ ἐκ", script: "G" },
      { text: "⇒" },
      { text: "Ὅτι ἐκ", script: "G" },
    ];

    // Expected BB format for footnote text (from BibleDB.bibleVerses-byz.json Matt 1:5)
    const expected = "N [greek]Καὶ ἐκ[/greek] ⇒ [greek]Ὅτι ἐκ[/greek]";
    expect(nodesToBBMarkup(footnoteContent)).toBe(expected);
  });

  it("should handle empty node array", () => {
    expect(nodesToBBMarkup([])).toBe("");
  });

  it("should handle nodes with no text or strong", () => {
    const nodes: Node[] = [{ type: "p" }, { type: "n" }];
    expect(nodesToBBMarkup(nodes)).toBe("¶ \n");
  });

  // Real-world test cases from actual Bible data
  it("should convert real Genesis 1:1 KJV content (without paragraph marker)", () => {
    // Actual structured data from bible-versions/kjv/Gen.json verse 1 (excluding paragraph marker)
    const nodes: Node[] = [
      { text: "In the beginning", strong: "H7225" },
      { text: "God", strong: "H0430" },
      { text: "created", strong: "H1254", morph: "8804" },
      { strong: "H0853" },
      { text: "the heaven", strong: "H8064" },
      { text: "and", strong: "H0853" },
      { text: "the earth", strong: "H0776" },
      { text: "." },
    ];

    // Expected BB text from imports/bb/BibleDB.bibleVerses-kjv.json (Genesis 1:1)
    const expected =
      'In the beginning [strongs id="h7225" /] God [strongs id="h0430" /] created [strongs id="h1254" tvm="8804" /] [strongs id="h0853" /] the heaven [strongs id="h8064" /] and [strongs id="h0853" /] the earth [strongs id="h0776" /].';

    expect(nodesToBBMarkup(nodes)).toBe(expected);
  });

  it("should convert real Matthew 1:1 Byzantine Greek content (without paragraph marker)", () => {
    // Actual structured data from bible-versions/byz/Matt.json verse 1 (excluding paragraph marker)
    const nodes: Node[] = [
      { text: "Βίβλος", script: "G", strong: "G976", morph: "N-NSF" },
      { text: "γενέσεως", script: "G", strong: "G1078", morph: "N-GSF" },
      { text: "Ἰησοῦ", script: "G", strong: "G2424", morph: "N-GSM" },
      { text: "χριστοῦ,", script: "G", strong: "G5547", morph: "N-GSM" },
      { text: "υἱοῦ", script: "G", strong: "G5207", morph: "N-GSM" },
      { text: "Δαυίδ,", script: "G", strong: "G1138", morph: "N-PRI" },
      { text: "υἱοῦ", script: "G", strong: "G5207", morph: "N-GSM" },
      { text: "Ἀβραάμ.", script: "G", strong: "G11", morph: "N-PRI" },
    ];

    // Expected BB text from imports/bb/BibleDB.bibleVerses-byz.json (Matthew 1:1)
    const expected =
      '[greek]Βίβλος[/greek] [strongs id="g976" m="N-NSF" /] [greek]γενέσεως[/greek] [strongs id="g1078" m="N-GSF" /] [greek]Ἰησοῦ[/greek] [strongs id="g2424" m="N-GSM" /] [greek]χριστοῦ,[/greek] [strongs id="g5547" m="N-GSM" /] [greek]υἱοῦ[/greek] [strongs id="g5207" m="N-GSM" /] [greek]Δαυίδ,[/greek] [strongs id="g1138" m="N-PRI" /] [greek]υἱοῦ[/greek] [strongs id="g5207" m="N-GSM" /] [greek]Ἀβραάμ.[/greek] [strongs id="g11" m="N-PRI" /]';

    expect(nodesToBBMarkup(nodes)).toBe(expected);
  });

  it("should convert real 1 Kings 1:14 WEB with footnote marker", () => {
    // Note: In BB format, footnotes are stored separately in a footnotes array
    // The text just contains the ° marker to indicate footnote position
    // This test verifies that the footnote marker is properly placed
    const footnote: Footnote = {
      type: "trn",
      content: [
        {
          text: '"Behold", from "[hebrew]הִנֵּה[/hebrew]", means look at, take notice, observe, see, or gaze at. It is often used as an interjection.',
        },
      ],
    };

    const nodes: Node[] = [
      { text: "Behold,", foot: footnote },
      {
        text: 'while you are still talking there with the king, I will also come in after you and confirm your words."',
      },
    ];

    // The footnote is marked with ° in the text
    // The actual footnote content would be stored separately in the BBVerse footnotes array
    const result = nodesToBBMarkup(nodes);

    expect(result).toContain("Behold,°");
    expect(result).toContain("while you are still talking there with the king");
  });
});
