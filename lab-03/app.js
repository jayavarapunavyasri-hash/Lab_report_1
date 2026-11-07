const express = require("express");
const path = require("path");
const fs = require("fs");

// Attempt loading sqlite and sqlite3 safely
let sqlite;
let sqlite3;
try {
  sqlite = require("sqlite");
  sqlite3 = require("sqlite3");
} catch (err) {
  console.warn("Native sqlite3 module not loaded:", err.message);
}

const app = express();
app.use(express.json());

// Request logging middleware for debugging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  if (req.query && Object.keys(req.query).length > 0) {
    console.log("  Query Params:", JSON.stringify(req.query));
  }
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("  Request Body:", JSON.stringify(req.body));
  }
  next();
});

// Database folder and file path (compatible with local environment and Vercel serverless)
const isVercel = !!process.env.VERCEL;
const dbFolder = isVercel ? "/tmp" : path.join(__dirname, "database");
const dbPath = path.join(dbFolder, "library.db");
let db = null;

// Initial 10 sample books
const sampleBooks = [
  { id: 1, title: "To Kill a Mockingbird", author: "Harper Lee", price: 399, pages: 281 },
  { id: 2, title: "1984", author: "George Orwell", price: 299, pages: 328 },
  { id: 3, title: "The Great Gatsby", author: "F. Scott Fitzgerald", price: 250, pages: 180 },
  { id: 4, title: "The Catcher in the Rye", author: "J.D. Salinger", price: 350, pages: 234 },
  { id: 5, title: "Pride and Prejudice", author: "Jane Austen", price: 220, pages: 279 },
  { id: 6, title: "The Hobbit", author: "J.R.R. Tolkien", price: 450, pages: 310 },
  { id: 7, title: "Harry Potter and the Philosopher's Stone", author: "J.K. Rowling", price: 499, pages: 223 },
  { id: 8, title: "The Alchemist", author: "Paulo Coelho", price: 299, pages: 208 },
  { id: 9, title: "Crime and Punishment", author: "Fyodor Dostoevsky", price: 420, pages: 430 },
  { id: 10, title: "The Da Vinci Code", author: "Dan Brown", price: 380, pages: 454 },
];

// Fallback in-memory DB engine for environments where native binary addons cannot load (such as Vercel Serverless)
const createFallbackDB = () => {
  let books = [...sampleBooks];
  let nextId = 11;
  return {
    async all(query, params = []) {
      let result = [...books];

      // 1. Partial title search (LIKE)
      if (query.includes("title LIKE ?")) {
        const likeParam = params.find(
          (p) => typeof p === "string" && p.startsWith("%") && p.endsWith("%")
        );
        if (likeParam) {
          const term = likeParam.slice(1, -1).toLowerCase();
          result = result.filter((b) => b.title.toLowerCase().includes(term));
        }
      }

      // Filter by price >= ? and price <= ?
      if (query.includes("price >=") || query.includes("price <=")) {
        const whereClause = query.split("WHERE")[1]?.split("ORDER BY")[0] || "";
        const conds = whereClause.split("AND").map((c) => c.trim());
        let pIdx = 0;
        conds.forEach((c) => {
          if (c.includes("title LIKE ?")) {
            pIdx++;
          } else if (c.includes("price >=")) {
            const minVal = params[pIdx++];
            result = result.filter((b) => b.price >= minVal);
          } else if (c.includes("price <=")) {
            const maxVal = params[pIdx++];
            result = result.filter((b) => b.price <= maxVal);
          }
        });
      }

      // ORDER BY
      const orderMatch = query.match(/ORDER BY\s+(\w+)\s+(ASC|DESC)/i);
      if (orderMatch) {
        const col = orderMatch[1].toLowerCase();
        const dir = orderMatch[2].toUpperCase();
        result.sort((a, b) => {
          let valA = a[col];
          let valB = b[col];
          if (typeof valA === "string") {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
          }
          if (valA < valB) return dir === "ASC" ? -1 : 1;
          if (valA > valB) return dir === "ASC" ? 1 : -1;
          return 0;
        });
      }

      // LIMIT ? OFFSET ?
      if (query.includes("LIMIT ? OFFSET ?")) {
        const limitVal = params[params.length - 2];
        const offsetVal = params[params.length - 1];
        if (typeof offsetVal === "number" && offsetVal >= 0) {
          result = result.slice(offsetVal);
        }
        if (typeof limitVal === "number" && limitVal > 0) {
          result = result.slice(0, limitVal);
        }
      }

      return result;
    },
    async get(query, params = []) {
      if (query.includes("COUNT(*)")) {
        return { count: books.length };
      }
      const id = parseInt(params[0]);
      return books.find((b) => b.id === id) || null;
    },
    async run(query, params = []) {
      if (query.includes("INSERT INTO book")) {
        const [title, author, price, pages] = params;
        const newBook = { id: nextId++, title, author, price: Number(price), pages: Number(pages) };
        books.push(newBook);
        return { lastID: newBook.id, changes: 1 };
      }
      if (query.includes("UPDATE book")) {
        const [title, author, price, pages, bookId] = params;
        const id = parseInt(bookId);
        const index = books.findIndex((b) => b.id === id);
        if (index === -1) return { changes: 0 };
        books[index] = { id, title, author, price: Number(price), pages: Number(pages) };
        return { changes: 1 };
      }
      if (query.includes("DELETE FROM book")) {
        const id = parseInt(params[0]);
        const initialLen = books.length;
        books = books.filter((b) => b.id !== id);
        return { changes: initialLen !== books.length ? 1 : 0 };
      }
      return { changes: 0 };
    },
    async exec(query) {
      return true;
    },
  };
};

