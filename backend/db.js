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
  key_question TEXT NOT NULL DEFAULT '',
  step_one TEXT NOT NULL,
  step_two TEXT NOT NULL,
  step_three TEXT NOT NULL,
  memory_anchor TEXT NOT NULL,
  insight TEXT NOT NULL,
  case_study TEXT NOT NULL,
  cognitive_reframe TEXT NOT NULL,
  growth_friction TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_tags (
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  tag TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skill_tags_tag ON skill_tags(tag);
CREATE INDEX IF NOT EXISTS idx_skill_tags_skill_id ON skill_tags(skill_id);

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

CREATE TABLE IF NOT EXISTS modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS module_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  stage_order INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_module_items_module ON module_items(module_id);
CREATE INDEX IF NOT EXISTS idx_module_items_skill ON module_items(skill_id);

CREATE TABLE IF NOT EXISTS coach_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_coach_messages_user_skill ON coach_messages(user_id, skill_id, id);

CREATE TABLE IF NOT EXISTS trial_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wechat_id TEXT UNIQUE NOT NULL,
  concern TEXT NOT NULL DEFAULT '',
  matched_skill_id INTEGER REFERENCES skills(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  converted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS trial_coach_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trial_user_id INTEGER NOT NULL REFERENCES trial_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trial_coach_messages_trial ON trial_coach_messages(trial_user_id, id);

CREATE TABLE IF NOT EXISTS referral_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  share_type TEXT NOT NULL CHECK (share_type IN ('stamped', 'basic')),
  share_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  trial_count INTEGER NOT NULL DEFAULT 0,
  converted_count INTEGER NOT NULL DEFAULT 0,
  settled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(referrer_user_id, skill_id, share_type)
);

CREATE INDEX IF NOT EXISTS idx_referral_records_code ON referral_records(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_records_referrer ON referral_records(referrer_user_id);

CREATE TABLE IF NOT EXISTS referral_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  commission_per_conversion REAL NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO referral_settings (id, commission_per_conversion) VALUES (1, 0);
`);

const skillColumns = db.prepare(`PRAGMA table_info(skills)`).all().map((c) => c.name);
if (!skillColumns.includes('growth_friction')) {
  db.exec(`ALTER TABLE skills ADD COLUMN growth_friction TEXT NOT NULL DEFAULT ''`);
}
if (!skillColumns.includes('key_question')) {
  db.exec(`ALTER TABLE skills ADD COLUMN key_question TEXT NOT NULL DEFAULT ''`);
}
if (!skillColumns.includes('tags')) {
  db.exec(`ALTER TABLE skills ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'`);
}
if (!skillColumns.includes('status')) {
  db.exec(`ALTER TABLE skills ADD COLUMN status TEXT NOT NULL DEFAULT 'published'`);
}
if (!skillColumns.includes('insight_audio_url')) {
  db.exec(`ALTER TABLE skills ADD COLUMN insight_audio_url TEXT NOT NULL DEFAULT ''`);
}

const userColumns = db.prepare(`PRAGMA table_info(users)`).all().map((c) => c.name);
if (!userColumns.includes('referral_code')) {
  db.exec(`ALTER TABLE users ADD COLUMN referral_code TEXT`);
}
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL`);

const trialUserColumns = db.prepare(`PRAGMA table_info(trial_users)`).all().map((c) => c.name);
if (!trialUserColumns.includes('referred_by')) {
  db.exec(`ALTER TABLE trial_users ADD COLUMN referred_by TEXT`);
}
if (!trialUserColumns.includes('referred_skill_id')) {
  db.exec(`ALTER TABLE trial_users ADD COLUMN referred_skill_id INTEGER`);
}
if (!trialUserColumns.includes('referred_share_type')) {
  db.exec(`ALTER TABLE trial_users ADD COLUMN referred_share_type TEXT`);
}

const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateReferralCode() {
  let code;
  do {
    code = Array.from({ length: 6 }, () => REFERRAL_CODE_ALPHABET[Math.floor(Math.random() * REFERRAL_CODE_ALPHABET.length)]).join('');
  } while (db.prepare('SELECT 1 FROM users WHERE referral_code = ?').get(code));
  return code;
}

const usersMissingCode = db.prepare('SELECT id FROM users WHERE referral_code IS NULL').all();
if (usersMissingCode.length > 0) {
  const assignCode = db.prepare('UPDATE users SET referral_code = ? WHERE id = ?');
  for (const u of usersMissingCode) {
    assignCode.run(generateReferralCode(), u.id);
  }
}

function setSkillTags(skillId, tags) {
  db.prepare('DELETE FROM skill_tags WHERE skill_id = ?').run(skillId);
  const insert = db.prepare('INSERT INTO skill_tags (skill_id, tag) VALUES (?, ?)');
  for (const tag of tags) insert.run(skillId, tag);
}

function getModuleSkillIdSet() {
  return new Set(db.prepare('SELECT DISTINCT skill_id FROM module_items').all().map((r) => r.skill_id));
}

module.exports = db;
module.exports.setSkillTags = setSkillTags;
module.exports.getModuleSkillIdSet = getModuleSkillIdSet;
module.exports.generateReferralCode = generateReferralCode;
