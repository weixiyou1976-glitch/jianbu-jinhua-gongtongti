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
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stamps_user_skill ON stamps(user_id, skill_id, submitted_at);

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
  email TEXT UNIQUE NOT NULL,
  concern TEXT NOT NULL DEFAULT '',
  matched_skill_id INTEGER REFERENCES skills(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  converted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS trial_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'active', 'expired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  first_used_at TEXT,
  expires_at TEXT,
  converted INTEGER NOT NULL DEFAULT 0,
  concern TEXT NOT NULL DEFAULT '',
  matched_skill_id INTEGER REFERENCES skills(id)
);

CREATE TABLE IF NOT EXISTS trial_account_coach_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trial_account_id INTEGER NOT NULL REFERENCES trial_accounts(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trial_account_coach_messages_trial ON trial_account_coach_messages(trial_account_id, id);

CREATE TABLE IF NOT EXISTS trial_account_stamps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trial_account_id INTEGER NOT NULL REFERENCES trial_accounts(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  learned TEXT NOT NULL,
  practiced TEXT NOT NULL,
  gained TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trial_account_stamps_trial ON trial_account_stamps(trial_account_id);

CREATE TABLE IF NOT EXISTS trial_coach_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trial_user_id INTEGER NOT NULL REFERENCES trial_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trial_coach_messages_trial ON trial_coach_messages(trial_user_id, id);

CREATE TABLE IF NOT EXISTS trial_stamps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trial_user_id INTEGER NOT NULL REFERENCES trial_users(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  learned TEXT NOT NULL,
  practiced TEXT NOT NULL,
  gained TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trial_stamps_trial ON trial_stamps(trial_user_id);

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

CREATE TABLE IF NOT EXISTS daily_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user ON daily_checkins(user_id, checkin_date);

CREATE TABLE IF NOT EXISTS learning_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_date TEXT NOT NULL,
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_learning_checkins_user ON learning_checkins(user_id, checkin_date);

CREATE TABLE IF NOT EXISTS practice_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_date TEXT NOT NULL,
  stamp_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_practice_checkins_user ON practice_checkins(user_id, checkin_date);

CREATE TABLE IF NOT EXISTS temporary_unlocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  unlock_reason TEXT NOT NULL CHECK (unlock_reason IN ('ai_match', 'trial')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_temporary_unlocks_lookup ON temporary_unlocks(user_id, skill_id, expires_at);

CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT NOT NULL DEFAULT '',
  first_login_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);

CREATE TABLE IF NOT EXISTS saved_quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  quote_content TEXT NOT NULL,
  saved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_saved_quotes_user ON saved_quotes(user_id, saved_at);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('share_click', 'conversion')),
  milestone INTEGER NOT NULL,
  reward_content TEXT NOT NULL,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_notified INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, reward_type, milestone)
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON referral_rewards(user_id);

CREATE TABLE IF NOT EXISTS growth_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  title TEXT NOT NULL,
  achieved_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_notified INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, level)
);

CREATE INDEX IF NOT EXISTS idx_growth_achievements_user ON growth_achievements(user_id);

CREATE TABLE IF NOT EXISTS fangs_voice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  required_share_clicks INTEGER NOT NULL DEFAULT 0,
  required_conversions INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS commission_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  beneficiary_user_id INTEGER NOT NULL,
  payer_user_id INTEGER NOT NULL REFERENCES users(id),
  commission_type TEXT NOT NULL CHECK (commission_type IN ('first_year', 'renewal')),
  order_amount REAL NOT NULL,
  commission_rate REAL NOT NULL,
  commission_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_commission_records_beneficiary ON commission_records(beneficiary_user_id, status);

CREATE TABLE IF NOT EXISTS share_click_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dedup_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_share_click_logs_lookup ON share_click_logs(referrer_user_id, dedup_key, created_at);

CREATE TABLE IF NOT EXISTS review_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  review_round INTEGER NOT NULL CHECK (review_round IN (1, 2, 3, 4)),
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  opened INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, skill_id, review_round)
);

