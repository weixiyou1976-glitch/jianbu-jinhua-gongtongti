const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function computeStreak(dates) {
  let streak = 0;
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
  return streak;
}

router.post('/checkin', requireAuth, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);

  const alreadyToday = !!db
    .prepare('SELECT 1 FROM daily_checkins WHERE user_id = ? AND checkin_date = ?')
    .get(req.user.id, today);

  let streakBroken = false;
  if (!alreadyToday) {
    const hadYesterday = !!db
      .prepare('SELECT 1 FROM daily_checkins WHERE user_id = ? AND checkin_date = ?')
      .get(req.user.id, yesterday);
    const hadEarlier = !!db
      .prepare('SELECT 1 FROM daily_checkins WHERE user_id = ? AND checkin_date < ?')
      .get(req.user.id, today);
    streakBroken = !hadYesterday && hadEarlier;
  }

  const info = db
    .prepare('INSERT OR IGNORE INTO daily_checkins (user_id, checkin_date) VALUES (?, ?)')
    .run(req.user.id, today);

  const dates = db
    .prepare('SELECT checkin_date FROM daily_checkins WHERE user_id = ?')
    .all(req.user.id)
    .map((r) => r.checkin_date);
  const streak = computeStreak(dates);

  res.json({ is_new: info.changes > 0, streak, streak_broken: streakBroken });
});

router.get('/progress', requireAuth, (req, res) => {
  const total = db.prepare('SELECT MAX(week_number) AS m FROM skills').get().m || 52;

  const stampedWeeks = db
    .prepare(
      `SELECT DISTINCT skills.week_number AS week_number
       FROM stamps JOIN skills ON skills.id = stamps.skill_id
       WHERE stamps.user_id = ?`
    )
    .all(req.user.id)
    .map((r) => r.week_number);
  const completedWeeks = new Set(stampedWeeks);
  const grid = Array.from({ length: total }, (_, i) => ({
    week: i + 1,
    completed: completedWeeks.has(i + 1),
  }));

  const dates = db
    .prepare('SELECT checkin_date FROM daily_checkins WHERE user_id = ?')
    .all(req.user.id)
    .map((r) => r.checkin_date);
  const streak = computeStreak(dates);

  res.json({
    total,
    completed: completedWeeks.size,
    percent: Math.round((completedWeeks.size / total) * 100),
    streak,
    grid,
  });
});

module.exports = router;
