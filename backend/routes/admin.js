const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
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
  const totalWeeks = db.prepare('SELECT MAX(week_number) AS m FROM skills').get().m || 52;
  const withProgress = users.map((u) => {
    const stampCount = db.prepare('SELECT COUNT(*) AS c FROM stamps WHERE user_id = ?').get(u.id).c;
    return { ...u, stamp_count: stampCount, percent: Math.round((stampCount / totalWeeks) * 100) };
  });
  res.json(withProgress);
});

router.get('/trial-users', (req, res) => {
  const rows = db
    .prepare(
      `SELECT t.id, t.wechat_id, t.concern, t.matched_skill_id, t.created_at, t.converted,
              s.skill_name AS matched_skill_name, s.week_number AS matched_week_number
       FROM trial_users t
       LEFT JOIN skills s ON s.id = t.matched_skill_id
       ORDER BY t.created_at DESC`
    )
    .all();
  res.json(rows.map((r) => ({ ...r, converted: !!r.converted })));
});

router.put('/trial-users/:id', (req, res) => {
  const { converted } = req.body || {};
  const trial = db.prepare('SELECT * FROM trial_users WHERE id = ?').get(req.params.id);
  if (!trial) return res.status(404).json({ error: '记录不存在' });

  const wasConverted = !!trial.converted;
  const nowConverted = !!converted;
  db.prepare('UPDATE trial_users SET converted = ? WHERE id = ?').run(nowConverted ? 1 : 0, trial.id);

  if (nowConverted && !wasConverted && trial.referred_by && trial.referred_skill_id && trial.referred_share_type) {
    const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(trial.referred_by);
    if (referrer) {
      const record = db
        .prepare(
          'SELECT id FROM referral_records WHERE referrer_user_id = ? AND skill_id = ? AND share_type = ?'
        )
        .get(referrer.id, trial.referred_skill_id, trial.referred_share_type);
      if (record) {
        db.prepare('UPDATE referral_records SET converted_count = converted_count + 1 WHERE id = ?').run(record.id);
      }
    }
  }

  res.json({ ok: true });
});

router.get('/referrals', (req, res) => {
  const settings = db.prepare('SELECT commission_per_conversion FROM referral_settings WHERE id = 1').get();
  const rate = settings?.commission_per_conversion || 0;

  const rows = db
    .prepare(
      `SELECT u.id AS user_id, u.email, u.referral_code,
              COALESCE(SUM(r.share_count), 0) AS share_count,
              COALESCE(SUM(r.click_count), 0) AS click_count,
              COALESCE(SUM(r.trial_count), 0) AS trial_count,
              COALESCE(SUM(r.converted_count), 0) AS converted_count,
              COALESCE(SUM(CASE WHEN r.settled = 0 THEN r.converted_count ELSE 0 END), 0) AS unsettled_converted_count
       FROM users u
       JOIN referral_records r ON r.referrer_user_id = u.id
       GROUP BY u.id
       ORDER BY converted_count DESC, click_count DESC`
    )
    .all();

  res.json({
    commission_per_conversion: rate,
    rows: rows.map((r) => ({ ...r, pending_commission: r.unsettled_converted_count * rate })),
  });
});

router.put('/referrals/:userId/settle', (req, res) => {
  const info = db
    .prepare('UPDATE referral_records SET settled = 1 WHERE referrer_user_id = ? AND settled = 0')
    .run(req.params.userId);
  res.json({ ok: true, settled_records: info.changes });
});

router.get('/referral-settings', (req, res) => {
  const settings = db.prepare('SELECT commission_per_conversion FROM referral_settings WHERE id = 1').get();
  res.json(settings || { commission_per_conversion: 0 });
});

router.put('/referral-settings', (req, res) => {
  const rate = Number(req.body?.commission_per_conversion);
  if (!Number.isFinite(rate) || rate < 0) return res.status(400).json({ error: '分润金额需为非负数字' });
  db.prepare('UPDATE referral_settings SET commission_per_conversion = ? WHERE id = 1').run(rate);
  res.json({ ok: true, commission_per_conversion: rate });
});

router.post('/students/:id/reset-password', (req, res) => {
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '学员不存在' });

  const newPassword = crypto.randomBytes(4).toString('hex');
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);

  res.json({ email: user.email, password: newPassword });
});

function withParsedTags(row) {
  return { ...row, tags: JSON.parse(row.tags || '[]') };
}

