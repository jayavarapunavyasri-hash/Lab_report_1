# Backend Development Fundamentals - Lab 3

## Student Details
- Name: Jayavarapu Navya Sri
- Registration Number: 252U1R6100

## Project Description
REST API with query parameters, validation, and debugging using Node.js, Express, and SQLite.

## Local API URL
http://localhost:3000/books

## Live Deployment
Deployment pending.

## Screenshots

### 1. Default Book List (`GET /books`)
![Default Books](screenshots/1_get_books.png)

### 2. Search Books by Title (`GET /books?search_q=harry`)
![Search Title](screenshots/2_get_books_search_q.png)

### 3. Sort by Price Descending (`GET /books?order_by=price&order=DESC`)
![Sort Price Desc](screenshots/3_get_books_order_by_price_desc.png)

### 4. Filter by Price Range (`GET /books?min_price=100&max_price=500`)
![Price Filter 100 to 500](screenshots/4_get_books_price_range.png)

### 5. Pagination (`GET /books?limit=5&offset=0`)
![Pagination Limit 5 Offset 0](screenshots/5_get_books_pagination_limit_offset.png)

### 6. Read Single Book by ID (`GET /books/5/`)
![Get Single Book ID 5](screenshots/6_get_book_by_id_5.png)

### 7. Create New Book (`POST /books`)
![Create Book 201 Created](screenshots/7_post_book_201_created.png)

### 8. Update Non-Existent Book (`PUT /books/1` - 404 Not Found)
![Update Book 404](screenshots/8_put_book_404_not_found.png)

### 9. Pagination (`GET /books?limit=2&offset=0`)
![Pagination Limit 2 Offset 0](screenshots/9_get_books_limit_2_offset_0.png)

### 10. Price Range Filter (`GET /books?min_price=200&max_price=800`)
![Price Filter 200 to 800](screenshots/10_get_books_price_range_200_800.png)

### 11. Delete Book by ID (`DELETE /books/4`)
![Delete Book ID 4](screenshots/11_delete_book_by_id_4.png)
