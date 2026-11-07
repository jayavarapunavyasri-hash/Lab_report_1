const EventEmitter = require("events");
const app = require("./app");

function simulateRequest(url, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url, "http://localhost:3000");
    const req = new EventEmitter();
    req.url = parsedUrl.pathname + parsedUrl.search;
    req.originalUrl = req.url;
    req.method = method;
    req.headers = { host: "localhost:3000", "content-type": "application/json" };
    req.query = Object.fromEntries(parsedUrl.searchParams);
    req.body = body;

    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      status(code) { this.statusCode = code; return this; },
      send(data) { resolve({ status: this.statusCode, data }); },
      json(data) { resolve({ status: this.statusCode, data }); },
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
      else resolve({ status: res.statusCode, data: "No route matched" });
    });
  });
}

async function runTests() {
  console.log("==================================================");
  console.log(" Lab 3: REST API, Query Parameters & Validation   ");
  console.log("==================================================");

  // Give DB a moment to initialize
  await new Promise((r) => setTimeout(r, 600));

  let passed = 0;
  let total = 0;

  const test = async (name, fn) => {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ [FAIL] ${name}: ${e.message}`);
    }
  };

  // 1. Root route
  await test("Root route returns Lab 3 title", async () => {
    const res = await simulateRequest("/");
    if (res.status !== 200 || !res.data.includes("Lab 3")) {
      throw new Error(`Expected 200 with 'Lab 3', got ${res.status}: ${res.data}`);
    }
  });

  // 2. Default GET /books
  await test("Default GET /books returns books sorted by id ASC", async () => {
    const res = await simulateRequest("/books");
    if (res.status !== 200 || !Array.isArray(res.data) || res.data.length === 0) {
      throw new Error(`Expected 200 with books array, got ${res.status}`);
    }
    for (let i = 0; i < res.data.length - 1; i++) {
      if (res.data[i].id > res.data[i + 1].id) {
        throw new Error("Default sorting is not id ASC");
      }
    }
  });

  // 3. search_q parameter
  await test("Query param 'search_q' performs partial title search", async () => {
    const res = await simulateRequest("/books?search_q=Harry");
    if (res.status !== 200 || res.data.length === 0 || !res.data.every((b) => b.title.toLowerCase().includes("harry"))) {
      throw new Error(`Expected matches containing 'Harry', got: ${JSON.stringify(res.data)}`);
    }
  });

  // 4. order_by and order parameters
  await test("Query params 'order_by=price' and 'order=DESC' sort correctly", async () => {
    const res = await simulateRequest("/books?order_by=price&order=DESC&limit=3");
    if (res.status !== 200 || res.data.length !== 3) {
      throw new Error(`Expected 3 records, got ${res.data.length}`);
    }
    if (res.data[0].price < res.data[1].price || res.data[1].price < res.data[2].price) {
      throw new Error("Books are not sorted in descending price order");
    }
  });

  // 5. limit and offset parameters
  await test("Query params 'limit=3&offset=2' paginates correctly", async () => {
    const allRes = await simulateRequest("/books?limit=10");
    const res = await simulateRequest("/books?limit=3&offset=2");
    if (res.status !== 200 || res.data.length !== 3) {
      throw new Error(`Expected 3 items, got ${res.data.length}`);
    }
    if (
      res.data[0].id !== allRes.data[2].id ||
      res.data[1].id !== allRes.data[3].id ||
      res.data[2].id !== allRes.data[4].id
    ) {
      throw new Error("Paginated items do not match expected offset slice");
    }
  });

  // 6. min_price and max_price parameters
  await test("Query params 'min_price' and 'max_price' filter prices correctly", async () => {
    const res = await simulateRequest("/books?min_price=300&max_price=400");
    if (res.status !== 200 || res.data.length === 0) {
      throw new Error("Expected filtered records");
    }
    const allInRange = res.data.every((b) => b.price >= 300 && b.price <= 400);
    if (!allInRange) {
      throw new Error("Some records fall outside 300-400 price range");
    }
  });

  // 7. Validation: invalid order_by
  await test("Validation rejects invalid 'order_by' column with HTTP 400", async () => {
    const res = await simulateRequest("/books?order_by=password");
    if (res.status !== 400 || !res.data.error.includes("order_by")) {
      throw new Error(`Expected 400 with order_by error, got ${res.status}`);
    }
  });

  // 8. Validation: invalid order
  await test("Validation rejects invalid 'order' with HTTP 400", async () => {
    const res = await simulateRequest("/books?order=DIAGONAL");
    if (res.status !== 400 || !res.data.error.includes("order")) {
      throw new Error(`Expected 400 with order error, got ${res.status}`);
    }
  });

  // 9. Validation: invalid limit
  await test("Validation rejects negative 'limit' with HTTP 400", async () => {
    const res = await simulateRequest("/books?limit=-2");
    if (res.status !== 400 || !res.data.error.includes("limit")) {
      throw new Error(`Expected 400 with limit error, got ${res.status}`);
    }
  });

  // 10. Validation: min_price > max_price
  await test("Validation rejects min_price > max_price with HTTP 400", async () => {
    const res = await simulateRequest("/books?min_price=600&max_price=200");
    if (res.status !== 400 || !res.data.error.includes("min_price")) {
      throw new Error(`Expected 400 with price mismatch error, got ${res.status}`);
    }
  });

  // 11. Route param validation: GET /books/:bookId
  await test("Validation rejects non-integer :bookId with HTTP 400", async () => {
    const res = await simulateRequest("/books/abc");
    if (res.status !== 400 || !res.data.error.includes("positive integer")) {
      throw new Error(`Expected 400 for non-integer ID, got ${res.status}`);
    }
  });

  // 12. 404 Not Found for non-existent book
  await test("Returns 404 for non-existent book ID", async () => {
    const res = await simulateRequest("/books/9999");
    if (res.status !== 404) {
      throw new Error(`Expected 404, got ${res.status}`);
    }
  });

  // 13. Undefined route catch-all
  await test("Catch-all middleware returns 404 for undefined endpoints", async () => {
    const res = await simulateRequest("/api/undefined-route");
    if (res.status !== 404) {
      throw new Error(`Expected 404, got ${res.status}`);
    }
  });

  // 14. POST validation: missing title
  await test("POST /books rejects request with missing title (HTTP 400)", async () => {
    const res = await simulateRequest("/books", "POST", {
      author: "George Orwell",
      price: 299,
      pages: 320,
    });
    if (res.status !== 400 || !res.data.error.includes("Title")) {
      throw new Error(`Expected 400 with missing title error, got ${res.status}: ${JSON.stringify(res.data)}`);
    }
  });

  // 15. POST validation: missing author
  await test("POST /books rejects request with missing author (HTTP 400)", async () => {
    const res = await simulateRequest("/books", "POST", {
      title: "Animal Farm",
      price: 299,
      pages: 140,
    });
    if (res.status !== 400 || !res.data.error.includes("Author")) {
      throw new Error(`Expected 400 with missing author error, got ${res.status}: ${JSON.stringify(res.data)}`);
    }
  });

  // 16. POST validation: non-numeric price
  await test("POST /books rejects request with non-numeric price (HTTP 400)", async () => {
    const res = await simulateRequest("/books", "POST", {
      title: "Animal Farm",
      author: "George Orwell",
      price: "three hundred",
      pages: 140,
    });
    if (res.status !== 400 || !res.data.error.includes("Price")) {
      throw new Error(`Expected 400 with price error, got ${res.status}: ${JSON.stringify(res.data)}`);
    }
  });

  // 17. POST validation: successful book creation (HTTP 201)
  await test("POST /books creates book successfully and returns HTTP 201", async () => {
    const newBook = {
      title: "Test Automation Book",
      author: "Test Author",
      price: 350,
      pages: 200,
    };
    const res = await simulateRequest("/books", "POST", newBook);
    if (res.status !== 201 || !res.data.bookId || res.data.message !== "Book Added Successfully") {
      throw new Error(`Expected 201 with bookId, got ${res.status}: ${JSON.stringify(res.data)}`);
    }
    // Clean up created test book so existing database records are preserved
    await simulateRequest(`/books/${res.data.bookId}`, "DELETE");
  });

  console.log("--------------------------------------------------");
  console.log(`Results: ${passed}/${total} tests passed.`);
  console.log("==================================================");

  process.exit(passed === total ? 0 : 1);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
