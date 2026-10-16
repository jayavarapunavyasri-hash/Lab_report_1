# BDF Lab 01 - Node.js & Express Basics

A foundational backend development lab demonstrating how to build web servers using both Node.js built-in `http` module and the Express.js framework.

---

## 👤 Author Information

- **Name:** G. Meghana
- **Section:** CSE GEN-AI-2A

---

## 📁 Project Structure

```text
BDF-Lab-01/
├── node_modules/         # Installed dependencies (git ignored)
├── .gitignore            # Git ignore file
├── package.json          # Project metadata & dependencies
├── package-lock.json     # Dependency lockfile
├── plain-server.js       # Basic server using Node.js 'http' module
├── server-http.js        # Express.js server with routes and 404 handler
└── README.md             # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18 or higher recommended) installed.

Check versions:
```bash
node -v
npm -v
```

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/meghanagogineni919-stack/LAB-1.git
cd LAB-1
npm install
```

---

## 💻 Running the Servers

### 1. Plain HTTP Server
Runs a lightweight server built with the native Node.js `http` module:

```bash
node plain-server.js
```
- **URL:** [http://localhost:3000](http://localhost:3000)
- **Response:** Plain text `"Hello"`

---

### 2. Express Server
Runs an Express.js server with route handling:

```bash
node server-http.js
```
- **URL:** [http://localhost:3000](http://localhost:3000)

---

## 📡 API Endpoints (Express Server)

| Method | Endpoint | Description | Sample Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Welcome page | `Welcome to my Node.js and Express Lab!` |
| `GET` | `/about` | Student / author details | `{"name": "G. Meghana", "section": "CSE GEN-AI-2A"}` |
| `GET` | `/time` | Current date and timestamp | `{"currentDateTime": "2026-10-16T10:30:00.000Z"}` |
| `*` | Any other route | 404 error handler | `404 - Page Not Found` |

---

## 🛠️ Built With

- [Node.js](https://nodejs.org/) - JavaScript Runtime
- [Express.js](https://expressjs.com/) - Web framework for Node.js