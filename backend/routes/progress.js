const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { computeStreak } = require('../lib/streak');

const router = express.Router();

function checkinDates(table, userId) {
  return db
    .prepare(`SELECT checkin_date FROM ${table} WHERE user_id = ?`)
    .all(userId)
    .map((r) => r.checkin_date);
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

router.post('/learning-checkin', requireAuth, (req, res) => {
  const skillId = Number(req.body?.skill_id);
  if (!skillId) return res.status(400).json({ error: '缺少 skill_id' });
  const skill = db.prepare('SELECT id FROM skills WHERE id = ?').get(skillId);
  if (!skill) return res.status(404).json({ error: 'Skill不存在' });

  const today = new Date().toISOString().slice(0, 10);
  const info = db
    .prepare('INSERT OR IGNORE INTO learning_checkins (user_id, checkin_date, skill_id) VALUES (?, ?, ?)')
    .run(req.user.id, today, skillId);

  res.json({ is_new: info.changes > 0 });
});

router.get('/checkin/stats', requireAuth, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);

  const visitDates = checkinDates('daily_checkins', req.user.id);
  const learningDates = checkinDates('learning_checkins', req.user.id);
  const practiceDates = checkinDates('practice_checkins', req.user.id);

  const todayPractice = practiceDates.includes(today);
  const hadYesterdayPractice = practiceDates.includes(yesterday);
  const hadEarlierPractice = practiceDates.some((d) => d < today);
  const practiceStreakBroken = !todayPractice && !hadYesterdayPractice && hadEarlierPractice;

  res.json({
    visit_streak: computeStreak(visitDates),
    learning_streak: computeStreak(learningDates),
    practice_streak: computeStreak(practiceDates),
    today_visit: visitDates.includes(today),
    today_learning: learningDates.includes(today),
    today_practice: todayPractice,
    practice_streak_broken: practiceStreakBroken,
  });
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

  const skillsMastered = db
    .prepare('SELECT COUNT(DISTINCT skill_id) AS c FROM stamps WHERE user_id = ?')
    .get(req.user.id).c;
  const totalStamps = db.prepare('SELECT COUNT(*) AS c FROM stamps WHERE user_id = ?').get(req.user.id).c;

  res.json({
    total,
    completed: completedWeeks.size,
    skills_mastered: skillsMastered,
    total_stamps: totalStamps,
    streak,
    grid,
  });
});

module.exports = router;
