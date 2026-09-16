const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { checkAndGrantMilestones } = require('../lib/rewards');

const router = express.Router();

const SHARE_TYPES = new Set(['stamped', 'basic']);

function findReferrerByCode(code) {
  if (!code) return null;
  return db.prepare('SELECT id, referral_code FROM users WHERE referral_code = ?').get(code) || null;
}

function upsertRecord(referrerUserId, referralCode, skillId, shareType) {
  const existing = db
    .prepare('SELECT id FROM referral_records WHERE referrer_user_id = ? AND skill_id = ? AND share_type = ?')
    .get(referrerUserId, skillId, shareType);
  if (existing) return existing.id;
  const info = db
    .prepare(
      'INSERT INTO referral_records (referrer_user_id, referral_code, skill_id, share_type) VALUES (?, ?, ?, ?)'
    )
    .run(referrerUserId, referralCode, skillId, shareType);
  return info.lastInsertRowid;
}

router.post('/referral/share', requireAuth, (req, res) => {
  const { skill_id, share_type } = req.body || {};
  if (!skill_id || !SHARE_TYPES.has(share_type)) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  const user = db.prepare('SELECT referral_code FROM users WHERE id = ?').get(req.user.id);
  if (!user?.referral_code) return res.status(404).json({ error: '用户不存在' });

  const recordId = upsertRecord(req.user.id, user.referral_code, skill_id, share_type);
  db.prepare('UPDATE referral_records SET share_count = share_count + 1 WHERE id = ?').run(recordId);

  res.json({ referral_code: user.referral_code });
});

router.post('/referral/click', (req, res) => {
  const { ref, skill_id, share_type } = req.body || {};
  if (!ref || !skill_id || !SHARE_TYPES.has(share_type)) {
    return res.json({ ok: true });
  }
  const referrer = findReferrerByCode(ref);
  if (!referrer) return res.json({ ok: true });

  const recordId = upsertRecord(referrer.id, referrer.referral_code, skill_id, share_type);
  db.prepare('UPDATE referral_records SET click_count = click_count + 1 WHERE id = ?').run(recordId);

  res.json({ ok: true });
});

router.post('/referral/track-click', (req, res) => {
  const { ref, device_fingerprint } = req.body || {};
  if (!ref) return res.json({ ok: true });

  const referrer = findReferrerByCode(ref);
  if (!referrer) return res.json({ ok: true });

  const dedupKey = `${req.ip || ''}|${device_fingerprint || ''}`;
  const recent = db
    .prepare(
      `SELECT 1 FROM share_click_logs
       WHERE referrer_user_id = ? AND dedup_key = ? AND created_at >= datetime('now', '-1 day')`
    )
    .get(referrer.id, dedupKey);

  if (!recent) {
    db.prepare('INSERT INTO share_click_logs (referrer_user_id, dedup_key) VALUES (?, ?)').run(
      referrer.id,
      dedupKey
    );
    const info = db
      .prepare('UPDATE users SET share_click_count = share_click_count + 1 WHERE id = ?')
      .run(referrer.id);
    if (info.changes > 0) {
      const updated = db.prepare('SELECT share_click_count FROM users WHERE id = ?').get(referrer.id);
      checkAndGrantMilestones(referrer.id, 'share_click', updated.share_click_count);
    }
  }

  res.json({ ok: true });
});

module.exports = router;
module.exports.findReferrerByCode = findReferrerByCode;
module.exports.upsertRecord = upsertRecord;
