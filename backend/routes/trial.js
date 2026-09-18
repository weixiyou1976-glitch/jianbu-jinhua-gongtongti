const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireTrialAuth } = require('../middleware/auth');
const { buildSystemPrompt } = require('../lib/coachPrompt');
const { sendVerificationEmail } = require('../lib/mailer');
const { findReferrerByCode, upsertRecord } = require('./referral');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signTrialToken(trialId) {
  return jwt.sign({ trialId, type: 'trial' }, process.env.JWT_SECRET, { expiresIn: '48h' });
}

function withParsedTags(row) {
  return { ...row, tags: JSON.parse(row.tags || '[]') };
}

function getTrial(trialId) {
  return db.prepare('SELECT * FROM trial_users WHERE id = ?').get(trialId);
}

router.post('/trial/send-code', async (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: '请输入正确的邮箱地址' });

  const recent = db
    .prepare("SELECT 1 FROM email_verifications WHERE email = ? AND created_at > datetime('now', '-60 seconds') LIMIT 1")
    .get(email);
  if (recent) return res.status(429).json({ error: '发送太频繁，请稍后再试' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  db.prepare(
    "INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, datetime('now', '+5 minutes'))"
  ).run(email, code);

  try {
    await sendVerificationEmail(email, code);
  } catch (err) {
    console.error('sendVerificationEmail failed:', err);
    return res.status(502).json({ error: '验证码发送失败，请稍后再试' });
  }

  res.json({ ok: true });
});