// ================= INITIALIZE DB AND SERVER =================
const initializeDBAndServer = async () => {
  try {
    // Ensure the database folder exists
    if (!fs.existsSync(dbFolder)) {
      fs.mkdirSync(dbFolder, { recursive: true });
    }

    // In Vercel serverless, attempt copying bundled database to /tmp (writable directory)
    if (isVercel && !fs.existsSync(dbPath)) {
      const candidates = [
        path.join(__dirname, "database", "library.db"),
        path.join(__dirname, "library.db"),
      ];
      const sourceDb = candidates.find((p) => fs.existsSync(p));
      if (sourceDb) {
        try {
          fs.copyFileSync(sourceDb, dbPath);
        } catch (e) {
          console.warn("Could not copy sqlite file:", e.message);
        }
      }
    }

    // Connect using sqlite & sqlite3 if available
    if (sqlite && sqlite3) {
      db = await sqlite.open({
        filename: dbPath,
        driver: sqlite3.Database,
      });

      // Create the 'book' table if it does not already exist
      await db.exec(`
        CREATE TABLE IF NOT EXISTS book (
          id INTEGER PRIMARY KEY,
          title TEXT,
          author TEXT,
          price INTEGER,
          pages INTEGER
        );
      `);

      // Insert 10 sample books if table is empty (prevents duplicate records on restart)
      const bookCount = await db.get(`SELECT COUNT(*) AS count FROM book;`);
      if (bookCount.count === 0) {
        await db.exec(`
          INSERT OR IGNORE INTO book (id, title, author, price, pages) VALUES
          (1, 'To Kill a Mockingbird', 'Harper Lee', 399, 281),
          (2, '1984', 'George Orwell', 299, 328),
          (3, 'The Great Gatsby', 'F. Scott Fitzgerald', 250, 180),
          (4, 'The Catcher in the Rye', 'J.D. Salinger', 350, 234),
          (5, 'Pride and Prejudice', 'Jane Austen', 220, 279),
          (6, 'The Hobbit', 'J.R.R. Tolkien', 450, 310),
          (7, 'Harry Potter and the Philosopher''s Stone', 'J.K. Rowling', 499, 223),
          (8, 'The Alchemist', 'Paulo Coelho', 299, 208),
          (9, 'Crime and Punishment', 'Fyodor Dostoevsky', 420, 430),
          (10, 'The Da Vinci Code', 'Dan Brown', 380, 454);
        `);
        console.log("Sample book records inserted into library.db successfully.");
      }
    } else {
      console.log("Using fallback database engine for serverless deployment.");
      db = createFallbackDB();
    }

    // Start Express server on port 3000 locally (Vercel manages listening automatically)
    if (!isVercel) {
      app.listen(3000, () => {
        console.log("Server running at http://localhost:3000/");
      });
    }
  } catch (error) {
    console.error(`DB Error: ${error.message}`);
    // Fallback gracefully so serverless functions never crash with 500
    db = createFallbackDB();
    if (!isVercel) {
      app.listen(3000, () => {
        console.log("Server running at http://localhost:3000/");
      });
    }
  }
};