router.get('/skills', (req, res) => {
  res.json(db.prepare('SELECT * FROM skills ORDER BY week_number ASC').all().map(withParsedTags));
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
  const tags = Array.isArray(s.tags) ? s.tags : [];
  const status = s.status === 'draft' ? 'draft' : 'published';
  const info = db.prepare(`
    INSERT INTO skills (week_number, title, skill_name, category, trigger_condition, key_question,
      step_one, step_two, step_three, memory_anchor, insight, case_study, cognitive_reframe, growth_friction, tags, status, insight_audio_url)
    VALUES (@week_number, @title, @skill_name, @category, @trigger_condition, @key_question,
      @step_one, @step_two, @step_three, @memory_anchor, @insight, @case_study, @cognitive_reframe, @growth_friction, @tags, @status, @insight_audio_url)
  `).run({ growth_friction: '', key_question: '', insight_audio_url: '', ...s, tags: JSON.stringify(tags), status });
  db.setSkillTags(info.lastInsertRowid, tags);
  res.json(withParsedTags(db.prepare('SELECT * FROM skills WHERE id = ?').get(info.lastInsertRowid)));
});

router.put('/skills/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Skill不存在' });
  const tags = Array.isArray(req.body.tags) ? req.body.tags : JSON.parse(existing.tags || '[]');
  const status = req.body.status === 'draft' ? 'draft' : req.body.status === 'published' ? 'published' : existing.status;
  const merged = { ...existing, ...req.body, id: existing.id, tags: JSON.stringify(tags), status };
  db.prepare(`
    UPDATE skills SET week_number=@week_number, title=@title, skill_name=@skill_name,
      category=@category, trigger_condition=@trigger_condition, key_question=@key_question,
      step_one=@step_one, step_two=@step_two, step_three=@step_three, memory_anchor=@memory_anchor,
      insight=@insight, case_study=@case_study, cognitive_reframe=@cognitive_reframe,
      growth_friction=@growth_friction, tags=@tags, status=@status, insight_audio_url=@insight_audio_url
    WHERE id=@id
  `).run(merged);
  db.setSkillTags(existing.id, tags);
  res.json(withParsedTags(db.prepare('SELECT * FROM skills WHERE id = ?').get(existing.id)));
});

router.delete('/skills/:id', (req, res) => {
  db.prepare('DELETE FROM skills WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

function withStages(moduleId) {
  const items = db
    .prepare(
      `SELECT mi.id AS item_id, mi.stage_order, mi.stage_name, mi.item_order, s.id AS skill_id,
              s.week_number, s.skill_name, s.category, s.status
       FROM module_items mi
       JOIN skills s ON s.id = mi.skill_id
       WHERE mi.module_id = ?
       ORDER BY mi.stage_order ASC, mi.item_order ASC`
    )
    .all(moduleId);
  const stages = [];
  const byOrder = new Map();
  for (const row of items) {
    if (!byOrder.has(row.stage_order)) {
      const stage = { stage_order: row.stage_order, stage_name: row.stage_name, items: [] };
      byOrder.set(row.stage_order, stage);
      stages.push(stage);
    }
    byOrder.get(row.stage_order).items.push(row);
  }
  return stages;
}

router.get('/modules', (req, res) => {
  const modules = db.prepare('SELECT * FROM modules ORDER BY created_at ASC').all();
  res.json(modules.map((m) => ({ ...m, stages: withStages(m.id) })));
});

router.get('/modules/:id', (req, res) => {
  const module_ = db.prepare('SELECT * FROM modules WHERE id = ?').get(req.params.id);
  if (!module_) return res.status(404).json({ error: '模块不存在' });
  res.json({ ...module_, stages: withStages(module_.id) });
});

function replaceModuleItems(moduleId, items) {
  db.prepare('DELETE FROM module_items WHERE module_id = ?').run(moduleId);
  const insert = db.prepare(`
    INSERT INTO module_items (module_id, stage_order, stage_name, skill_id, item_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const item of items) {
    insert.run(moduleId, item.stage_order, item.stage_name, item.skill_id, item.item_order);
  }
}

router.post('/modules', (req, res) => {
  const { slug, name, subtitle, items } = req.body || {};
  if (!slug || !name) return res.status(400).json({ error: '缺少字段: slug 或 name' });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: '模块至少需要一个 item' });

  const tx = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO modules (slug, name, subtitle) VALUES (?, ?, ?)')
      .run(slug, name, subtitle || '');
    replaceModuleItems(info.lastInsertRowid, items);
    return info.lastInsertRowid;
  });

  let moduleId;
  try {
    moduleId = tx();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  res.json({ ...db.prepare('SELECT * FROM modules WHERE id = ?').get(moduleId), stages: withStages(moduleId) });
});

router.put('/modules/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM modules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '模块不存在' });
  const { slug, name, subtitle, items } = req.body || {};
  const tx = db.transaction(() => {
    db.prepare('UPDATE modules SET slug=?, name=?, subtitle=? WHERE id=?').run(
      slug || existing.slug,
      name || existing.name,
      subtitle ?? existing.subtitle,
      existing.id
    );
    if (Array.isArray(items)) replaceModuleItems(existing.id, items);
  });
  try {
    tx();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  res.json({ ...db.prepare('SELECT * FROM modules WHERE id = ?').get(existing.id), stages: withStages(existing.id) });
});

router.delete('/modules/:id', (req, res) => {
  db.prepare('DELETE FROM modules WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
