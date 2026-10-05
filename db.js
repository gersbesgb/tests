// Tiny SQLite data layer. One file, no separate database server to run.
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// On Render (or anywhere with ephemeral local disk), set DATA_DIR to a
// mounted persistent Disk path, e.g. DATA_DIR=/var/data — otherwise the
// database resets on every redeploy/restart.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "indium.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    username_ci   TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS license_keys (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    key          TEXT UNIQUE NOT NULL,
    user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    note         TEXT,
    status       TEXT NOT NULL DEFAULT 'active',   -- active | revoked
    expires_at   TEXT,                              -- ISO date, or NULL = lifetime
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    activated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    key_id     INTEGER REFERENCES license_keys(id) ON DELETE SET NULL,
    item       TEXT NOT NULL,
    amount     TEXT NOT NULL,        -- e.g. "$9.00" — store the display string, keep it simple
    note       TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