CREATE INDEX IF NOT EXISTS idx_review_reminders_user ON review_reminders(user_id, opened);
`);

const stampIndexes = db.prepare(`PRAGMA index_list(stamps)`).all();
const stampsHasOldUniqueConstraint = stampIndexes.some((idx) => idx.unique === 1 && idx.origin === 'u');
if (stampsHasOldUniqueConstraint) {
  db.exec(`
    CREATE TABLE stamps_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      skill_id INTEGER NOT NULL REFERENCES skills(id),
      learned TEXT NOT NULL,
      practiced TEXT NOT NULL,
      gained TEXT NOT NULL,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO stamps_new (id, user_id, skill_id, learned, practiced, gained, submitted_at)
      SELECT id, user_id, skill_id, learned, practiced, gained, submitted_at FROM stamps;
    DROP TABLE stamps;
    ALTER TABLE stamps_new RENAME TO stamps;
    CREATE INDEX IF NOT EXISTS idx_stamps_user_skill ON stamps(user_id, skill_id, submitted_at);
  `);
}

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
if (!skillColumns.includes('growth_friction_ending')) {
  db.exec(`ALTER TABLE skills ADD COLUMN growth_friction_ending TEXT NOT NULL DEFAULT ''`);
}
if (!skillColumns.includes('display_order')) {
  db.exec(`ALTER TABLE skills ADD COLUMN display_order INTEGER DEFAULT NULL`);
}

const userColumns = db.prepare(`PRAGMA table_info(users)`).all().map((c) => c.name);
if (!userColumns.includes('referral_code')) {
  db.exec(`ALTER TABLE users ADD COLUMN referral_code TEXT`);
}
if (!userColumns.includes('device_limit')) {
  db.exec(`ALTER TABLE users ADD COLUMN device_limit INTEGER NOT NULL DEFAULT 2`);
}
if (!userColumns.includes('account_locked')) {
  db.exec(`ALTER TABLE users ADD COLUMN account_locked INTEGER NOT NULL DEFAULT 0`);
}
if (!userColumns.includes('locked_reason')) {
  db.exec(`ALTER TABLE users ADD COLUMN locked_reason TEXT`);
}
if (!userColumns.includes('share_click_count')) {
  db.exec(`ALTER TABLE users ADD COLUMN share_click_count INTEGER NOT NULL DEFAULT 0`);
}
if (!userColumns.includes('conversion_count')) {
  db.exec(`ALTER TABLE users ADD COLUMN conversion_count INTEGER NOT NULL DEFAULT 0`);
}
if (!userColumns.includes('referral_level_share')) {
  db.exec(`ALTER TABLE users ADD COLUMN referral_level_share INTEGER NOT NULL DEFAULT 0`);
}
if (!userColumns.includes('referral_level_conversion')) {
  db.exec(`ALTER TABLE users ADD COLUMN referral_level_conversion INTEGER NOT NULL DEFAULT 0`);
}
if (!userColumns.includes('has_double_quote')) {
  db.exec(`ALTER TABLE users ADD COLUMN has_double_quote INTEGER NOT NULL DEFAULT 0`);
}
if (!userColumns.includes('quote_discount')) {
  db.exec(`ALTER TABLE users ADD COLUMN quote_discount REAL NOT NULL DEFAULT 1.0`);
}
if (!userColumns.includes('referrer_id')) {
  db.exec(`ALTER TABLE users ADD COLUMN referrer_id INTEGER REFERENCES users(id)`);
}
if (!userColumns.includes('referral_commission_rate')) {
  db.exec(`ALTER TABLE users ADD COLUMN referral_commission_rate REAL NOT NULL DEFAULT 0`);
}
if (!userColumns.includes('wechat_id')) {
  db.exec(`ALTER TABLE users ADD COLUMN wechat_id TEXT`);
}
if (!userColumns.includes('trial_concern')) {
  db.exec(`ALTER TABLE users ADD COLUMN trial_concern TEXT`);
}
if (!userColumns.includes('trial_skill_id')) {
  db.exec(`ALTER TABLE users ADD COLUMN trial_skill_id INTEGER REFERENCES skills(id)`);
}
if (!userColumns.includes('trial_referred_by')) {
  db.exec(`ALTER TABLE users ADD COLUMN trial_referred_by TEXT`);
}
if (!userColumns.includes('trial_converted_at')) {
  db.exec(`ALTER TABLE users ADD COLUMN trial_converted_at TEXT`);
}
if (!userColumns.includes('welcome_shown')) {
  db.exec(`ALTER TABLE users ADD COLUMN welcome_shown INTEGER NOT NULL DEFAULT 0`);
}
if (!userColumns.includes('growth_level')) {
  db.exec(`ALTER TABLE users ADD COLUMN growth_level INTEGER NOT NULL DEFAULT 0`);
}
if (!userColumns.includes('growth_title')) {
  db.exec(`ALTER TABLE users ADD COLUMN growth_title TEXT`);
}
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL`);

