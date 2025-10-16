import { describe, it, expect } from "vitest";
import convertVerseToBB from "../convertVerseToBB";
import VerseSchema from "../../../types/VerseSchema";
import Book from "../../../types/Book";
import BBVerse from "../../types/BBVerse";

describe("convertVerseToBB", () => {
  const genesisBook: Book = {
    _id: "Gen",
    name: "Genesis",
    alt: ["Ge", "Gn", "Gen"],
    order: {
      protestant: 1,
      catholic: 1,
      lxx: 1,
      hebrew: 1,
    },
  };

  const matthewBook: Book = {
    _id: "Matt",
    name: "Matthew",
    alt: ["Mt", "Matt"],
    order: {
      protestant: 40,
    },
  };

  it("should convert Genesis 1:1 KJV to complete BBVerse object", () => {
    const verse: VerseSchema = {
      book: "Gen",
      chapter: 1,
      verse: 1,
      content: [
        { type: "p" },
        { text: "In the beginning", strong: "H7225" },
        { text: "God", strong: "H0430" },
        { text: "created", strong: "H1254", morph: "8804" },
        { strong: "H0853" },
        { text: "the heaven", strong: "H8064" },
        { text: "and", strong: "H0853" },
        { text: "the earth", strong: "H0776" },
        { text: "." },
      ],
    };

    const expected: BBVerse = {
      _id: "kjvs-101001001",
      version: "kjvs",
      chapter: "genesis-1",
      sequence: "101001001",
      number: 1,
      text: 'In the beginning [strongs id="h7225" /] God [strongs id="h0430" /] created [strongs id="h1254" tvm="8804" /] [strongs id="h0853" /] the heaven [strongs id="h8064" /] and [strongs id="h0853" /] the earth [strongs id="h0776" /].',
      paragraphs: [0],
    };

    const result = convertVerseToBB(verse, genesisBook, "kjvs");
    expect(result).toEqual(expected);
  });

  it("should convert Matthew 1:1 Byzantine to complete BBVerse object", () => {
    const verse: VerseSchema = {
      book: "Matt",
      chapter: 1,
      verse: 1,
      content: [
        { type: "p" },
        { text: "Βίβλος", script: "G", strong: "G976", morph: "N-NSF" },
        { text: "γενέσεως", script: "G", strong: "G1078", morph: "N-GSF" },
        { text: "Ἰησοῦ", script: "G", strong: "G2424", morph: "N-GSM" },
        { text: "χριστοῦ,", script: "G", strong: "G5547", morph: "N-GSM" },
        { text: "υἱοῦ", script: "G", strong: "G5207", morph: "N-GSM" },
        { text: "Δαυίδ,", script: "G", strong: "G1138", morph: "N-PRI" },
        { text: "υἱοῦ", script: "G", strong: "G5207", morph: "N-GSM" },
        { text: "Ἀβραάμ.", script: "G", strong: "G11", morph: "N-PRI" },
      ],
    };

    const expected: BBVerse = {
      _id: "byz-201001001",
      version: "byz",
      chapter: "matthew-1",
      sequence: "201001001",
      number: 1,
      text: '[greek]Βίβλος[/greek] [strongs id="g976" m="N-NSF" /] [greek]γενέσεως[/greek] [strongs id="g1078" m="N-GSF" /] [greek]Ἰησοῦ[/greek] [strongs id="g2424" m="N-GSM" /] [greek]χριστοῦ,[/greek] [strongs id="g5547" m="N-GSM" /] [greek]υἱοῦ[/greek] [strongs id="g5207" m="N-GSM" /] [greek]Δαυίδ,[/greek] [strongs id="g1138" m="N-PRI" /] [greek]υἱοῦ[/greek] [strongs id="g5207" m="N-GSM" /] [greek]Ἀβραάμ.[/greek] [strongs id="g11" m="N-PRI" /]',
      paragraphs: [0],
    };

    const result = convertVerseToBB(verse, matthewBook, "byz");
    expect(result).toEqual(expected);
  });

  it("should handle verses with footnotes", () => {
    const verse: VerseSchema = {
      book: "Matt",
      chapter: 1,
      verse: 5,
      content: [
        {
          text: "Βοὸζ",
          script: "G",
          strong: "G1003",
          morph: "N-PRI",
          foot: {
            type: "var",
            content: [
              { text: "N" },
              { text: "Βοὸζ ἐκ", script: "G" },
              { text: "⇒" },
              { text: "Βόες ἐκ", script: "G" },
            ],
          },
        },
        { text: "ἐκ", script: "G", strong: "G1537", morph: "PREP" },
      ],
    };

    const result = convertVerseToBB(verse, matthewBook, "byz");

    expect(result._id).toBe("byz-201001005");
    expect(result.version).toBe("byz");
    expect(result.chapter).toBe("matthew-1");
    expect(result.sequence).toBe("201001005");
    expect(result.number).toBe(5);
    expect(result.text).toBe(
      '[greek]Βοὸζ[/greek]° [strongs id="g1003" m="N-PRI" /] [greek]ἐκ[/greek] [strongs id="g1537" m="PREP" /]'
    );
    expect(result.footnotes).toEqual([
      {
        text: "N [greek]Βοὸζ ἐκ[/greek] ⇒ [greek]Βόες ἐκ[/greek]",
      },
    ]);
  });

  it("should handle verses without paragraphs", () => {
    const verse: VerseSchema = {
      book: "Gen",
      chapter: 1,
      verse: 2,
      content: [
        { text: "And the earth", strong: "H0776" },
        { text: "was", strong: "H1961", morph: "8804" },
      ],
    };

    const result = convertVerseToBB(verse, genesisBook, "kjvs");

    expect(result.paragraphs).toBeUndefined();
    expect(result._id).toBe("kjvs-101001002");
  });

  const numbersBook: Book = {
    _id: "Num",
    name: "Numbers",
    alt: ["Nu", "Nm", "Num"],
    order: {
      protestant: 4,
      catholic: 4,
      lxx: 4,
      hebrew: 4,
    },
  };

  it("should handle multiple paragraph markers", () => {
    const verse: VerseSchema = {
      book: "Gen",
      chapter: 1,
      verse: 3,
      content: [
        { type: "p" },
        { text: "First", strong: "H1234" },
        { type: "p" },
        { text: "Second", strong: "H5678" },
        { text: "Third", strong: "H9012" },
      ],
    };

    const result = convertVerseToBB(verse, genesisBook, "kjvs");

    expect(result.paragraphs).toEqual([0, 1]);
    expect(result.text).toBe(
      'First [strongs id="h1234" /] Second [strongs id="h5678" /] Third [strongs id="h9012" /]'
    );
  });

  it("should convert Genesis 3:15 WEBP with newlines", () => {
    const verse: VerseSchema = {
      book: "Gen",
      chapter: 3,
      verse: 15,
      content: [
        { text: "I will put hostility between you and the woman," },
        { type: "n" },
        { text: "and between your offspring and her offspring." },
        { type: "n" },
        { text: "He will bruise your head," },
        { type: "n" },
        { text: "and you will bruise his heel." },
      ],
    };

    const result = convertVerseToBB(verse, genesisBook, "webp");

    expect(result._id).toBe("webp-101003015");
    expect(result.version).toBe("webp");
    expect(result.chapter).toBe("genesis-3");
    expect(result.sequence).toBe("101003015");
    expect(result.number).toBe(15);
    expect(result.text).toBe(
      "I will put hostility between you and the woman,\nand between your offspring and her offspring.\nHe will bruise your head,\nand you will bruise his heel."
    );
  });

  it("should convert Numbers 7:13 WEBP with paragraphs and footnote", () => {
    const verse: VerseSchema = {
      book: "Num",
      chapter: 7,
      verse: 13,
      content: [
        {
          text: "and his offering was: one silver platter, the weight of which was one hundred thirty shekels,",
          foot: {
            type: "stu",
            content: [
              {
                text: "A shekel is about 10 grams or about 0.35 ounces.",
              },
            ],
          },
        },
        {
          text: "one silver bowl of seventy shekels, according to the shekel of the sanctuary, both of them full of fine flour mixed with oil for a meal offering;",
        },
      ],
    };

    const result = convertVerseToBB(verse, numbersBook, "webp");

    expect(result._id).toBe("webp-104007013");
    expect(result.version).toBe("webp");
    expect(result.chapter).toBe("numbers-7");
    expect(result.sequence).toBe("104007013");
    expect(result.number).toBe(13);
    expect(result.text).toBe(
      "and his offering was: one silver platter, the weight of which was one hundred thirty shekels,° one silver bowl of seventy shekels, according to the shekel of the sanctuary, both of them full of fine flour mixed with oil for a meal offering;"
    );
    expect(result.footnotes).toEqual([
      {
        text: "A shekel is about 10 grams or about 0.35 ounces.",
      },
    ]);
  });
});
