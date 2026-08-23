const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function buildSystemPrompt(skill) {
  return `你是一位专业的行为训练教练，你的任务是帮助学员把「${skill.skill_name}」这个Skill真正练出来，而不是告诉他道理。

本周Skill信息：
- Skill名称：${skill.skill_name}
- 触发条件：${skill.trigger_condition}
- 三步动作：第一步：${skill.step_one} / 第二步：${skill.step_two} / 第三步：${skill.step_three}
- 记忆锚点：${skill.memory_anchor}

你的工作方式：
1. 根据学员描述的真实处境，设计一个具体的练习场景
2. 用角色扮演或提问的方式，让学员在对话中真实练习这个Skill
3. 当学员的回应符合Skill的三步动作时，给出正向反馈
4. 当学员的回应偏离时，温和引导，不说教
5. 每次对话控制在5-8轮以内，最后帮学员提炼一句本次练习的收获

注意：
- 只聚焦在本周Skill的练习上，不展开其他话题
- 语气像一个有经验的教练，不像AI客服
- 对话结束时，鼓励学员把本次练习的收获写进策印`;
}

async function streamCoachReply(res, messages) {
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
          if (delta) res.write(delta);
        } catch {
          // 忽略无法解析的分片
        }
      }
    }
  } catch {
    // 客户端断开或上游中断，已输出内容保留在客户端
  } finally {
    res.end();
  }
}

router.post('/coach/start', requireAuth, async (req, res) => {
  const { skill_id, user_message } = req.body || {};
  if (!skill_id || !user_message) return res.status(400).json({ error: '缺少必要参数' });
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skill_id);
  if (!skill) return res.status(404).json({ error: 'Skill不存在' });

  const messages = [
    { role: 'system', content: buildSystemPrompt(skill) },
    { role: 'user', content: user_message },
  ];
  await streamCoachReply(res, messages);
});

router.post('/coach/reply', requireAuth, async (req, res) => {
  const { skill_id, conversation_history, user_message } = req.body || {};
  if (!skill_id || !user_message) return res.status(400).json({ error: '缺少必要参数' });
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skill_id);
  if (!skill) return res.status(404).json({ error: 'Skill不存在' });

  const history = Array.isArray(conversation_history) ? conversation_history : [];
  const messages = [
    { role: 'system', content: buildSystemPrompt(skill) },
    ...history,
    { role: 'user', content: user_message },
  ];
  await streamCoachReply(res, messages);
});

module.exports = router;
