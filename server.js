require("dotenv").config();
const express = require("express");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// ✅ Connect to MySQL Database
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error("❌ Database connection failed:", err);
    } else {
        console.log("✅ Connected to MySQL database!");
    }
});

// ✅ Create "scores" table if not exists (same database, separate table)
db.query(
    `CREATE TABLE IF NOT EXISTS scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        score INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    (err) => {
        if (err) console.error("Error creating scores table:", err);
    }
);

// ✅ Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// ✅ Serve "start.html" as the main page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "start.html"));
});

// ✅ Serve "option.html" when "Start Learning" is clicked
app.get("/option", (req, res) => {
    res.sendFile(path.join(__dirname, "option.html"));
});

// ✅ Serve "register.html" (Registration Page)
app.get("/register-page", (req, res) => {
    res.sendFile(path.join(__dirname, "register.html"));
});

// ==================  🟢 USER REGISTRATION ROUTE  ================== //
app.post("/register", (req, res) => {
    const { fullname, email, password, retypePassword } = req.body;

    if (!fullname || !email || !password || !retypePassword) {
        return res.json({ success: false, message: "All fields are required!" });
    }

    if (password !== retypePassword) {
        return res.json({ success: false, message: "Passwords do not match!" });
    }

    // Check if email already exists
    const checkEmailQuery = "SELECT * FROM users WHERE email = ?";
    db.query(checkEmailQuery, [email], (err, result) => {
        if (err) return res.json({ success: false, message: "Server error!" });
        if (result.length > 0) return res.json({ success: false, message: "Email already registered!" });

        // Hash password and insert user
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.json({ success: false, message: "Error hashing password!" });

            const insertUserQuery = "INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)";
            db.query(insertUserQuery, [fullname, email, hash], (err, result) => {
                if (err) return res.json({ success: false, message: "Database error!" });

                return res.json({ success: true, message: "Registration successful!" });
            });
        });
    });
});

// ==================  🔵 USER LOGIN ROUTE  ================== //
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    const findUserQuery = "SELECT * FROM users WHERE email = ?";
    db.query(findUserQuery, [email], (err, result) => {
        if (err) return res.json({ success: false, message: "Server error!" });
        if (result.length === 0) return res.json({ success: false, message: "Invalid email or password!" });

        bcrypt.compare(password, result[0].password, (err, isMatch) => {
            if (!isMatch) return res.json({ success: false, message: "Invalid email or password!" });

            return res.json({ success: true, message: "Login successful!" });
        });
    });
});

// ==================  🟡 START SERVER  ================== //
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