router.post('/trial/verify-code', (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  const code = (req.body?.code || '').trim();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: '请输入正确的邮箱地址' });
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: '验证码不正确或已过期，请重新获取' });
  }

  const record = db
    .prepare(
      `SELECT id FROM email_verifications
       WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime('now')
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(email, code);
  if (!record) return res.status(400).json({ error: '验证码不正确或已过期，请重新获取' });

  db.prepare('UPDATE email_verifications SET used = 1 WHERE id = ?').run(record.id);

  const existing = db.prepare('SELECT id FROM trial_users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: '你已经体验过了，欢迎加入渐步', already_used: true });
  }

  const { ref, skill_id: refSkillId, share_type: refShareType } = req.body || {};
  const referrer = ref ? findReferrerByCode(ref) : null;
  const hasReferral = referrer && refSkillId && (refShareType === 'stamped' || refShareType === 'basic');

  const info = db
    .prepare(
      'INSERT INTO trial_users (email, referred_by, referred_skill_id, referred_share_type) VALUES (?, ?, ?, ?)'
    )
    .run(email, hasReferral ? referrer.referral_code : null, hasReferral ? refSkillId : null, hasReferral ? refShareType : null);

  if (hasReferral) {
    const recordId = upsertRecord(referrer.id, referrer.referral_code, refSkillId, refShareType);
    db.prepare('UPDATE referral_records SET trial_count = trial_count + 1 WHERE id = ?').run(recordId);
  }

  res.json({ token: signTrialToken(info.lastInsertRowid) });
});

function buildMatchPrompt(query, candidates) {
  const list = candidates.map((s) => `${s.skill_name}|${s.trigger_condition}`).join('\n');
  return `你是渐步进化共同体的Skill推荐助手。学员描述了他的处境，请从候选Skill卡中找出最匹配的1张。

学员描述：
${query}

候选Skill卡（名称|触发条件）：
${list}

请选出最匹配的1张。
输出JSON格式：
[{"skill_name": "xxx", "reason": "一句话说明匹配原因"}]
只输出JSON，不要其他内容。`;
}

async function callMatchAI(query, candidates) {
  const upstream = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: buildMatchPrompt(query, candidates) }],
      temperature: 0.3,
      max_tokens: 300,
    }),
  });
  if (!upstream.ok) throw new Error('AI请求失败');
  const data = await upstream.json();
  const text = (data.choices?.[0]?.message?.content || '').trim();
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error('AI返回格式异常');
  return parsed;
}

router.post('/trial/match', requireTrialAuth, async (req, res) => {
  const trial = getTrial(req.trial.trialId);
  if (!trial) return res.status(404).json({ error: '试用信息不存在' });

  if (trial.matched_skill_id) {
    const already = db.prepare('SELECT * FROM skills WHERE id = ?').get(trial.matched_skill_id);
    if (already) return res.json(withParsedTags(already));
  }

  const concern = (req.body?.concern || '').trim();
  if (concern.length < 15 || concern.length > 200) {
    return res.status(400).json({ error: '请输入15-200字的描述' });
  }

  const allSkills = db.prepare("SELECT * FROM skills WHERE status != 'draft'").all();

  const scored = allSkills
    .map((s) => {
      const tags = JSON.parse(s.tags || '[]');
      const score = tags.filter((t) => t && concern.includes(t)).length;
      return { skill: s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const candidates = scored.length < 20 ? allSkills : scored.slice(0, 30).map((x) => x.skill);

  let picks = null;
  try {
    picks = await callMatchAI(concern, candidates);
  } catch {
    picks = null;
  }

  let matched = null;
  if (Array.isArray(picks) && picks.length > 0) {
    const byName = new Map(candidates.map((s) => [s.skill_name, s]));
    matched = byName.get(picks[0]?.skill_name) || null;
  }
  if (!matched) {
    const fallbackPool = scored.length > 0 ? scored.map((x) => x.skill) : candidates;
    matched = fallbackPool[0] || allSkills[0];
  }

  db.prepare('UPDATE trial_users SET concern = ?, matched_skill_id = ? WHERE id = ?').run(
    concern,
    matched.id,
    trial.id
  );

  res.json(withParsedTags(matched));
});

router.post('/trial/stamp', requireTrialAuth, (req, res) => {
  const trial = getTrial(req.trial.trialId);
  if (!trial) return res.status(404).json({ error: '试用信息不存在' });

  const { skill_id, learned, practiced, gained } = req.body || {};
  if (!skill_id || !learned || !practiced || !gained) {
    return res.status(400).json({ error: '我学了/我练了/我得到了 三项均为必填' });
  }
  if (Number(skill_id) !== trial.matched_skill_id) {
    return res.status(403).json({ error: '体验账号只能为匹配到的这一张Skill提交策印' });
  }

  const info = db
    .prepare(
      'INSERT INTO trial_stamps (trial_user_id, skill_id, learned, practiced, gained) VALUES (?, ?, ?, ?, ?)'
    )
    .run(trial.id, skill_id, learned, practiced, gained);

  res.json({ ok: true, id: info.lastInsertRowid });
});

router.get('/trial/skill/others', requireTrialAuth, (req, res) => {
  const trial = getTrial(req.trial.trialId);
  if (!trial) return res.status(404).json({ error: '试用信息不存在' });

  const excludeId = trial.matched_skill_id || 0;
  const rows = db
    .prepare(
      "SELECT skill_name, trigger_condition FROM skills WHERE status != 'draft' AND id != ? ORDER BY RANDOM() LIMIT 3"
    )
    .all(excludeId);

  res.json(
    rows.map((s) => ({
      skill_name: s.skill_name,
      trigger_condition_preview:
        Array.from(s.trigger_condition).length > 30
          ? Array.from(s.trigger_condition).slice(0, 30).join('') + '…'
          : s.trigger_condition,
    }))
  );
});

router.get('/trial/skill', requireTrialAuth, (req, res) => {
  const trial = getTrial(req.trial.trialId);
  if (!trial) return res.status(404).json({ error: '试用信息不存在' });
  if (!trial.matched_skill_id) return res.status(404).json({ error: '还没有匹配到Skill', no_match: true });

  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(trial.matched_skill_id);
  if (!skill) return res.status(404).json({ error: 'Skill不存在' });
  res.json(withParsedTags(skill));
});

const insertTrialMessage = db.prepare(
  'INSERT INTO trial_coach_messages (trial_user_id, role, content) VALUES (?, ?, ?)'
);

async function streamTrialCoachReply(res, messages, trialUserId) {
  let upstream;
  try {
    upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        stream: true,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });
  } catch {
    res.status(502).json({ error: '陪练暂时休息中，请稍后再试' });
    return;
  }

  if (!upstream.ok || !upstream.body) {
    res.status(502).json({ error: '陪练暂时休息中，请稍后再试' });
    return;
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            res.write(delta);
            full += delta;
          }
        } catch {
          // 忽略无法解析的分片
        }
      }
    }
  } catch {
    // 客户端断开或上游中断，已输出内容保留在客户端
  } finally {
    res.end();
    if (full.trim()) {
      insertTrialMessage.run(trialUserId, 'assistant', full);
    }
  }
}

router.get('/trial/coach/history', requireTrialAuth, (req, res) => {
  const messages = db
    .prepare('SELECT role, content, created_at FROM trial_coach_messages WHERE trial_user_id = ? ORDER BY id ASC')
    .all(req.trial.trialId);
  res.json({ messages });
});

router.post('/trial/coach/message', requireTrialAuth, async (req, res) => {
  const trial = getTrial(req.trial.trialId);
  if (!trial || !trial.matched_skill_id) return res.status(404).json({ error: '还没有匹配到Skill' });

  const { skill_id, message } = req.body || {};
  if (!skill_id || !message) return res.status(400).json({ error: '缺少必要参数' });
  if (Number(skill_id) !== trial.matched_skill_id) {
    return res.status(403).json({ error: '体验账号只能练习匹配到的这一张Skill' });
  }

  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skill_id);
  if (!skill) return res.status(404).json({ error: 'Skill不存在' });

  const history = db
    .prepare('SELECT role, content FROM trial_coach_messages WHERE trial_user_id = ? ORDER BY id ASC')
    .all(trial.id);

  insertTrialMessage.run(trial.id, 'user', message);

  const messages = [
    { role: 'system', content: buildSystemPrompt(skill) },
    ...history,
    { role: 'user', content: message },
  ];
  await streamTrialCoachReply(res, messages, trial.id);
});

module.exports = router;
