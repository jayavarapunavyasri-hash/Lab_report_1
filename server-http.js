
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// Route 1: Welcome page
app.get("/", (request, response) => {
    response.status(200).send("Welcome to my Node.js and Express Lab!");
});

// Route 2: About information
app.get("/about", (request, response) => {
    response.status(200).json({
        name: "G. Meghana",
        section: "CSE GEN-AI-2A "
    });
});

// Route 3: Current date and time
app.get("/time", (request, response) => {
    response.status(200).json({
        currentDateTime: new Date()
    });
});

// 404 handler for unknown paths
app.use((request, response) => {
    response.status(404).send("404 - Page Not Found");
});

// Start the server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Express server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
