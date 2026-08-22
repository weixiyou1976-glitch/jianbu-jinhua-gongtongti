const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './data/jianbu.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  activation_code TEXT NOT NULL,
  activated_at TEXT NOT NULL,
  enrolled_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activation_codes (
  code TEXT PRIMARY KEY,
  used INTEGER NOT NULL DEFAULT 0,
  used_by INTEGER REFERENCES users(id),
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  category TEXT NOT NULL,
  trigger_condition TEXT NOT NULL,
  step_one TEXT NOT NULL,
  step_two TEXT NOT NULL,
  step_three TEXT NOT NULL,
  memory_anchor TEXT NOT NULL,
  insight TEXT NOT NULL,
  case_study TEXT NOT NULL,
  cognitive_reframe TEXT NOT NULL,
  growth_friction TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stamps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  learned TEXT NOT NULL,
  practiced TEXT NOT NULL,
  gained TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  checked_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, skill_id)
);
`);

const skillColumns = db.prepare(`PRAGMA table_info(skills)`).all().map((c) => c.name);
if (!skillColumns.includes('growth_friction')) {
  db.exec(`ALTER TABLE skills ADD COLUMN growth_friction TEXT NOT NULL DEFAULT ''`);
}

module.exports = db;
