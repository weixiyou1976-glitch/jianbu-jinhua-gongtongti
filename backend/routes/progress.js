const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/progress', requireAuth, (req, res) => {
  const total = 52;
  const checkins = db
    .prepare(
      `SELECT checkins.checked_at, skills.week_number
       FROM checkins JOIN skills ON skills.id = checkins.skill_id
       WHERE checkins.user_id = ?
       ORDER BY skills.week_number ASC`
    )
    .all(req.user.id);

  const completedWeeks = new Set(checkins.map((c) => c.week_number));
  const grid = Array.from({ length: total }, (_, i) => ({
    week: i + 1,
    completed: completedWeeks.has(i + 1),
  }));

  const dates = checkins
    .map((c) => c.checked_at.slice(0, 10))
    .sort()
    .filter((d, i, arr) => arr.indexOf(d) === i);

  let streak = 0;
  if (dates.length) {
    let cursor = new Date();
    for (let i = 0; i < 365; i++) {
      const key = cursor.toISOString().slice(0, 10);
      if (dates.includes(key)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (streak === 0 && key === new Date().toISOString().slice(0, 10)) {
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
  }

  res.json({
    total,
    completed: completedWeeks.size,
    percent: Math.round((completedWeeks.size / total) * 100),
    streak,
    grid,
  });
});

module.exports = router;
