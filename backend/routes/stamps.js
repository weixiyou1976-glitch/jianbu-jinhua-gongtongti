const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/skills/:id/stamp', requireAuth, (req, res) => {
  const { learned, practiced, gained } = req.body || {};
  if (!learned || !practiced || !gained) {
    return res.status(400).json({ error: '我学了/我练了/我得到了 三项均为必填' });
  }
  const skill = db.prepare('SELECT id FROM skills WHERE id = ?').get(req.params.id);
  if (!skill) return res.status(404).json({ error: 'Skill不存在' });

  const existing = db
    .prepare('SELECT id FROM stamps WHERE user_id = ? AND skill_id = ?')
    .get(req.user.id, skill.id);
  if (existing) return res.status(400).json({ error: '该Skill已提交过策印' });

  const tx = db.transaction(() => {
    const info = db
      .prepare(
        'INSERT INTO stamps (user_id, skill_id, learned, practiced, gained) VALUES (?, ?, ?, ?, ?)'
      )
      .run(req.user.id, skill.id, learned, practiced, gained);
    db.prepare(
      'INSERT OR IGNORE INTO checkins (user_id, skill_id) VALUES (?, ?)'
    ).run(req.user.id, skill.id);
    return info.lastInsertRowid;
  });

  const stampId = tx();
  const count = db
    .prepare('SELECT COUNT(*) AS c FROM stamps WHERE user_id = ?')
    .get(req.user.id).c;
  const stamp = db.prepare('SELECT * FROM stamps WHERE id = ?').get(stampId);
  res.json({ stamp, stamp_number: count });
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
