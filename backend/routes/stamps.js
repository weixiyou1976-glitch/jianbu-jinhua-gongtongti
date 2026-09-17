const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { checkAndGrantGrowthLevel } = require('../lib/growth');

const router = express.Router();

router.post('/skills/:id/stamp', requireAuth, (req, res) => {
  const { learned, practiced, gained } = req.body || {};
  if (!learned || !practiced || !gained) {
    return res.status(400).json({ error: '我学了/我练了/我得到了 三项均为必填' });
  }
  const skill = db.prepare('SELECT id FROM skills WHERE id = ?').get(req.params.id);
  if (!skill) return res.status(404).json({ error: 'Skill不存在' });

  const info = db
    .prepare(
      'INSERT INTO stamps (user_id, skill_id, learned, practiced, gained) VALUES (?, ?, ?, ?, ?)'
    )
    .run(req.user.id, skill.id, learned, practiced, gained);

  const today = new Date().toISOString().slice(0, 10);
  db.prepare(
    `INSERT INTO practice_checkins (user_id, checkin_date, stamp_count) VALUES (?, ?, 1)
     ON CONFLICT(user_id, checkin_date) DO UPDATE SET stamp_count = stamp_count + 1`
  ).run(req.user.id, today);

  checkAndGrantGrowthLevel(req.user.id);

  const count = db
    .prepare('SELECT COUNT(*) AS c FROM stamps WHERE user_id = ?')
    .get(req.user.id).c;
  const stamp = db.prepare('SELECT * FROM stamps WHERE id = ?').get(info.lastInsertRowid);
  res.json({ stamp, stamp_number: count });
});

router.get('/skills/:id/stamps', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM stamps WHERE user_id = ? AND skill_id = ? ORDER BY submitted_at DESC')
    .all(req.user.id, req.params.id);
  res.json(rows);
});

router.get('/stamps', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT stamps.*, skills.title AS skill_title, skills.skill_name
       FROM stamps JOIN skills ON skills.id = stamps.skill_id
       WHERE stamps.user_id = ?
       ORDER BY stamps.submitted_at DESC`
    )
    .all(req.user.id);
  const total = rows.length;
  const withNumbers = rows.map((r, idx) => ({ ...r, stamp_number: total - idx }));
  res.json(withNumbers);
});

module.exports = router;
