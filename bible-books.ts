import * as fs from "fs";
import * as path from "path";

interface Book {
  _id: string;
  name: string;
  testament: string;
  alt: string[];
  order: { [key: string]: number };
}

function showBookNames(orderType: string): void {
  const filePath = path.join(__dirname, "bible-books", "bible-books.json");
  const data = fs.readFileSync(filePath, "utf-8");
  const books: Book[] = JSON.parse(data);

  // Filter books that have the specified order type
  const booksWithOrder = books.filter(
    (book) => book.order[orderType] !== undefined
  );

  // Sort books by the specified order type
  const sortedBooks = booksWithOrder.sort((a, b) => {
    const orderA = a.order[orderType];
    const orderB = b.order[orderType];
    return orderA - orderB;
  });

  // Display the sorted book names
  sortedBooks.forEach((book) => {
    const orderNum = book.order[orderType];
    console.log(`${orderNum.toString().padStart(2, " ")}. ${book.name}`);
  });
}

// Get the order type from command line arguments
const orderType = process.argv[2] || "lxx"; // Default to 'lxx' if not provided
showBookNames(orderType);
