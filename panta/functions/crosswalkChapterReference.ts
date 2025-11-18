/**
 * Crosswalk function to convert BB chapter references to Graphai book and chapter components
 * @param bbChapterRef - BB chapter reference (slug string like "genesis-1", "1-samuel-15")
 * @returns Graphai book and chapter components: { bookId: string, chapter: number }
 * @throws Error if chapter reference is invalid or book is unmapped
 */
export function crosswalkChapterReference(bbChapterRef: string): {
  bookId: string;
  chapter: number;
} {
  // Hardcoded mapping table for BB book slugs to Graphai book IDs
  const bookSlugMap: Record<string, string> = {
    // Old Testament
    genesis: "GEN",
    exodus: "EXO",
    leviticus: "LEV",
    numbers: "NUM",
    deuteronomy: "DEU",
    joshua: "JSH",
    judges: "JDG",
    ruth: "RTH",
    "1-samuel": "1SM",
    "2-samuel": "2SM",
    "1-kings": "1KG",
    "2-kings": "2KG",
    "1-chronicles": "1CH",
    "2-chronicles": "2CH",
    ezra: "EZR",
    nehemiah: "NEH",
    esther: "EST",
    job: "JOB",
    psalms: "PSA",
    psalm: "PSA", // Handle both singular and plural
    proverbs: "PRV",
    ecclesiastes: "ECC",
    "song-of-solomon": "SOS",
    "song-of-songs": "SOS", // Alternative name
    isaiah: "ISA",
    jeremiah: "JER",
    lamentations: "LAM",
    ezekiel: "EZK",
    daniel: "DAN",
    hosea: "HOS",
    joel: "JOL",
    amos: "AMS",
    obadiah: "OBD",
    jonah: "JNA",
    micah: "MIC",
    nahum: "NAH",
    habakkuk: "HAB",
    zephaniah: "ZPH",
    haggai: "HAG",
    zechariah: "ZEC",
    malachi: "MAL",

    // New Testament
    matthew: "MAT",
    mark: "MRK",
    luke: "LUK",
    john: "JHN",
    acts: "ACT",
    romans: "ROM",
    "1-corinthians": "1CO",
    "2-corinthians": "2CO",
    galatians: "GAL",
    ephesians: "EPH",
    philippians: "PHP",
    colossians: "COL",
    "1-thessalonians": "1TH",
    "2-thessalonians": "2TH",
    "1-timothy": "1TM",
    "2-timothy": "2TM",
    titus: "TIT",
    philemon: "PHM",
    hebrews: "HEB",
    james: "JAS",
    "1-peter": "1PT",
    "2-peter": "2PT",
    "1-john": "1JN",
    "2-john": "2JN",
    "3-john": "3JN",
    jude: "JUD",
    revelation: "REV",
  };

  // Parse chapter reference by splitting on the last hyphen
  const lastHyphenIndex = bbChapterRef.lastIndexOf("-");
  if (lastHyphenIndex === -1) {
    throw new Error(
      `Invalid chapter reference format: "${bbChapterRef}". Expected format: "book-chapter" (e.g., "genesis-1")`
    );
  }

  const bookSlug = bbChapterRef.substring(0, lastHyphenIndex);
  const chapterStr = bbChapterRef.substring(lastHyphenIndex + 1);

  // Validate chapter number
  const chapter = parseInt(chapterStr, 10);
  if (isNaN(chapter) || chapter <= 0) {
    throw new Error(
      `Invalid chapter number: "${chapterStr}". Chapter must be a positive integer`
    );
  }

  // Map book slug to Graphai book ID
  const bookId = bookSlugMap[bookSlug];
  if (!bookId) {
    throw new Error(
      `Unknown book slug: "${bookSlug}". Supported book slugs include: ${Object.keys(
        bookSlugMap
      )
        .slice(0, 10)
        .join(", ")}...`
    );
  }

  return { bookId, chapter };
}
