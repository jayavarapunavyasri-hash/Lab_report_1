# BDF Lab 01 - Node.js & Express Basics

A foundational backend development lab demonstrating how to build web servers using both Node.js built-in `http` module and the Express.js framework.

---

## 🌐 Live Deployment

🔗 **Live URL:** [https://lab01-silk.vercel.app/](https://lab01-silk.vercel.app/)

- 🏠 **Home:** [https://lab01-silk.vercel.app/](https://lab01-silk.vercel.app/)
- 👤 **About:** [https://lab01-silk.vercel.app/about](https://lab01-silk.vercel.app/about)
- ⏰ **Time:** [https://lab01-silk.vercel.app/time](https://lab01-silk.vercel.app/time)

---

## 👤 Author Information

- **Name:** G. Meghana
- **Section:** CSE GEN-AI-2A

---

## 📁 Project Structure

```text
BDF-Lab-01/
├── api/                  # Vercel serverless entry point
├── node_modules/         # Installed dependencies (git ignored)
├── screenshots/          # Output and verification screenshots
├── .gitignore            # Git ignore file
├── package.json          # Project metadata & dependencies
├── package-lock.json     # Dependency lockfile
├── plain-server.js       # Basic server using Node.js 'http' module
├── server-http.js        # Express.js server with routes and 404 handler
├── vercel.json           # Vercel deployment & routing config
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

| Method | Endpoint | Live Link | Description | Sample Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | [Open /](https://lab01-silk.vercel.app/) | Welcome page | `Welcome to my Node.js and Express Lab!` |
| `GET` | `/about` | [Open /about](https://lab01-silk.vercel.app/about) | Student / author details | `{"name": "G. Meghana", "section": "CSE GEN-AI-2A"}` |
| `GET` | `/time` | [Open /time](https://lab01-silk.vercel.app/time) | Current date and timestamp | `{"currentDateTime": "2026-10-16T15:46:26.261Z"}` |
| `*` | Any other route | [Open /random](https://lab01-silk.vercel.app/random) | 404 error handler | `404 - Page Not Found` |

---

## 📸 Screenshots

| Lab Execution & Output |
| :---: |
| ![Welcome & Output](screenshots/Screenshot%202026-10-16%20155259.png) |
| ![About Route](screenshots/Screenshot%202026-10-16%20155602.png) |
| ![Time Route](screenshots/Screenshot%202026-10-16%20155620.png) |
| ![Terminal Execution](screenshots/Screenshot%202026-10-16%20155635.png) |

---

## 🛠️ Built With

- [Node.js](https://nodejs.org/) - JavaScript Runtime
- [Express.js](https://expressjs.com/) - Web framework for Node.js