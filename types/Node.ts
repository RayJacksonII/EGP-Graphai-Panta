export default interface Node {
  type?: "t" | "p" | "h" | "n"; // t = text (default), p = paragraph break, h = heading, n = line break
  text?: string; // Text content (only for type = t or h). May include \n for line breaks.
  marks?: ("i" | "b" | "woc" | "sc")[]; // Formatting marks: i = italic, b = bold, woc = words of Christ (red lettering), sc = small caps
  strong?: string; // Strong's number in format G/H + 1-4 digits
  lemma?: string; // Lexical lemma in original script
  morph?: string; // Morphological code (e.g., Robinson, Packard)
  script?: "G" | "H"; // Override script. If unset, assume Latin.
  foot?: import("./Footnote").default; // Inline footnote anchored to this text node
}
