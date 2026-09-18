const express = require('express');
const crypto = require('crypto');
const net = require('net');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { checkAndGrantMilestones, getShareTag, getConversionTag } = require('../lib/rewards');
const { computeStreak } = require('../lib/streak');
const { migrateTrialToUser } = require('../lib/trialMigration');

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

function streakForUser(table, userId) {
  const dates = db
    .prepare(`SELECT checkin_date FROM ${table} WHERE user_id = ?`)
    .all(userId)
    .map((r) => r.checkin_date);
  return computeStreak(dates);
}

router.get('/students', (req, res) => {
  const users = db
    .prepare('SELECT id, email, activated_at, enrolled_at, growth_level, growth_title FROM users ORDER BY created_at DESC')
    .all();
  const withProgress = users.map((u) => {
    const stampCount = db.prepare('SELECT COUNT(*) AS c FROM stamps WHERE user_id = ?').get(u.id).c;
    const skillsMastered = db
      .prepare('SELECT COUNT(DISTINCT skill_id) AS c FROM stamps WHERE user_id = ?')
      .get(u.id).c;
    return {
      ...u,
      stamp_count: stampCount,
      skills_mastered: skillsMastered,
      visit_streak: streakForUser('daily_checkins', u.id),
      learning_streak: streakForUser('learning_checkins', u.id),
      practice_streak: streakForUser('practice_checkins', u.id),
    };
  });
  res.json(withProgress);
});

router.get('/trial-users', (req, res) => {
  const rows = db
    .prepare(
      `SELECT t.id, t.email, t.concern, t.matched_skill_id, t.created_at, t.converted,
              s.skill_name AS matched_skill_name, s.week_number AS matched_week_number,
              u.email AS linked_user_email
       FROM trial_users t
       LEFT JOIN skills s ON s.id = t.matched_skill_id
       LEFT JOIN users u ON u.id = t.converted_user_id
       ORDER BY t.created_at DESC`
    )
    .all();
  res.json(rows.map((r) => ({ ...r, converted: !!r.converted })));
});

router.put('/trial-users/:id', (req, res) => {
  const { converted, user_email } = req.body || {};
  const trial = db.prepare('SELECT * FROM trial_users WHERE id = ?').get(req.params.id);
  if (!trial) return res.status(404).json({ error: '记录不存在' });

  const wasConverted = !!trial.converted;
  const nowConverted = !!converted;
  db.prepare('UPDATE trial_users SET converted = ? WHERE id = ?').run(nowConverted ? 1 : 0, trial.id);

  let migration = null;
  if (nowConverted && !wasConverted && user_email) {
    const targetUser = db.prepare('SELECT id FROM users WHERE email = ?').get(user_email.trim());
    migration = targetUser
      ? migrateTrialToUser(trial.id, targetUser.id)
      : { ok: false, error: '未找到该邮箱对应的正式学员账号，请确认学员已注册' };
  }

  if (nowConverted && !wasConverted && trial.referred_by) {
    const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(trial.referred_by);
    if (referrer) {
      if (trial.referred_skill_id && trial.referred_share_type) {
        const record = db
          .prepare(
            'SELECT id FROM referral_records WHERE referrer_user_id = ? AND skill_id = ? AND share_type = ?'
          )
          .get(referrer.id, trial.referred_skill_id, trial.referred_share_type);
        if (record) {
          db.prepare('UPDATE referral_records SET converted_count = converted_count + 1 WHERE id = ?').run(record.id);
        }
      }

      db.prepare('UPDATE users SET conversion_count = conversion_count + 1 WHERE id = ?').run(referrer.id);
      const updated = db.prepare('SELECT conversion_count FROM users WHERE id = ?').get(referrer.id);
      checkAndGrantMilestones(referrer.id, 'conversion', updated.conversion_count);
    }
  }

  res.json({ ok: true, migration });
});

