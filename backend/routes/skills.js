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

// 52周主线路径的解锁节奏：与 week_number 完全独立，每5天解锁一个 display_order。
function currentDisplayOrder(enrolledAt) {
  const start = new Date(enrolledAt);
  const now = new Date();
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const order = Math.floor(diffDays / 5) + 1;
  const maxOrder =
    db.prepare("SELECT MAX(display_order) AS m FROM skills WHERE status != 'draft'").get().m || 1;
  return Math.min(Math.max(order, 1), maxOrder);
}

function isUnlockedByPacing(skill, currentWeek, currentOrder) {
  return skill.week_number <= currentWeek || (skill.display_order != null && skill.display_order <= currentOrder);
}

// 只对52周主线里还没解锁的Skill计算倒计时；diffDays 的算法必须和 currentDisplayOrder 完全一致，否则倒计时会和真实解锁时间对不上。
function mainTrackCountdown(skill, enrolledAt, unlocked, stampedIds, orderToId) {
  if (unlocked || skill.display_order == null) return {};
  const start = new Date(enrolledAt);
  const now = new Date();
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(1, (skill.display_order - 1) * 5 - diffDays);
  const prevId = skill.display_order > 1 ? orderToId.get(skill.display_order - 1) : null;
  return {
    unlock_days_remaining: daysRemaining,
    prev_skill_stamped: prevId != null ? stampedIds.has(prevId) : false,
  };
}

function buildOrderToIdMap() {
  const rows = db.prepare('SELECT id, display_order FROM skills WHERE display_order IS NOT NULL').all();
  return new Map(rows.map((r) => [r.display_order, r.id]));
}

function withParsedTags(row) {
  return { ...row, tags: JSON.parse(row.tags || '[]') };
}

function tempUnlockedSkillIds(userId) {
  return new Set(
    db
      .prepare("SELECT skill_id FROM temporary_unlocks WHERE user_id = ? AND expires_at > datetime('now')")
      .all(userId)
      .map((r) => r.skill_id)
  );
}

function grantTempUnlock(userId, skillIds, reason) {
  const ids = [...new Set(skillIds)];
  if (ids.length === 0) return;
  const insert = db.prepare(
    `INSERT INTO temporary_unlocks (user_id, skill_id, unlock_reason, expires_at)
     VALUES (?, ?, ?, datetime('now', '+72 hours'))`
  );
  const tx = db.transaction((list) => {
    for (const id of list) insert.run(userId, id, reason);
  });
  tx(ids);
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
  const tempUnlockedIds = tempUnlockedSkillIds(req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const currentWeek = currentWeekNumber(user.enrolled_at);
  const currentOrder = currentDisplayOrder(user.enrolled_at);
  const orderToId = buildOrderToIdMap();
  res.json(
    skills.map((s) => {
      const unlocked =
        isUnlockedByPacing(s, currentWeek, currentOrder) ||
        stampedIds.has(s.id) ||
        moduleSkillIds.has(s.id) ||
        tempUnlockedIds.has(s.id);
      return {
        ...withParsedTags(s),
        stamped: stampedIds.has(s.id),
        unlocked,
        ...mainTrackCountdown(s, user.enrolled_at, unlocked, stampedIds, orderToId),
      };
    })
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
  const tempUnlockedIds = tempUnlockedSkillIds(req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const currentWeek = currentWeekNumber(user.enrolled_at);
  const currentOrder = currentDisplayOrder(user.enrolled_at);
  res.json(
    skills.map((s) => ({
      ...withParsedTags(s),
      stamped: stampedIds.has(s.id),
      unlocked:
        isUnlockedByPacing(s, currentWeek, currentOrder) ||
        stampedIds.has(s.id) ||
        moduleSkillIds.has(s.id) ||
        tempUnlockedIds.has(s.id),
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
  const tempUnlockedIds = tempUnlockedSkillIds(req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const currentWeek = currentWeekNumber(user.enrolled_at);
  const currentOrder = currentDisplayOrder(user.enrolled_at);
  const annotate = (s) => ({
    ...withParsedTags(s),
    stamped: stampedIds.has(s.id),
    unlocked:
      isUnlockedByPacing(s, currentWeek, currentOrder) ||
      stampedIds.has(s.id) ||
      moduleSkillIds.has(s.id) ||
      tempUnlockedIds.has(s.id),
  });

  // 推荐结果一律临时解锁72小时，避免"推荐了却进不去"的死路
  function finalizeResults(list) {
    if (list.length > 0) {
      grantTempUnlock(req.user.id, list.map((r) => r.id), 'ai_match');
      list.forEach((r) => {
        r.unlocked = true;
        r.temp_unlocked = !(isUnlockedByPacing(r, currentWeek, currentOrder) || stampedIds.has(r.id) || moduleSkillIds.has(r.id));
      });
    }
    return list;
  }

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
      return res.json({ results: finalizeResults(results), source: 'ai' });
    }
  }

  const fallbackPool = scored.length > 0 ? scored.map((x) => x.skill) : candidates;
  const fallback = fallbackPool.slice(0, 3).map((s) => ({ ...annotate(s), match_reason: '' }));
  res.json({ results: finalizeResults(fallback), source: 'keyword' });
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
  const currentOrder = currentDisplayOrder(user.enrolled_at);
  const stamped = !!db
    .prepare('SELECT 1 FROM stamps WHERE user_id = ? AND skill_id = ? LIMIT 1')
    .get(req.user.id, skill.id);
  const inModule = !!db.prepare('SELECT 1 FROM module_items WHERE skill_id = ?').get(skill.id);
  const tempUnlocked = !!db
    .prepare("SELECT 1 FROM temporary_unlocks WHERE user_id = ? AND skill_id = ? AND expires_at > datetime('now')")
    .get(req.user.id, skill.id);
  const unlocked = isUnlockedByPacing(skill, currentWeek, currentOrder) || stamped || inModule || tempUnlocked;

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
  res.json({ ...withParsedTags(skill), locked: false, stamped, prev: prev || null, next: next || null });
});

module.exports = router;
