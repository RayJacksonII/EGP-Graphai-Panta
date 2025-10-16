// Legacy BB format verse interface for export operations
export default interface BBVerse {
  _id: string;
  version: string;
  chapter: string;
  sequence: string;
  number: number;
  text: string;
  paragraphs?: number[];
  footnotes?: Array<{ text: string }>;
}
