const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function currentWeekNumber(enrolledAt) {
  const start = new Date(enrolledAt);
  const now = new Date();
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  const maxWeek = db.prepare("SELECT MAX(week_number) AS m FROM skills WHERE status != 'draft'").get().m || 1;
  return Math.min(Math.max(week, 1), maxWeek);
}

function withParsedTags(row) {
  return { ...row, tags: JSON.parse(row.tags || '[]') };
}

router.get('/skills', requireAuth, (req, res) => {
  const { week, category } = req.query;
  let sql = "SELECT * FROM skills WHERE status != 'draft'";
  const params = [];
  if (week) {
    sql += ' AND week_number = ?';
    params.push(week);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  sql += ' ORDER BY week_number ASC';

  const skills = db.prepare(sql).all(...params);
  const stampedIds = new Set(
    db.prepare('SELECT skill_id FROM stamps WHERE user_id = ?').all(req.user.id).map((r) => r.skill_id)
  );
  const moduleSkillIds = db.getModuleSkillIdSet();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const currentWeek = currentWeekNumber(user.enrolled_at);
  res.json(
    skills.map((s) => ({
      ...withParsedTags(s),
      stamped: stampedIds.has(s.id),
      unlocked: s.week_number <= currentWeek || stampedIds.has(s.id) || moduleSkillIds.has(s.id),
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
         WHERE st.tag = ? AND s.status != 'draft'
         ORDER BY s.week_number ASC`
      )
      .all(tag);
  } else {
    const like = `%${q}%`;
    skills = db
      .prepare(
        `SELECT DISTINCT s.* FROM skills s
         LEFT JOIN skill_tags st ON st.skill_id = s.id
         WHERE (s.skill_name LIKE ? OR s.title LIKE ? OR st.tag LIKE ?) AND s.status != 'draft'
         ORDER BY s.week_number ASC`
      )
      .all(like, like, like);
  }

  const stampedIds = new Set(
    db.prepare('SELECT skill_id FROM stamps WHERE user_id = ?').all(req.user.id).map((r) => r.skill_id)
  );
  const moduleSkillIds = db.getModuleSkillIdSet();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const currentWeek = currentWeekNumber(user.enrolled_at);
  res.json(
    skills.map((s) => ({
      ...withParsedTags(s),
      stamped: stampedIds.has(s.id),
      unlocked: s.week_number <= currentWeek || stampedIds.has(s.id) || moduleSkillIds.has(s.id),
    }))
  );
});

function buildMatchPrompt(query, candidates) {
  const list = candidates.map((s) => `${s.skill_name}|${s.trigger_condition}`).join('\n');
  return `你是渐步进化共同体的Skill推荐助手。学员描述了他的处境，请从候选Skill卡中找出最匹配的2-3张。

学员描述：
${query}

候选Skill卡（名称|触发条件）：
${list}

请选出最匹配的2-3张，按匹配程度排序。
输出JSON格式：
[
  {"skill_name": "xxx", "reason": "一句话说明匹配原因"},
  {"skill_name": "xxx", "reason": "一句话说明匹配原因"}
]
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
      max_tokens: 500,
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

router.post('/skills/match', requireAuth, async (req, res) => {
  const query = (req.body?.query || '').trim();
  if (!query) return res.status(400).json({ error: '请描述你的处境' });

  const allSkills = db.prepare("SELECT * FROM skills WHERE status != 'draft'").all();

  const scored = allSkills
    .map((s) => {
      const tags = JSON.parse(s.tags || '[]');
      const score = tags.filter((t) => t && query.includes(t)).length;
      return { skill: s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const candidates = scored.length < 20 ? allSkills : scored.slice(0, 30).map((x) => x.skill);

  const stampedIds = new Set(
    db.prepare('SELECT skill_id FROM stamps WHERE user_id = ?').all(req.user.id).map((r) => r.skill_id)
  );
  const moduleSkillIds = db.getModuleSkillIdSet();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const currentWeek = currentWeekNumber(user.enrolled_at);
  const annotate = (s) => ({
    ...withParsedTags(s),
    stamped: stampedIds.has(s.id),
    unlocked: s.week_number <= currentWeek || stampedIds.has(s.id) || moduleSkillIds.has(s.id),
  });

  let picks = null;
  try {
    picks = await callMatchAI(query, candidates);
  } catch {
    picks = null;
  }

  if (Array.isArray(picks) && picks.length > 0) {
    const byName = new Map(candidates.map((s) => [s.skill_name, s]));
    const results = [];
    for (const p of picks) {
      const s = byName.get(p?.skill_name);
      if (s && !results.some((r) => r.id === s.id)) {
        results.push({ ...annotate(s), match_reason: p.reason || '' });
      }
      if (results.length >= 3) break;
    }
    if (results.length > 0) {
      return res.json({ results, source: 'ai' });
    }
  }

  const fallbackPool = scored.length > 0 ? scored.map((x) => x.skill) : candidates;
  const fallback = fallbackPool.slice(0, 3).map((s) => ({ ...annotate(s), match_reason: '' }));
  res.json({ results: fallback, source: 'keyword' });
});

router.get('/skills/:id', requireAuth, (req, res) => {
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id);
  if (!skill) return res.status(404).json({ error: 'Skill不存在' });

  if (skill.status === 'draft') {
    return res.json({
      id: skill.id,
      week_number: skill.week_number,
      skill_name: skill.skill_name,
      category: skill.category,
      draft: true,
    });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const currentWeek = currentWeekNumber(user.enrolled_at);
  const stamp = db
    .prepare('SELECT * FROM stamps WHERE user_id = ? AND skill_id = ?')
    .get(req.user.id, skill.id);
  const inModule = !!db.prepare('SELECT 1 FROM module_items WHERE skill_id = ?').get(skill.id);
  const unlocked = skill.week_number <= currentWeek || !!stamp || inModule;

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
