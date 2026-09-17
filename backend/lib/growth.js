const db = require('../db');
const { computeStreak } = require('./streak');

const GROWTH_LEVELS = [
  {
    level: 1,
    title: '渐步践行者',
    meaning: '你用出来了，这是第一步',
    requires: { totalStamps: 1 },
  },
  {
    level: 2,
    title: '渐步修行者',
    meaning: '10个能力，已经装进来了',
    requires: { distinctSkills: 10 },
  },
  {
    level: 3,
    title: '渐步精进者',
    meaning: '30个Skill，50次真实调用，你在真正训练',
    requires: { distinctSkills: 30, totalStamps: 50 },
  },
  {
    level: 4,
    title: '渐步实战家',
    meaning: '60个能力可调用，100次真实记录——少数人才到这里',
    requires: { distinctSkills: 60, totalStamps: 100 },
  },
  {
    level: 5,
    title: '渐步化境者',
    meaning: '把本事练进骨子里——你做到了',
    requires: { distinctSkills: 100, totalStamps: 200, practiceStreak: 30 },
  },
];

function meetsRequirement(stats, requires) {
  return (
    (!requires.distinctSkills || stats.distinctSkills >= requires.distinctSkills) &&
    (!requires.totalStamps || stats.totalStamps >= requires.totalStamps) &&
    (!requires.practiceStreak || stats.practiceStreak >= requires.practiceStreak)
  );
}

function currentStats(userId) {
  const distinctSkills = db
    .prepare('SELECT COUNT(DISTINCT skill_id) AS c FROM stamps WHERE user_id = ?')
    .get(userId).c;
  const totalStamps = db.prepare('SELECT COUNT(*) AS c FROM stamps WHERE user_id = ?').get(userId).c;
  const practiceDates = db
    .prepare('SELECT checkin_date FROM practice_checkins WHERE user_id = ?')
    .all(userId)
    .map((r) => r.checkin_date);
  const practiceStreak = computeStreak(practiceDates);
  return { distinctSkills, totalStamps, practiceStreak };
}

const insertAchievement = db.prepare(
  'INSERT OR IGNORE INTO growth_achievements (user_id, level, title) VALUES (?, ?, ?)'
);

// 每次提交策印后重新计算成长等级；新达成的等级写入 growth_achievements（待通知），并同步 users 表当前称号
function checkAndGrantGrowthLevel(userId) {
  const stats = currentStats(userId);
  let reached = null;
  for (const g of GROWTH_LEVELS) {
    if (meetsRequirement(stats, g.requires)) reached = g;
  }
  if (!reached) return null;

  const info = insertAchievement.run(userId, reached.level, reached.title);
  db.prepare('UPDATE users SET growth_level = ?, growth_title = ? WHERE id = ?').run(
    reached.level,
    reached.title,
    userId
  );
  return info.changes > 0 ? reached : null;
}

// 计算距离下一等级各维度还差多少；已是最高等级时返回 null
function nextLevelGap(userId, currentLevel) {
  const next = GROWTH_LEVELS.find((g) => g.level === currentLevel + 1);
  if (!next) return null;
  const stats = currentStats(userId);
  return {
    level: next.level,
    title: next.title,
    distinct_skills_remaining: Math.max(0, (next.requires.distinctSkills || 0) - stats.distinctSkills),
    total_stamps_remaining: Math.max(0, (next.requires.totalStamps || 0) - stats.totalStamps),
    practice_streak_remaining: Math.max(0, (next.requires.practiceStreak || 0) - stats.practiceStreak),
  };
}

module.exports = {
  GROWTH_LEVELS,
  checkAndGrantGrowthLevel,
  currentStats,
  nextLevelGap,
};
