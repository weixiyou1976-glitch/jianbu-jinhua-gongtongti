const db = require('../db');

function migrateTrialToUser(trialId, targetUserId) {
  const trial = db.prepare('SELECT * FROM trial_users WHERE id = ?').get(trialId);
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(targetUserId);
  if (!trial || !user) return { ok: false, error: '体验记录或学员账号不存在' };

  db.prepare(
    `UPDATE users SET
       wechat_id = ?,
       trial_concern = ?,
       trial_skill_id = ?,
       trial_referred_by = ?,
       trial_converted_at = datetime('now')
     WHERE id = ?`
  ).run(trial.wechat_id, trial.concern || null, trial.matched_skill_id || null, trial.referred_by || null, user.id);

  const trialMessages = db
    .prepare('SELECT role, content, created_at FROM trial_coach_messages WHERE trial_user_id = ? ORDER BY id ASC')
    .all(trial.id);

  let migratedMessages = 0;
  if (trialMessages.length > 0 && trial.matched_skill_id) {
    const insert = db.prepare(
      'INSERT INTO coach_messages (user_id, skill_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    const tx = db.transaction((rows) => {
      for (const m of rows) insert.run(user.id, trial.matched_skill_id, m.role, m.content, m.created_at);
    });
    tx(trialMessages);
    migratedMessages = trialMessages.length;
  }

  const trialStamps = db
    .prepare('SELECT skill_id, learned, practiced, gained, created_at FROM trial_stamps WHERE trial_user_id = ?')
    .all(trial.id);

  let migratedStamps = 0;
  if (trialStamps.length > 0) {
    const insertStamp = db.prepare(
      'INSERT INTO stamps (user_id, skill_id, learned, practiced, gained, submitted_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const txStamps = db.transaction((rows) => {
      for (const s of rows) insertStamp.run(user.id, s.skill_id, s.learned, s.practiced, s.gained, s.created_at);
    });
    txStamps(trialStamps);
    migratedStamps = trialStamps.length;
  }

  return { ok: true, migrated_messages: migratedMessages, migrated_stamps: migratedStamps };
}

module.exports = { migrateTrialToUser };