let trialUserColumns = db.prepare(`PRAGMA table_info(trial_users)`).all().map((c) => c.name);
if (trialUserColumns.includes('wechat_id') && !trialUserColumns.includes('email')) {
  db.exec(`ALTER TABLE trial_users RENAME COLUMN wechat_id TO email`);
  trialUserColumns = db.prepare(`PRAGMA table_info(trial_users)`).all().map((c) => c.name);
}
if (!trialUserColumns.includes('referred_by')) {
  db.exec(`ALTER TABLE trial_users ADD COLUMN referred_by TEXT`);
}
if (!trialUserColumns.includes('referred_skill_id')) {
  db.exec(`ALTER TABLE trial_users ADD COLUMN referred_skill_id INTEGER`);
}
if (!trialUserColumns.includes('converted_user_id')) {
  db.exec(`ALTER TABLE trial_users ADD COLUMN converted_user_id INTEGER REFERENCES users(id)`);
}
if (!trialUserColumns.includes('referred_share_type')) {
  db.exec(`ALTER TABLE trial_users ADD COLUMN referred_share_type TEXT`);
}

// 体验流程已从邮箱验证码改为预生成账号密码（trial_accounts），email_verifications表不再使用，清理残留。
db.exec(`DROP TABLE IF EXISTS email_verifications`);

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

require('./migrations/skills-225-230')(db);
require('./migrations/skills-231-236')(db);
require('./migrations/skills-237-242')(db);
require('./migrations/skills-243-248')(db);
require('./migrations/skills-249-254')(db);
require('./migrations/display-order')(db);

// 第234周录入时分类写成了"行动与适应能力类"，订正为库里已有的"行动与适应类"，避免筛选标签重复。
db.prepare(
  "UPDATE skills SET category = '行动与适应类' WHERE week_number = 234 AND category = '行动与适应能力类'"
).run();

// 第243/245/246/247/248周录入时新开了"自我认知与人生方向类"，统一并回库里已有的"自我认知类"。
db.prepare(
  "UPDATE skills SET category = '自我认知类' WHERE category = '自我认知与人生方向类'"
).run();

// 第179周insight里"银行/河岸"偷换概念的例子换成"自然的东西/天然成分"，只在旧例子还在时才替换。
{
  const week179 = db.prepare("SELECT insight FROM skills WHERE week_number = 179 AND insight LIKE '%河岸%'").get();
  if (week179) {
    const fixedInsight = week179.insight.replace(
      '例："银行（金融机构）很可靠，所以河岸（也叫银行）也很可靠"——荒谬的例子，但现实里的偷换往往更隐蔽。',
      '例："自然的东西都是好的，所以天然成分的产品一定对身体有益"——这里"自然"在第一句里是"符合自然规律"的意思，在第二句里悄悄变成了"天然提取、无人工成分"的意思，两个含义之间被偷偷替换了。现实里的偷换往往更隐蔽，不容易被察觉。'
    );
    db.prepare('UPDATE skills SET insight = ? WHERE week_number = 179').run(fixedInsight);
  }
}

module.exports = db;
module.exports.setSkillTags = setSkillTags;
module.exports.getModuleSkillIdSet = getModuleSkillIdSet;
module.exports.generateReferralCode = generateReferralCode;
