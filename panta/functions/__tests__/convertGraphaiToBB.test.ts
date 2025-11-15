import { describe, it, expect } from "vitest";
import { convertGraphaiToBB } from "../convertGraphaiToBB";

describe("convertGraphaiToBB", () => {
  it("should convert Graphai format to BB format", () => {
    const input = [
      {
        text: "Ἰούδας",
        script: "G",
        strong: "G2455",
        morph: "N-NSM",
      },
      {
        text: " δὲ",
        script: "G",
        strong: "G1161",
        morph: "CONJ",
      },
      {
        text: " ἐγέννησεν",
        script: "G",
        strong: "G1080",
        morph: "V-AAI-3S",
      },
      {
        text: " τὸν",
        script: "G",
        strong: "G3588",
        morph: "T-ASM",
      },
      {
        text: " Φαρὲς",
        script: "G",
        strong: "G5329",
        morph: "N-PRI",
      },
      {
        text: " καὶ",
        script: "G",
        strong: "G2532",
        morph: "CONJ",
      },
      {
        text: " τὸν",
        script: "G",
        strong: "G3588",
        morph: "T-ASM",
      },
      {
        text: " Ζαρὰ",
        script: "G",
        strong: "G2196",
        morph: "N-PRI",
      },
      {
        text: " ἐκ",
        script: "G",
        strong: "G1537",
        morph: "PREP",
      },
      {
        text: " τῆς",
        script: "G",
        strong: "G3588",
        morph: "T-GSF",
      },
      {
        text: " Θάμαρ·",
        script: "G",
        strong: "G2283",
        morph: "N-PRI",
      },
      {
        text: " Φαρὲς",
        script: "G",
        strong: "G5329",
        morph: "N-PRI",
      },
      {
        text: " δὲ",
        script: "G",
        strong: "G1161",
        morph: "CONJ",
      },
      {
        text: " ἐγέννησεν",
        script: "G",
        strong: "G1080",
        morph: "V-AAI-3S",
      },
      {
        text: " τὸν",
        script: "G",
        strong: "G3588",
        morph: "T-ASM",
      },
      {
        text: " Ἑσρώμ·",
        script: "G",
        strong: "G2074",
        morph: "N-PRI",
      },
      {
        text: " Ἑσρὼμ",
        script: "G",
        strong: "G2074",
        morph: "N-PRI",
      },
      {
        text: " δὲ",
        script: "G",
        strong: "G1161",
        morph: "CONJ",
      },
      {
        text: " ἐγέννησεν",
        script: "G",
        strong: "G1080",
        morph: "V-AAI-3S",
      },
      {
        text: " τὸν",
        script: "G",
        strong: "G3588",
        morph: "T-ASM",
      },
      {
        text: " Ἀράμ·",
        script: "G",
        strong: "G689",
        morph: "N-PRI",
      },
    ];

    const expected = {
      text: '[greek]Ἰούδας[/greek] [strongs id="g2455" m="N-NSM" /] [greek]δὲ[/greek] [strongs id="g1161" m="CONJ" /] [greek]ἐγέννησεν[/greek] [strongs id="g1080" m="V-AAI-3S" /] [greek]τὸν[/greek] [strongs id="g3588" m="T-ASM" /] [greek]Φαρὲς[/greek] [strongs id="g5329" m="N-PRI" /] [greek]καὶ[/greek] [strongs id="g2532" m="CONJ" /] [greek]τὸν[/greek] [strongs id="g3588" m="T-ASM" /] [greek]Ζαρὰ[/greek] [strongs id="g2196" m="N-PRI" /] [greek]ἐκ[/greek] [strongs id="g1537" m="PREP" /] [greek]τῆς[/greek] [strongs id="g3588" m="T-GSF" /] [greek]Θάμαρ·[/greek] [strongs id="g2283" m="N-PRI" /] [greek]Φαρὲς[/greek] [strongs id="g5329" m="N-PRI" /] [greek]δὲ[/greek] [strongs id="g1161" m="CONJ" /] [greek]ἐγέννησεν[/greek] [strongs id="g1080" m="V-AAI-3S" /] [greek]τὸν[/greek] [strongs id="g3588" m="T-ASM" /] [greek]Ἑσρώμ·[/greek] [strongs id="g2074" m="N-PRI" /] [greek]Ἑσρὼμ[/greek] [strongs id="g2074" m="N-PRI" /] [greek]δὲ[/greek] [strongs id="g1161" m="CONJ" /] [greek]ἐγέννησεν[/greek] [strongs id="g1080" m="V-AAI-3S" /] [greek]τὸν[/greek] [strongs id="g3588" m="T-ASM" /] [greek]Ἀράμ·[/greek] [strongs id="g689" m="N-PRI" /]',
    };

    expect(convertGraphaiToBB(input)).toEqual(expected);
  });

  it("should handle paragraphs and footnotes", () => {
    const input = [
      {
        text: "In the beginning, God",
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
        paragraph: true,
      },
      " created the heavens and the earth.",
    ];

    const expected = {
      text: "In the beginning, God° created the heavens and the earth.",
      paragraphs: [0],
      footnotes: [
        {
          type: "trn",
          text: "The Hebrew word rendered “God” is “[hebrew]אֱלֹהִ֑ים[/hebrew]” (Elohim).",
        },
      ],
    };

    expect(convertGraphaiToBB(input)).toEqual(expected);
  });

  it("should handle string context nodes and small caps marks", () => {
    const input = [
      {
        text: "These",
        strong: "H0428",
      },
      " ",
      {
        text: "are",
        marks: ["i"],
      },
      {
        text: " the generations",
        strong: "H8435",
      },
      {
        text: " of the heavens",
        strong: "H8064",
      },
      {
        text: " and of the earth",
        strong: "H0776",
      },
      {
        text: " when they were created",
        strong: "H1254",
        morph: "8736",
      },
      {
        text: ", in the day",
        strong: "H3117",
      },
      " that the ",
      {
        text: "Lord",
        marks: ["sc"],
        strong: "H3068",
      },
      {
        text: " God",
        strong: "H0430",
      },
      {
        text: " made",
        strong: "H6213",
        morph: "8800",
      },
      {
        text: " the earth",
        strong: "H0776",
      },
      {
        text: " and the heavens.",
        strong: "H8064",
      },
    ];

    const expected = {
      text: 'These [strongs id="h428" /] [i]are[/i] the generations [strongs id="h8435" /] of the heavens [strongs id="h8064" /] and of the earth [strongs id="h776" /] when they were created [strongs id="h1254" tvm="8736" /], in the day [strongs id="h3117" /] that the [sc]Lord[/sc] [strongs id="h3068" /] God [strongs id="h430" /] made [strongs id="h6213" tvm="8800" /] the earth [strongs id="h776" /] and the heavens. [strongs id="h8064" /]',
    };

    expect(convertGraphaiToBB(input)).toEqual(expected);
  });

  it("should handle bold and word of Christ marks", () => {
    const input = [
      "Jesus turned and saw them following, and said to them, ",
      {
        text: "“What are you looking for?”",
        marks: ["woc"],
      },
      " They said to him, “Rabbi” (which is to say, being interpreted, Teacher), “where are ",
      { text: "you", marks: ["b"] },
      " staying?”",
    ];

    const expected = {
      text: "Jesus turned and saw them following, and said to them, [red]“What are you looking for?”[/red] They said to him, “Rabbi” (which is to say, being interpreted, Teacher), “where are [b]you[/b] staying?”",
    };

    expect(convertGraphaiToBB(input)).toEqual(expected);
  });

  it("should handle paragraphs", () => {
    const input = [
      {
        text: "Yahweh God said to the woman, “What have you done?”",
        paragraph: true,
      },
      {
        text: "The woman said, “The serpent deceived me, and I ate.”",
        paragraph: true,
      },
    ];

    const expected = {
      text: "Yahweh God said to the woman, “What have you done?” The woman said, “The serpent deceived me, and I ate.”",
      paragraphs: [0, 51],
    };

    expect(convertGraphaiToBB(input)).toEqual(expected);
  });

  it("should handle line breaks", () => {
    const input = [
      {
        text: "Yahweh God said to the serpent,",
        paragraph: true,
        break: true,
      },
      {
        text: "“Because you have done this,",
        break: true,
      },
      {
        text: "you are cursed above all livestock,",
        break: true,
      },
      {
        text: "and above every animal of the field.",
        break: true,
      },
      {
        text: "You shall go on your belly",
        break: true,
      },
      {
        text: "and you shall eat dust all the days of your life.",
        break: true,
      },
    ];

    const expected = {
      text: "Yahweh God said to the serpent,\n“Because you have done this,\nyou are cursed above all livestock,\nand above every animal of the field.\nYou shall go on your belly\nand you shall eat dust all the days of your life.\n",
      paragraphs: [0],
    };

    expect(convertGraphaiToBB(input)).toEqual(expected);
  });

  it("should handle footnotes with types (WEBP)", () => {
    const input = [
      {
        text: "The light shines",
        foot: {
          type: "trn",
          content: ["Translation note here."],
        },
      },
      "in the darkness.",
    ];

    const expected = {
      text: "The light shines°in the darkness.",
      footnotes: [
        {
          type: "trn",
          text: "Translation note here.",
        },
      ],
    };

    expect(convertGraphaiToBB(input)).toEqual(expected);
  });

  describe("KJVS Strong's and TVM", () => {
    it("should convert Strong's with leading zeros and TVM", () => {
      const input = [
        { text: "the beginning", strong: "G0746" },
        { text: " was", strong: "G2258", morph: "ImpfInd" },
      ];
      const expected = {
        text: 'the beginning [strongs id="g746" /] was [strongs id="g2258" tvm="ImpfInd" /]',
      };
      expect(convertGraphaiToBB(input)).toEqual(expected);
    });

    it("should convert Hebrew Strong's with numeric TVM", () => {
      const input = [{ text: "sang", strong: "H7891", morph: "8804" }];
      const expected = {
        text: 'sang [strongs id="h7891" tvm="8804" /]',
      };
      expect(convertGraphaiToBB(input)).toEqual(expected);
    });

    it("should concatenate text elements", () => {
      const input = [
        "In the beginning ",
        { text: "was", strong: "G2258", morph: "ImpfInd" },
        " the Word",
      ];
      const expected = {
        text: 'In the beginning was [strongs id="g2258" tvm="ImpfInd" /] the Word',
      };
      expect(convertGraphaiToBB(input)).toEqual(expected);
    });

    it("should handle TVM2 morphology codes", () => {
      const input = [
        { text: "word", strong: "G0373", morph: "PresMidInd/PresMidImpr" },
      ];
      const expected = {
        text: 'word [strongs id="g373" tvm="PresMidInd" tvm2="PresMidImpr" /]',
      };
      expect(convertGraphaiToBB(input)).toEqual(expected);
    });

    it("should convert Greek text with Strong's to BB format", () => {
      const input = [
        { text: "λόγος", script: "G", strong: "G3056", morph: "N-NSM" },
      ];
      const expected = {
        text: '[greek]λόγος[/greek] [strongs id="g3056" m="N-NSM" /]',
      };
      expect(convertGraphaiToBB(input)).toEqual(expected);
    });

    it("should convert paragraphs to BB format", () => {
      const input = [
        { text: "First sentence.", paragraph: true },
        { text: "Second sentence.", paragraph: true },
      ];
      const expected = {
        text: "First sentence. Second sentence.",
        paragraphs: [0, 15],
      };
      expect(convertGraphaiToBB(input)).toEqual(expected);
    });

    it("should convert line breaks to BB format", () => {
      const input = [{ text: "First line", break: true }, "Second line"];
      const expected = {
        text: "First line\nSecond line",
      };
      expect(convertGraphaiToBB(input)).toEqual(expected);
    });
  });
});
