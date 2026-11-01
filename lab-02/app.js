const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Path to the SQLite database
const dbPath = path.join(__dirname, "database", "library.db");

// Variable to store the database connection object
let db = null;

// Asynchronous function to connect to database and start server
const initializeDBAndServer = async () => {
  try {
    // Connect to SQLite database using sqlite and sqlite3 driver
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Start Express server on port 3000 only after database connection succeeds
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    // Handle database connection errors
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

// Call the function to start the server
initializeDBAndServer();

// 1. GET /books - Retrieve and return all books
app.get("/books", async (request, response) => {
  try {
    const getBooksQuery = `
      SELECT
        *
      FROM
        book;
    `;
    const booksArray = await db.all(getBooksQuery);
    response.send(booksArray);
  } catch (error) {
    response.status(500).send({ error: error.message });
  }
});

// 2. GET /books/:bookId - Retrieve a specific book by ID
app.get("/books/:bookId", async (request, response) => {
  try {
    const { bookId } = request.params;
    const getBookQuery = `
      SELECT
        *
      FROM
        book
      WHERE
        id = ?;
    `;
    const book = await db.get(getBookQuery, [bookId]);

    if (book === undefined) {
      response.status(404).send({ error: "Book not found" });
    } else {
      response.send(book);
    }
  } catch (error) {
    response.status(500).send({ error: error.message });
  }
});

// 3. POST /books - Add a new book
app.post("/books", async (request, response) => {
  try {
    const { title, author, price, pages } = request.body;

    // Validate required fields
    if (!title || !author || price === undefined || pages === undefined) {
      return response.status(400).send({
        error: "Missing required fields. Please provide title, author, price, and pages in the request body.",
      });
    }

    const addBookQuery = `
      INSERT INTO
        book (title, author, price, pages)
      VALUES
        (?, ?, ?, ?);
    `;
    const dbResponse = await db.run(addBookQuery, [title, author, price, pages]);
    const bookId = dbResponse.lastID;
    response.status(201).send({ bookId: bookId, message: "Book added successfully" });
  } catch (error) {
    response.status(500).send({ error: error.message });
  }
});

// 4. PUT /books/:bookId - Update an existing book by ID
app.put("/books/:bookId", async (request, response) => {
  try {
    const { bookId } = request.params;
    const { title, author, price, pages } = request.body;

    // Validate required fields
    if (!title || !author || price === undefined || pages === undefined) {
      return response.status(400).send({
        error: "Missing required fields. Please provide title, author, price, and pages in the request body.",
      });
    }

    const updateBookQuery = `
      UPDATE
        book
      SET
        title = ?,
        author = ?,
        price = ?,
        pages = ?
      WHERE
        id = ?;
    `;
    const dbResponse = await db.run(updateBookQuery, [
      title,
      author,
      price,
      pages,
      bookId,
    ]);

    if (dbResponse.changes === 0) {
      response.status(404).send({ error: "Book not found" });
    } else {
      response.send({ message: "Book updated successfully" });
    }
  } catch (error) {
    response.status(500).send({ error: error.message });
  }
});

// 5. DELETE /books/:bookId - Delete a book by ID
app.delete("/books/:bookId", async (request, response) => {
  try {
    const { bookId } = request.params;
    const deleteBookQuery = `
      DELETE FROM
        book
      WHERE
        id = ?;
    `;
    const dbResponse = await db.run(deleteBookQuery, [bookId]);

    if (dbResponse.changes === 0) {
      response.status(404).send({ error: "Book not found" });
    } else {
      response.send({ message: "Book deleted successfully" });
    }
  } catch (error) {
    response.status(500).send({ error: error.message });
  }
});

module.exports = app;
