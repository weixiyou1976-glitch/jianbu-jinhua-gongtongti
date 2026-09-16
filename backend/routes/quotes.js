const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/quotes/today', requireAuth, (req, res) => {
  const skill = db
    .prepare("SELECT id, skill_name, growth_friction_ending, memory_anchor FROM skills WHERE status != 'draft' ORDER BY RANDOM() LIMIT 1")
    .get();
  if (!skill) return res.status(404).json({ error: '暂无可用的策语' });

  const quoteContent = skill.growth_friction_ending?.trim() || skill.memory_anchor;
  res.json({ skill_id: skill.id, skill_name: skill.skill_name, quote_content: quoteContent });
});

router.post('/quotes/save', requireAuth, (req, res) => {
  const { skill_id, quote_content } = req.body || {};
  if (!skill_id || !quote_content) return res.status(400).json({ error: '缺少字段: skill_id 或 quote_content' });

  const skill = db.prepare('SELECT id FROM skills WHERE id = ?').get(skill_id);
  if (!skill) return res.status(404).json({ error: 'Skill不存在' });

  const info = db
    .prepare('INSERT INTO saved_quotes (user_id, skill_id, quote_content) VALUES (?, ?, ?)')
    .run(req.user.id, skill_id, quote_content);
  res.json({ id: info.lastInsertRowid });
});

router.get('/quotes/saved', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT sq.id, sq.quote_content, sq.saved_at, sq.skill_id, s.skill_name
       FROM saved_quotes sq
       JOIN skills s ON s.id = sq.skill_id
       WHERE sq.user_id = ?
       ORDER BY sq.saved_at DESC`
    )
    .all(req.user.id);
  res.json(rows);
});

module.exports = router;
