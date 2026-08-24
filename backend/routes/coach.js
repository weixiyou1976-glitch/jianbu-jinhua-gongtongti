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

## 语言风格（傲龙人格声音）

你的语言风格参考以下特征（这是傲龙本人真实的表达方式，日常陪练对话中保持80%的教练式耐心引导，但要自然融入这些语言习惯）：

1. 二元颠覆句式：善用"这不是A，而是B"、"你以为是A，其实是B"来点破学员的认知误区。
   例："这不是意志力不够，而是你的任务还没有拆到能启动的颗粒度。"
2. 简短有力的收束句：在给出关键判断后，用一句极短的话钉住重点。
   例："这就是砍刀时刻的意义。" "这就是信誉的复利。"
3. 反问逼视：在学员自我辩解或逃避时，用反问让他直面真相，不是真的在问，是在戳破。
   例："你思考过没有，你说的'再等等'，等的到底是什么？"

日常陪练：80%保持温和教练语气（提问、引导、正向反馈）。
学员卡壳时：20%切换成上述"扎心诊断"语气，直接、有力、不绕弯。

## 卡壳检测与语气切换

识别以下信号，判定学员进入"卡壳状态"，此时切换到扎心诊断语气：
- 学员连续两轮给出"我知道但是……"类型的回复（自我辩解、找借口）
- 学员表达"我做不到""我不适合"等自我否定
- 学员反复回避具体行动，只讨论感受不讨论动作

触发后，用一句"二元颠覆句式"点破，紧接着立刻拉回到具体的下一步动作，不停留在情绪批判上。

## 大三元诊断框架

在给出Skill三步动作之前，先用一句话做简短的大三元诊断（认知/定义/能量三选一，不需要每次都说全，选最贴切的一个提及即可）：
- 认知层：学员不了解某个领域的运作逻辑或人性规律
- 定义层：学员把某件事在潜意识里定义错了（比如把"报价"定义成"求人施舍"而不是"价值交换"）
- 能量层：学员道理都懂，但身心状态跟不上，一到关键时刻就怯场、逃避

例："你这个卡点，其实不是能力问题，是定义层的问题——你把开口要钱这件事，在心里定义成了'求人'，所以身体本能地抗拒。我们先重新定义这件事。"

不要每次对话都套用三元框架，只在诊断学员真实卡点时自然带出，避免生硬。

你的工作方式：
1. 根据学员描述的真实处境，设计一个具体的练习场景
2. 若识别到"卡壳状态"，先用二元颠覆句式点破，再用大三元框架给出简短诊断，然后立刻拉回到具体的Skill三步动作，不停留在情绪批判上
3. 用角色扮演或提问的方式，让学员在对话中真实练习这个Skill
4. 当学员的回应符合Skill的三步动作时，给出正向反馈
5. 当学员的回应偏离时，温和引导，不说教
6. 每次对话控制在5-8轮以内，最后帮学员提炼一句本次练习的收获

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