// Store promise so requests wait for DB initialization
const dbPromise = initializeDBAndServer();

// Middleware to ensure DB is initialized before route execution
app.use(async (req, res, next) => {
  if (!db) {
    await dbPromise;
  }
  next();
});

// ================= VALIDATION HELPERS =================

// Validate route parameter :bookId
const validateBookId = (bookId) => {
  const id = Number(bookId);
  if (!Number.isInteger(id) || id <= 0) {
    return { valid: false, error: "Invalid book ID: must be a positive integer" };
  }
  return { valid: true, id };
};

// Validate body payload for POST and PUT
const validateBookPayload = (body) => {
  if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
    return { valid: false, error: "Request body cannot be empty" };
  }

  const { title, author, price, pages } = body;

  // 1. Missing or empty title
  if (title === undefined || title === null || typeof title !== "string" || title.trim() === "") {
    return { valid: false, error: "Title is required and must be a non-empty string" };
  }

  // 2. Missing or empty author
  if (author === undefined || author === null || typeof author !== "string" || author.trim() === "") {
    return { valid: false, error: "Author is required and must be a non-empty string" };
  }

  // 3. Missing or non-numeric price
  if (
    price === undefined ||
    price === null ||
    price === "" ||
    typeof price === "boolean" ||
    isNaN(Number(price))
  ) {
    return { valid: false, error: "Price is required and must be a valid number" };
  }

  const numPrice = Number(price);
  if (numPrice < 0) {
    return { valid: false, error: "Price must be a non-negative number" };
  }

  // Optional pages validation (accept positive integer if provided, else null)
  let numPages = null;
  if (pages !== undefined && pages !== null && pages !== "") {
    numPages = Number(pages);
    if (!Number.isInteger(numPages) || numPages <= 0) {
      return { valid: false, error: "Pages must be a valid positive integer" };
    }
  }

  return {
    valid: true,
    data: {
      title: title.trim(),
      author: author.trim(),
      price: numPrice,
      pages: numPages,
    },
  };
};

// Allowed columns for sorting to prevent SQL Injection
const ALLOWED_ORDER_BY_COLUMNS = ["id", "title", "author", "price", "pages"];

// ================= REST API ROUTES =================

// 1. Root Route
app.get("/", (req, res) => {
  res.send("Backend Development Fundamentals Lab 3 - REST API, Query Parameters, Validation and Debugging");
});

