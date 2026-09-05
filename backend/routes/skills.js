const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function currentWeekNumber(enrolledAt) {
  const start = new Date(enrolledAt);
  const now = new Date();
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  const maxWeek = db.prepare('SELECT MAX(week_number) AS m FROM skills').get().m || 1;
  return Math.min(Math.max(week, 1), maxWeek);
}

function withParsedTags(row) {
  return { ...row, tags: JSON.parse(row.tags || '[]') };
}

router.get('/skills', requireAuth, (req, res) => {
  const { week, category } = req.query;
  let sql = 'SELECT * FROM skills';
  const conditions = [];
  const params = [];
  if (week) {
    conditions.push('week_number = ?');
    params.push(week);
  }
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY week_number ASC';

  const skills = db.prepare(sql).all(...params);
  const stampedIds = new Set(
    db.prepare('SELECT skill_id FROM stamps WHERE user_id = ?').all(req.user.id).map((r) => r.skill_id)
  );
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const currentWeek = currentWeekNumber(user.enrolled_at);
  res.json(
    skills.map((s) => ({
      ...withParsedTags(s),
      stamped: stampedIds.has(s.id),
      unlocked: s.week_number <= currentWeek || stampedIds.has(s.id),
    }))
  );
});

router.get('/skills/current', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const week = currentWeekNumber(user.enrolled_at);
  const skill = db.prepare('SELECT * FROM skills WHERE week_number = ?').get(week);
  if (!skill) return res.json({ week, skill: null });
  const stamped = !!db
    .prepare('SELECT 1 FROM stamps WHERE user_id = ? AND skill_id = ?')
    .get(req.user.id, skill.id);
  res.json({ week, skill: { ...withParsedTags(skill), stamped } });
});

router.get('/skills/search', requireAuth, (req, res) => {
  const { tag, q } = req.query;
  if (!tag && !q) return res.status(400).json({ error: '缺少查询参数 tag 或 q' });

  let skills;
  if (tag) {
    skills = db
      .prepare(
        `SELECT s.* FROM skills s
         JOIN skill_tags st ON st.skill_id = s.id
         WHERE st.tag = ?
         ORDER BY s.week_number ASC`
      )
      .all(tag);
  } else {
    const like = `%${q}%`;
    skills = db
      .prepare(
        `SELECT DISTINCT s.* FROM skills s
         LEFT JOIN skill_tags st ON st.skill_id = s.id
         WHERE s.skill_name LIKE ? OR s.title LIKE ? OR st.tag LIKE ?
         ORDER BY s.week_number ASC`
      )
      .all(like, like, like);
  }

  const stampedIds = new Set(
    db.prepare('SELECT skill_id FROM stamps WHERE user_id = ?').all(req.user.id).map((r) => r.skill_id)
  );
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const currentWeek = currentWeekNumber(user.enrolled_at);
  res.json(
    skills.map((s) => ({
      ...withParsedTags(s),
      stamped: stampedIds.has(s.id),
      unlocked: s.week_number <= currentWeek || stampedIds.has(s.id),
    }))
  );
});

router.get('/skills/:id', requireAuth, (req, res) => {
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id);
  if (!skill) return res.status(404).json({ error: 'Skill不存在' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const currentWeek = currentWeekNumber(user.enrolled_at);
  const stamp = db
    .prepare('SELECT * FROM stamps WHERE user_id = ? AND skill_id = ?')
    .get(req.user.id, skill.id);
  const unlocked = skill.week_number <= currentWeek || !!stamp;

  if (!unlocked) {
    const currentSkill = db.prepare('SELECT id, skill_name FROM skills WHERE week_number = ?').get(currentWeek);
    return res.json({
      id: skill.id,
      week_number: skill.week_number,
      locked: true,
      current_week: currentWeek,
      current_skill: currentSkill || null,
    });
  }

  const prev = db
    .prepare('SELECT id, title FROM skills WHERE week_number < ? ORDER BY week_number DESC LIMIT 1')
    .get(skill.week_number);
  const next = db
    .prepare('SELECT id, title FROM skills WHERE week_number > ? ORDER BY week_number ASC LIMIT 1')
    .get(skill.week_number);
  res.json({ ...withParsedTags(skill), locked: false, stamp: stamp || null, prev: prev || null, next: next || null });
});

module.exports = router;
