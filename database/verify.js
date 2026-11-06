const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const verifyDB = async () => {
  try {
    const dbPath = path.join(__dirname, "library.db");
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    console.log("=== Database Connection Successful ===");
    console.log(`Database File: ${dbPath}\n`);

    // Fetch Table Structure
    console.log("=== Table Structure (book) ===");
    const tableInfo = await db.all("PRAGMA table_info(book);");
    console.table(tableInfo);

    // Fetch All Records
    console.log("\n=== Total Records in 'book' Table ===");
    const books = await db.all("SELECT * FROM book;");
    console.log(`Total Count: ${books.length} rows`);
    console.table(books);

    await db.close();
  } catch (error) {
    console.error("Verification Error:", error.message);
  }
};

verifyDB();