// 2. READ ALL: Get books with Query Parameters (search_q, order_by, order, limit, offset, min_price, max_price)
app.get(["/books", "/books/"], async (req, res) => {
  try {
    const {
      search_q = "",
      order_by = "id",
      order = "ASC",
      limit = 10,
      offset = 0,
      min_price,
      max_price,
    } = req.query;

    // 2. Validate 'order_by'
    const normalizedOrderBy = String(order_by).toLowerCase();
    if (!ALLOWED_ORDER_BY_COLUMNS.includes(normalizedOrderBy)) {
      return res.status(400).json({
        error: `Invalid 'order_by' parameter. Allowed values: ${ALLOWED_ORDER_BY_COLUMNS.join(", ")}`,
      });
    }

    // 3. Validate 'order'
    const normalizedOrder = String(order).toUpperCase();
    if (!["ASC", "DESC"].includes(normalizedOrder)) {
      return res.status(400).json({
        error: "Invalid 'order' parameter. Allowed values: ASC, DESC",
      });
    }

    // 4. Validate 'limit' (positive integer default 10)
    const limitNum = Number(limit);
    if (!Number.isInteger(limitNum) || limitNum <= 0) {
      return res.status(400).json({
        error: "Invalid 'limit' parameter: must be a positive integer",
      });
    }

    // 5. Validate 'offset' (non-negative integer default 0)
    const offsetNum = Number(offset);
    if (!Number.isInteger(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        error: "Invalid 'offset' parameter: must be a non-negative integer",
      });
    }

    const conditions = [];
    const params = [];

    // 1. search_q: Partial book title search using LIKE
    if (search_q !== undefined && String(search_q).trim() !== "") {
      conditions.push("title LIKE ?");
      params.push(`%${String(search_q).trim()}%`);
    }

    // 6. min_price: Filter books by minimum price
    if (min_price !== undefined && min_price !== "") {
      const minPriceNum = Number(min_price);
      if (isNaN(minPriceNum) || minPriceNum < 0) {
        return res.status(400).json({
          error: "Invalid 'min_price' parameter: must be a non-negative number",
        });
      }
      conditions.push("price >= ?");
      params.push(minPriceNum);
    }

    // 7. max_price: Filter books by maximum price
    if (max_price !== undefined && max_price !== "") {
      const maxPriceNum = Number(max_price);
      if (isNaN(maxPriceNum) || maxPriceNum < 0) {
        return res.status(400).json({
          error: "Invalid 'max_price' parameter: must be a non-negative number",
        });
      }
      conditions.push("price <= ?");
      params.push(maxPriceNum);
    }

    // Cross-validation: min_price cannot exceed max_price
    if (
      min_price !== undefined && min_price !== "" &&
      max_price !== undefined && max_price !== ""
    ) {
      if (Number(min_price) > Number(max_price)) {
        return res.status(400).json({
          error: "'min_price' cannot be greater than 'max_price'",
        });
      }
    }

    let query = `SELECT * FROM book`;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    // 2 & 3. Sort ordering + 4 & 5. Defaulted Limit & Offset
    query += ` ORDER BY ${normalizedOrderBy} ${normalizedOrder} LIMIT ? OFFSET ?;`;
    params.push(limitNum, offsetNum);

    const books = await db.all(query, params);
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. READ ONE: Get a single book by ID
app.get(["/books/:bookId", "/books/:bookId/"], async (req, res) => {
  try {
    const idValidation = validateBookId(req.params.bookId);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

    const getBookQuery = `SELECT * FROM book WHERE id = ?;`;
    const book = await db.get(getBookQuery, [idValidation.id]);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. CREATE: Add a new book
app.post(["/books", "/books/"], async (req, res) => {
  try {
    const payloadValidation = validateBookPayload(req.body);
    if (!payloadValidation.valid) {
      return res.status(400).json({ error: payloadValidation.error });
    }

    const { title, author, price, pages } = payloadValidation.data;

    const addBookQuery = `
      INSERT INTO book (title, author, price, pages)
      VALUES (?, ?, ?, ?);
    `;
    const result = await db.run(addBookQuery, [title, author, price, pages]);

    res.status(201).json({
      message: "Book Added Successfully",
      bookId: result.lastID,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. UPDATE: Update book details by ID
app.put(["/books/:bookId", "/books/:bookId/"], async (req, res) => {
  try {
    const idValidation = validateBookId(req.params.bookId);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

    const payloadValidation = validateBookPayload(req.body);
    if (!payloadValidation.valid) {
      return res.status(400).json({ error: payloadValidation.error });
    }

    const { title, author, price, pages } = payloadValidation.data;

    const updateBookQuery = `
      UPDATE book
      SET title = ?, author = ?, price = ?, pages = ?
      WHERE id = ?;
    `;
    const result = await db.run(updateBookQuery, [title, author, price, pages, idValidation.id]);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json({ message: "Book Details Updated Successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. DELETE: Delete a book by ID
app.delete(["/books/:bookId", "/books/:bookId/"], async (req, res) => {
  try {
    const idValidation = validateBookId(req.params.bookId);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

    const deleteBookQuery = `DELETE FROM book WHERE id = ?;`;
    const result = await db.run(deleteBookQuery, [idValidation.id]);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json({ message: "Book Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= ERROR HANDLING & 404 MIDDLEWARE =================

// 404 Catch-All handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: `Cannot ${req.method} ${req.originalUrl}`,
    message: "Endpoint not found",
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(`[Unhandled Error] ${err.stack || err.message}`);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

module.exports = app;
