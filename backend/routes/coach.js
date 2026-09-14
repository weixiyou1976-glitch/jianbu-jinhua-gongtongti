const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { buildSystemPrompt } = require('../lib/coachPrompt');

const router = express.Router();

const insertMessage = db.prepare(
  'INSERT INTO coach_messages (user_id, skill_id, role, content) VALUES (?, ?, ?, ?)'
);

async function streamCoachReply(res, messages, userId, skillId) {
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
      insertMessage.run(userId, skillId, 'assistant', full);
    }
  }
}

router.get('/coach/:skill_id/history', requireAuth, (req, res) => {
  const messages = db
    .prepare('SELECT role, content, created_at FROM coach_messages WHERE user_id = ? AND skill_id = ? ORDER BY id ASC')
    .all(req.user.id, req.params.skill_id);
  const lastMessageAt = messages.length ? messages[messages.length - 1].created_at : null;
  res.json({ messages, last_message_at: lastMessageAt });
});

router.delete('/coach/:skill_id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM coach_messages WHERE user_id = ? AND skill_id = ?').run(req.user.id, req.params.skill_id);
  res.json({ ok: true });
});

router.post('/coach/message', requireAuth, async (req, res) => {
  const { skill_id, message } = req.body || {};
  if (!skill_id || !message) return res.status(400).json({ error: '缺少必要参数' });
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skill_id);
  if (!skill) return res.status(404).json({ error: 'Skill不存在' });

  const history = db
    .prepare('SELECT role, content FROM coach_messages WHERE user_id = ? AND skill_id = ? ORDER BY id ASC')
    .all(req.user.id, skill_id);

  insertMessage.run(req.user.id, skill_id, 'user', message);

  const messages = [
    { role: 'system', content: buildSystemPrompt(skill) },
    ...history,
    { role: 'user', content: message },
  ];
  await streamCoachReply(res, messages, req.user.id, skill_id);
});

module.exports = router;
