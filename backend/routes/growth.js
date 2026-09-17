const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { GROWTH_LEVELS, currentStats, nextLevelGap } = require('../lib/growth');

const router = express.Router();

function meaningForLevel(level) {
  return GROWTH_LEVELS.find((g) => g.level === level)?.meaning || '';
}

router.get('/growth/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT growth_level, growth_title FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const stats = currentStats(req.user.id);
  const nextLevel = nextLevelGap(req.user.id, user.growth_level);

  res.json({
    growth_level: user.growth_level,
    growth_title: user.growth_title,
    growth_meaning: user.growth_level ? meaningForLevel(user.growth_level) : '',
    distinct_skills: stats.distinctSkills,
    total_stamps: stats.totalStamps,
    practice_streak: stats.practiceStreak,
    next_level: nextLevel,
  });
});

router.get('/growth/pending', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      'SELECT id, level, title, achieved_at FROM growth_achievements WHERE user_id = ? AND is_notified = 0 ORDER BY achieved_at ASC'
    )
    .all(req.user.id);
  res.json(rows.map((r) => ({ ...r, meaning: meaningForLevel(r.level) })));
});

router.post('/growth/:id/mark-notified', requireAuth, (req, res) => {
  db.prepare('UPDATE growth_achievements SET is_notified = 1 WHERE id = ? AND user_id = ?').run(
    req.params.id,
    req.user.id
  );
  res.json({ ok: true });
});

module.exports = router;