router.get('/trial-analytics', (req, res) => {
  const trials = db.prepare('SELECT concern, matched_skill_id, referred_by, converted FROM trial_users').all();

  // 困扰关键词分析：复用Skill库已有的标签词表，作为关键词判定依据
  const tags = db.prepare('SELECT DISTINCT tag FROM skill_tags').all().map((r) => r.tag);
  const keywordStats = new Map();
  for (const t of trials) {
    if (!t.concern) continue;
    for (const tag of tags) {
      if (t.concern.includes(tag)) {
        const entry = keywordStats.get(tag) || { total: 0, converted: 0 };
        entry.total += 1;
        if (t.converted) entry.converted += 1;
        keywordStats.set(tag, entry);
      }
    }
  }
  const keyword_themes = [...keywordStats.entries()]
    .map(([keyword, v]) => ({
      keyword,
      total: v.total,
      converted: v.converted,
      rate: v.total ? Math.round((v.converted / v.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Skill转化率分析
  const skillStats = new Map();
  for (const t of trials) {
    if (!t.matched_skill_id) continue;
    const entry = skillStats.get(t.matched_skill_id) || { total: 0, converted: 0 };
    entry.total += 1;
    if (t.converted) entry.converted += 1;
    skillStats.set(t.matched_skill_id, entry);
  }
  const skillNames = new Map(
    db.prepare('SELECT id, skill_name, week_number FROM skills').all().map((s) => [s.id, s])
  );
  const skill_conversion = [...skillStats.entries()]
    .map(([skillId, v]) => ({
      skill_id: skillId,
      skill_name: skillNames.get(skillId)?.skill_name || `Skill #${skillId}`,
      week_number: skillNames.get(skillId)?.week_number ?? null,
      total: v.total,
      converted: v.converted,
      rate: v.total ? Math.round((v.converted / v.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.rate - a.rate || b.total - a.total)
    .slice(0, 10);

  // 来源分析：按推荐人分组
  const referrerStats = new Map();
  for (const t of trials) {
    if (!t.referred_by) continue;
    const entry = referrerStats.get(t.referred_by) || { total: 0, converted: 0 };
    entry.total += 1;
    if (t.converted) entry.converted += 1;
    referrerStats.set(t.referred_by, entry);
  }
  const referrerEmails = new Map(
    db.prepare('SELECT referral_code, email FROM users WHERE referral_code IS NOT NULL').all().map((u) => [u.referral_code, u.email])
  );
  const referrer_conversion = [...referrerStats.entries()]
    .map(([code, v]) => ({
      referral_code: code,
      email: referrerEmails.get(code) || null,
      total: v.total,
      converted: v.converted,
      rate: v.total ? Math.round((v.converted / v.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.rate - a.rate || b.total - a.total)
    .slice(0, 10);

  res.json({ keyword_themes, skill_conversion, referrer_conversion });
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

router.get('/security', (req, res) => {
  const users = db
    .prepare('SELECT id, email, account_locked, locked_reason, device_limit FROM users ORDER BY created_at DESC')
    .all();
  const getDevices = db.prepare(
    `SELECT id, device_fingerprint, device_name, first_login_at, last_active_at
     FROM devices WHERE user_id = ? ORDER BY first_login_at ASC`
  );
  res.json(
    users.map((u) => ({
      ...u,
      account_locked: !!u.account_locked,
      devices: getDevices.all(u.id),
    }))
  );
});

router.post('/security/:userId/unlock', (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: '学员不存在' });
  db.prepare('UPDATE users SET account_locked = 0, locked_reason = NULL WHERE id = ?').run(user.id);
  if (req.body?.reset_devices) {
    db.prepare('DELETE FROM devices WHERE user_id = ?').run(user.id);
  }
  res.json({ ok: true });
});

router.post('/security/:userId/clear-devices', (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: '学员不存在' });
  db.prepare('DELETE FROM devices WHERE user_id = ?').run(user.id);
  res.json({ ok: true });
});

router.get('/referral-rewards', (req, res) => {
  const users = db
    .prepare(
      `SELECT id, email, share_click_count, conversion_count, referral_level_share, referral_level_conversion,
              has_double_quote, quote_discount, referral_commission_rate
       FROM users ORDER BY share_click_count DESC, conversion_count DESC`
    )
    .all();
  res.json(
    users.map((u) => ({
      ...u,
      has_double_quote: !!u.has_double_quote,
      share_tag: getShareTag(u.share_click_count),
      conversion_tag: getConversionTag(u.conversion_count),
    }))
  );
});

router.put('/referral-rewards/:id/adjust', (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '学员不存在' });

  const { share_click_count, conversion_count } = req.body || {};
  if (Number.isFinite(Number(share_click_count))) {
    const count = Math.max(0, Math.floor(Number(share_click_count)));
    db.prepare('UPDATE users SET share_click_count = ? WHERE id = ?').run(count, user.id);
    checkAndGrantMilestones(user.id, 'share_click', count);
  }
  if (Number.isFinite(Number(conversion_count))) {
    const count = Math.max(0, Math.floor(Number(conversion_count)));
    db.prepare('UPDATE users SET conversion_count = ? WHERE id = ?').run(count, user.id);
    checkAndGrantMilestones(user.id, 'conversion', count);
  }
  res.json({ ok: true });
});

router.put('/referral-rewards/:id/commission-rate', (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '学员不存在' });
  const rate = Number(req.body?.referral_commission_rate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) return res.status(400).json({ error: '分润比例需为0-1之间的数字' });
  db.prepare('UPDATE users SET referral_commission_rate = ? WHERE id = ?').run(rate, user.id);
  res.json({ ok: true });
});

router.get('/fangs-voice', (req, res) => {
  res.json(db.prepare('SELECT * FROM fangs_voice ORDER BY created_at DESC').all());
});

router.post('/fangs-voice', (req, res) => {
  const { title, audio_url, required_share_clicks, required_conversions } = req.body || {};
  if (!title || !audio_url) return res.status(400).json({ error: '缺少字段: title 或 audio_url' });
  const info = db
    .prepare(
      'INSERT INTO fangs_voice (title, audio_url, required_share_clicks, required_conversions) VALUES (?, ?, ?, ?)'
    )
    .run(title, audio_url, Number(required_share_clicks) || 0, Number(required_conversions) || 0);
  res.json(db.prepare('SELECT * FROM fangs_voice WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/fangs-voice/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM fangs_voice WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '记录不存在' });
  const { title, audio_url, required_share_clicks, required_conversions } = req.body || {};
  db.prepare(
    `UPDATE fangs_voice SET title=?, audio_url=?, required_share_clicks=?, required_conversions=? WHERE id=?`
  ).run(
    title ?? existing.title,
    audio_url ?? existing.audio_url,
    Number.isFinite(Number(required_share_clicks)) ? Number(required_share_clicks) : existing.required_share_clicks,
    Number.isFinite(Number(required_conversions)) ? Number(required_conversions) : existing.required_conversions,
    existing.id
  );
  res.json(db.prepare('SELECT * FROM fangs_voice WHERE id = ?').get(existing.id));
});

router.delete('/fangs-voice/:id', (req, res) => {
  db.prepare('DELETE FROM fangs_voice WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/students/:id/record-payment', (req, res) => {
  const student = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: '学员不存在' });

  const { payment_type, order_amount } = req.body || {};
  const amount = Number(order_amount);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: '订单金额需为正数' });
  if (!['first_year', 'renewal'].includes(payment_type)) {
    return res.status(400).json({ error: 'payment_type 需为 first_year 或 renewal' });
  }

  const insert = db.prepare(`
    INSERT INTO commission_records (beneficiary_user_id, payer_user_id, commission_type, order_amount, commission_rate, commission_amount, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `);

  let created = null;
  if (payment_type === 'first_year') {
    if (student.referrer_id) {
      const beneficiary = db.prepare('SELECT id, referral_commission_rate FROM users WHERE id = ?').get(student.referrer_id);
      if (beneficiary) {
        const rate = beneficiary.referral_commission_rate || 0;
        const info = insert.run(beneficiary.id, student.id, 'first_year', amount, rate, amount * rate);
        created = info.lastInsertRowid;
      }
    }
  } else {
    if (student.referrer_id) {
      const b = db.prepare('SELECT id, referrer_id FROM users WHERE id = ?').get(student.referrer_id);
      if (b) {
        const rate = 0.05;
        const beneficiaryId = b.referrer_id || 0;
        const info = insert.run(beneficiaryId, student.id, 'renewal', amount, rate, amount * rate);
        created = info.lastInsertRowid;
      }
    }
  }

  res.json({ ok: true, commission_record_id: created });
});

router.get('/commissions', (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, p.email AS payer_email
       FROM commission_records c
       JOIN users p ON p.id = c.payer_user_id
       ORDER BY c.created_at DESC`
    )
    .all();
  const beneficiaryIds = [...new Set(rows.map((r) => r.beneficiary_user_id).filter((id) => id !== 0))];
  const beneficiaryMap = new Map();
  if (beneficiaryIds.length > 0) {
    const placeholders = beneficiaryIds.map(() => '?').join(',');
    db.prepare(`SELECT id, email FROM users WHERE id IN (${placeholders})`)
      .all(...beneficiaryIds)
      .forEach((u) => beneficiaryMap.set(u.id, u.email));
  }
  res.json(
    rows.map((r) => ({
      ...r,
      status: r.status,
      beneficiary_email: r.beneficiary_user_id === 0 ? '傲龙' : beneficiaryMap.get(r.beneficiary_user_id) || '未知',
    }))
  );
});

router.put('/commissions/:beneficiaryId/settle', (req, res) => {
  const info = db
    .prepare("UPDATE commission_records SET status = 'paid', paid_at = datetime('now') WHERE beneficiary_user_id = ? AND status = 'pending'")
    .run(req.params.beneficiaryId);
  res.json({ ok: true, settled_records: info.changes });
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
      step_one, step_two, step_three, memory_anchor, insight, case_study, cognitive_reframe, growth_friction, growth_friction_ending, tags, status, insight_audio_url)
    VALUES (@week_number, @title, @skill_name, @category, @trigger_condition, @key_question,
      @step_one, @step_two, @step_three, @memory_anchor, @insight, @case_study, @cognitive_reframe, @growth_friction, @growth_friction_ending, @tags, @status, @insight_audio_url)
  `).run({ growth_friction: '', growth_friction_ending: '', key_question: '', insight_audio_url: '', ...s, tags: JSON.stringify(tags), status });
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
      growth_friction=@growth_friction, growth_friction_ending=@growth_friction_ending, tags=@tags, status=@status, insight_audio_url=@insight_audio_url
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

function probeTcp(host, port, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = net.connect({ host, port });
    const finish = (ok, detail) => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ target: `${host}:${port}`, ok, ms: Date.now() - started, detail });
    };
    const timer = setTimeout(() => finish(false, 'TIMEOUT'), timeoutMs);
    socket.once('connect', () => finish(true, 'CONNECTED'));
    socket.once('error', (err) => finish(false, err.code || err.message));
  });
}

router.get('/net-diag', async (req, res) => {
  const targets = [
    ['smtp.qq.com', 465],
    ['smtp.qq.com', 587],
    ['smtp.gmail.com', 465],
    ['smtp.gmail.com', 587],
    ['www.qq.com', 443],
  ];
  const results = await Promise.all(targets.map(([host, port]) => probeTcp(host, port)));
  res.json({ results });
});

module.exports = router;
