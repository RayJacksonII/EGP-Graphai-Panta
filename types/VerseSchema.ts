export default interface VerseSchema {
  book: string;
  chapter: number;
  verse: number;
  content: import("./Node").default[];
}
