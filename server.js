
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

