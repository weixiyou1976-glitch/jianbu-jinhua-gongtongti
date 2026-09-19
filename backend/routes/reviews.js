const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { ROUND_PROMPTS, triggerDueReminders, getDueReminders } = require('../lib/reviewReminders');

const router = express.Router();

router.get('/reviews/due', requireAuth, (req, res) => {
  triggerDueReminders(db, req.user.id);
  const rows = getDueReminders(db, req.user.id);
  res.json(
    rows.map((r) => ({
      id: r.id,
      skill_id: r.skill_id,
      skill_name: r.skill_name,
      review_round: r.review_round,
      prompt: ROUND_PROMPTS[r.review_round],
      triggered_at: r.triggered_at,
    }))
  );
});

router.put('/reviews/:id/open', requireAuth, (req, res) => {
  const info = db
    .prepare('UPDATE review_reminders SET opened = 1 WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: '提醒不存在' });
  res.json({ ok: true });
});

module.exports = router;
