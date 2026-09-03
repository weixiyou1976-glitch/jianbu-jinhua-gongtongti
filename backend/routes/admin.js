const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

router.post('/activation-codes', (req, res) => {
  const count = Math.min(Math.max(parseInt(req.body?.count, 10) || 1, 1), 1000);
  const insert = db.prepare('INSERT INTO activation_codes (code) VALUES (?)');
  const codes = [];
  const tx = db.transaction(() => {
    for (let i = 0; i < count; i++) {
      let code;
      do {
        code = generateCode();
      } while (db.prepare('SELECT 1 FROM activation_codes WHERE code = ?').get(code));
      insert.run(code);
      codes.push(code);
    }
  });
  tx();
  res.json({ codes });
});

router.get('/activation-codes', (req, res) => {
  const codes = db.prepare('SELECT * FROM activation_codes ORDER BY created_at DESC').all();
  res.json(codes);
});

router.get('/activation-codes/export.csv', (req, res) => {
  const codes = db.prepare('SELECT * FROM activation_codes ORDER BY created_at DESC').all();
  const header = 'code,used,used_by,used_at,created_at\n';
  const rows = codes
    .map((c) => [c.code, c.used, c.used_by || '', c.used_at || '', c.created_at].join(','))
    .join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="activation_codes.csv"');
  res.send(header + rows);
});

router.get('/students', (req, res) => {
  const users = db.prepare('SELECT id, email, activated_at, enrolled_at FROM users ORDER BY created_at DESC').all();
  const withProgress = users.map((u) => {
    const stampCount = db.prepare('SELECT COUNT(*) AS c FROM stamps WHERE user_id = ?').get(u.id).c;
    return { ...u, stamp_count: stampCount, percent: Math.round((stampCount / 52) * 100) };
  });
  res.json(withProgress);
});

router.get('/skills', (req, res) => {
  res.json(db.prepare('SELECT * FROM skills ORDER BY week_number ASC').all());
});

router.post('/skills', (req, res) => {
  const s = req.body || {};
  const required = [
    'week_number', 'title', 'skill_name', 'category', 'trigger_condition',
    'step_one', 'step_two', 'step_three', 'memory_anchor', 'insight',
    'case_study', 'cognitive_reframe',
  ];
  for (const field of required) {
    if (!s[field]) return res.status(400).json({ error: `缺少字段: ${field}` });
  }
  const info = db.prepare(`
    INSERT INTO skills (week_number, title, skill_name, category, trigger_condition, key_question,
      step_one, step_two, step_three, memory_anchor, insight, case_study, cognitive_reframe, growth_friction)
    VALUES (@week_number, @title, @skill_name, @category, @trigger_condition, @key_question,
      @step_one, @step_two, @step_three, @memory_anchor, @insight, @case_study, @cognitive_reframe, @growth_friction)
  `).run({ growth_friction: '', key_question: '', ...s });
  res.json(db.prepare('SELECT * FROM skills WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/skills/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Skill不存在' });
  const merged = { ...existing, ...req.body, id: existing.id };
  db.prepare(`
    UPDATE skills SET week_number=@week_number, title=@title, skill_name=@skill_name,
      category=@category, trigger_condition=@trigger_condition, key_question=@key_question,
      step_one=@step_one, step_two=@step_two, step_three=@step_three, memory_anchor=@memory_anchor,
      insight=@insight, case_study=@case_study, cognitive_reframe=@cognitive_reframe,
      growth_friction=@growth_friction
    WHERE id=@id
  `).run(merged);
  res.json(db.prepare('SELECT * FROM skills WHERE id = ?').get(existing.id));
});

router.delete('/skills/:id', (req, res) => {
  db.prepare('DELETE FROM skills WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
