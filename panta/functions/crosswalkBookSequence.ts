/**
 * Crosswalk function to convert BB book sequences to Graphai book metadata
 * @param bbBookSequence - BB book sequence (3-digit string, e.g., "101", "204")
 * @returns Graphai book metadata with _id and order
 * @throws Error if sequence is not mapped
 */
export function crosswalkBookSequence(bbBookSequence: string): {
  _id: string;
  order: number;
} {
  // Hardcoded mapping table for all 66 canonical books
  const bookMap: Record<string, { _id: string; order: number }> = {
    // Old Testament (101-139 → order 1-39)
    "101": { _id: "GEN", order: 1 },
    "102": { _id: "EXO", order: 2 },
    "103": { _id: "LEV", order: 3 },
    "104": { _id: "NUM", order: 4 },
    "105": { _id: "DEU", order: 5 },
    "106": { _id: "JSH", order: 6 },
    "107": { _id: "JDG", order: 7 },
    "108": { _id: "RTH", order: 8 },
    "109": { _id: "1SM", order: 9 },
    "110": { _id: "2SM", order: 10 },
    "111": { _id: "1KG", order: 11 },
    "112": { _id: "2KG", order: 12 },
    "113": { _id: "1CH", order: 13 },
    "114": { _id: "2CH", order: 14 },
    "115": { _id: "EZR", order: 15 },
    "116": { _id: "NEH", order: 16 },
    "117": { _id: "EST", order: 17 },
    "118": { _id: "JOB", order: 18 },
    "119": { _id: "PSA", order: 19 },
    "120": { _id: "PRV", order: 20 },
    "121": { _id: "ECC", order: 21 },
    "122": { _id: "SOS", order: 22 },
    "123": { _id: "ISA", order: 23 },
    "124": { _id: "JER", order: 24 },
    "125": { _id: "LAM", order: 25 },
    "126": { _id: "EZK", order: 26 },
    "127": { _id: "DAN", order: 27 },
    "128": { _id: "HOS", order: 28 },
    "129": { _id: "JOL", order: 29 },
    "130": { _id: "AMS", order: 30 },
    "131": { _id: "OBD", order: 31 },
    "132": { _id: "JNA", order: 32 },
    "133": { _id: "MIC", order: 33 },
    "134": { _id: "NAH", order: 34 },
    "135": { _id: "HAB", order: 35 },
    "136": { _id: "ZPH", order: 36 },
    "137": { _id: "HAG", order: 37 },
    "138": { _id: "ZEC", order: 38 },
    "139": { _id: "MAL", order: 39 },

    // New Testament (201-266 → order 40-66)
    "201": { _id: "MAT", order: 40 },
    "202": { _id: "MRK", order: 41 },
    "203": { _id: "LUK", order: 42 },
    "204": { _id: "JHN", order: 43 },
    "205": { _id: "ACT", order: 44 },
    "206": { _id: "ROM", order: 45 },
    "207": { _id: "1CO", order: 46 },
    "208": { _id: "2CO", order: 47 },
    "209": { _id: "GAL", order: 48 },
    "210": { _id: "EPH", order: 49 },
    "211": { _id: "PHP", order: 50 },
    "212": { _id: "COL", order: 51 },
    "213": { _id: "1TH", order: 52 },
    "214": { _id: "2TH", order: 53 },
    "215": { _id: "1TM", order: 54 },
    "216": { _id: "2TM", order: 55 },
    "217": { _id: "TIT", order: 56 },
    "218": { _id: "PHM", order: 57 },
    "219": { _id: "HEB", order: 58 },
    "220": { _id: "JAS", order: 59 },
    "221": { _id: "1PT", order: 60 },
    "222": { _id: "2PT", order: 61 },
    "223": { _id: "1JN", order: 62 },
    "224": { _id: "2JN", order: 63 },
    "225": { _id: "3JN", order: 64 },
    "226": { _id: "JUD", order: 65 },
    "227": { _id: "REV", order: 66 },
  };

  const bookData = bookMap[bbBookSequence];
  if (!bookData) {
    throw new Error(
      `Unknown BB book sequence: "${bbBookSequence}". Supported sequences: 101-139 (OT), 201-227 (NT)`
    );
  }

  return bookData;
}
