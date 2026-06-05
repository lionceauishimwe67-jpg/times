const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'faces.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create faces table to store face descriptors
  db.run(`
    CREATE TABLE IF NOT EXISTS faces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      photo_path TEXT,
      face_descriptor TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create recognition_logs table to store recognition attempts
  db.run(`
    CREATE TABLE IF NOT EXISTS recognition_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      face_id INTEGER,
      confidence REAL,
      match_found BOOLEAN,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (face_id) REFERENCES faces(id)
    )
  `);

  console.log('Database initialized successfully');
});

module.exports = db;
