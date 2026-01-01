const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "data.db");
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Initialize database and create USERS table
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS USERS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);
  console.log("✓ Database initialized with USERS table");
}

// Create a new user
function createUser(name, email, password) {
  try {
    const stmt = db.prepare(
      "INSERT INTO USERS (name, email, password) VALUES (?, ?, ?)"
    );
    const result = stmt.run(name, email, password);
    return { id: result.lastInsertRowid, name, email, password };
  } catch (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
}

// Get user by email
function getUserByEmail(email) {
  try {
    const stmt = db.prepare("SELECT * FROM USERS WHERE email = ?");
    const user = stmt.get(email);
    return user || null;
  } catch (error) {
    throw new Error(`Failed to get user by email: ${error.message}`);
  }
}

// Edit user
function editUser(id, name, email, password) {
  try {
    const stmt = db.prepare(
      "UPDATE USERS SET name = ?, email = ?, password = ? WHERE id = ?"
    );
    const result = stmt.run(name, email, password, id);
    if (result.changes === 0) {
      throw new Error("User not found");
    }
    return { id, name, email, password };
  } catch (error) {
    throw new Error(`Failed to edit user: ${error.message}`);
  }
}

// Initialize the database on load
initializeDatabase();

module.exports = {
  db,
  createUser,
  getUserByEmail,
  editUser,
};
