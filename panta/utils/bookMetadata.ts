import { readFileSync } from "fs";
import { join } from "path";

export interface Book {
  _id: string;
  name: string;
  alt: string[];
  order: {
    protestant: number;
    catholic: number;
    lxx: number;
    hebrew: number;
  };
}

export interface BookMetadata {
  books: Book[];
  byId: Map<string, Book>;
  byOrder: Map<number, Book>;
}

/**
 * Loads book metadata from bible-books.json and creates lookup maps
 * @param booksPath - Path to the bible-books.json file (default: "./bible-books/bible-books.json")
 * @returns BookMetadata object with books array and lookup maps
 */
export function loadBookMetadata(
  booksPath: string = "./bible-books/bible-books.json"
): BookMetadata {
  try {
    const booksData = readFileSync(booksPath, "utf-8");
    const books: Book[] = JSON.parse(booksData);

    const byId = new Map<string, Book>();
    const byOrder = new Map<number, Book>();

    for (const book of books) {
      byId.set(book._id, book);
      if (book.order?.protestant) {
        byOrder.set(book.order.protestant, book);
      }
    }

    return { books, byId, byOrder };
  } catch (error) {
    throw new Error(`Failed to load book metadata from ${booksPath}: ${error}`);
  }
}

/**
 * Gets a book by its ID
 * @param metadata - BookMetadata object
 * @param bookId - Book ID (e.g., "Gen", "Matt")
 * @returns Book object or undefined if not found
 */
export function getBookById(
  metadata: BookMetadata,
  bookId: string
): Book | undefined {
  return metadata.byId.get(bookId);
}

/**
 * Gets a book by its protestant order number
 * @param metadata - BookMetadata object
 * @param order - Protestant order number (1-66)
 * @returns Book object or undefined if not found
 */
export function getBookByOrder(
  metadata: BookMetadata,
  order: number
): Book | undefined {
  return metadata.byOrder.get(order);
}

/**
 * Gets the protestant order number for a book
 * @param metadata - BookMetadata object
 * @param bookId - Book ID
 * @returns Order number or undefined if book not found
 */
export function getBookOrder(
  metadata: BookMetadata,
  bookId: string
): number | undefined {
  const book = metadata.byId.get(bookId);
  return book?.order.protestant;
}
