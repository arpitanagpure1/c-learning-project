require("dotenv").config();
const express = require("express");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",  // Adjust based on your frontend
    methods: ["GET", "POST"],
    credentials: true
}));
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

// ✅ Ensure users table exists
db.query(
    `CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(100) PRIMARY KEY,
        fullname VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL
    )`,
    (err) => {
        if (err) console.error("Error creating users table:", err);
    }
);

// ✅ Ensure scores table exists
db.query(
    `CREATE TABLE IF NOT EXISTS scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        concept_id INT NOT NULL,
        level1_score INT DEFAULT 0,
        level2_score INT DEFAULT 0,
        level3_score INT DEFAULT 0,
        total_score INT GENERATED ALWAYS AS (level1_score + level2_score + level3_score) STORED,
        UNIQUE (email, concept_id),
        FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
    )`,
    (err) => {
        if (err) console.error("Error creating scores table:", err);
    }
);

// ✅ Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "start.html"));
});

app.get("/option", (req, res) => {
    res.sendFile(path.join(__dirname, "option.html"));
});

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

    const checkEmailQuery = "SELECT * FROM users WHERE email = ?";
    db.query(checkEmailQuery, [email], (err, result) => {
        if (err) return res.json({ success: false, message: "Server error!" });
        if (result.length > 0) return res.json({ success: false, message: "Email already registered!" });

        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.json({ success: false, message: "Error hashing password!" });

            const insertUserQuery = "INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)";
            db.query(insertUserQuery, [fullname, email, hash], (err) => {
                if (err) return res.json({ success: false, message: "Database error!" });
                return res.json({ success: true, message: "Registration successful!" });
            });
        });
    });
});

// ==================  🔵 USER LOGIN ROUTE  ================== //
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ success: false, message: "All fields are required!" });
    }

    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], (err, results) => {
        if (err) return res.json({ success: false, message: "Database error" });
        if (results.length === 0) return res.json({ success: false, message: "User not found!" });

        const user = results[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) return res.json({ success: false, message: "Error comparing passwords!" });
            if (!isMatch) return res.json({ success: false, message: "Incorrect password!" });

            return res.json({ 
                success: true, 
                message: "Login successful!", 
                username: user.fullname,
                email: user.email 
            });
        });
    });
});

// ==================  🟠 SUBMIT SCORE ROUTE  ================== //
app.post("/submit-score", (req, res) => {
    const { email, concept_id, level1_score, level2_score, level3_score } = req.body;

    console.log("📩 Received request data:", req.body);

    if (!email || !concept_id) {
        console.error("❌ Missing email or concept ID!");
        return res.status(400).json({ message: "Email and concept ID are required!" });
    }

    // Check if the record exists
    db.query("SELECT * FROM scores WHERE email = ? AND concept_id = ?", [email, concept_id], (err, rows) => {
        if (err) {
            console.error("❌ Error checking existing score:", err);
            return res.status(500).json({ message: "Database error" });
        }

        if (rows.length === 0) {
            // No record exists → Insert new row
            const insertSQL = `INSERT INTO scores (email, concept_id, level1_score, level2_score, level3_score) 
                               VALUES (?, ?, ?, ?, ?)`;
            db.query(insertSQL, 
                [email, concept_id, level1_score || 0, level2_score || 0, level3_score || 0], 
                (insertErr) => {
                    if (insertErr) {
                        console.error("❌ Error inserting new score:", insertErr);
                        return res.status(500).json({ message: "Database error" });
                    }
                    console.log("✅ New score inserted successfully!");
                    return res.json({ message: "Score saved successfully!" });
                });

        } else {
            // Record exists → Update it
            const updateSQL = `UPDATE scores SET 
                level1_score = COALESCE(?, level1_score), 
                level2_score = COALESCE(?, level2_score), 
                level3_score = COALESCE(?, level3_score) 
                WHERE email = ? AND concept_id = ?`;
            db.query(updateSQL, 
                [level1_score, level2_score, level3_score, email, concept_id], 
                (updateErr) => {
                    if (updateErr) {
                        console.error("❌ Error updating score:", updateErr);
                        return res.status(500).json({ message: "Database error" });
                    }
                    console.log("✅ Score updated successfully!");
                    return res.json({ message: "Score updated successfully!" });
                });
        }
    });
});

// ==================  🟡 START SERVER  ================== //
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});