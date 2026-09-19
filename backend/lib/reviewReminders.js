// 复习提醒节奏：第一次策印后 24小时/3天/7天/30天，各触发一次，容差窗口内命中即算。
const ROUNDS = [
  { round: 1, targetHours: 24, toleranceHours: 2 },
  { round: 2, targetHours: 72, toleranceHours: 4 },
  { round: 3, targetHours: 168, toleranceHours: 8 },
  { round: 4, targetHours: 720, toleranceHours: 12 },
];

const ROUND_PROMPTS = {
  1: '昨天用出来了，今天有没有再遇到这个场景？',
  2: '3天前用出来了，它还在吗？',
  3: '一周前用出来了，说说这一周你用到过几次',
  4: '一个月前装进来的，现在是检验它是否真正在用的时候了',
};

// 对每个已策印的 skill，检查其首次策印时间是否落入某一轮的容差窗口，命中且未记录过则写入一条提醒。
function triggerDueReminders(db, userId) {
  const rows = db
    .prepare(
      `SELECT skill_id, MIN(submitted_at) AS first_at,
              (julianday('now') - julianday(MIN(submitted_at))) * 24 AS hours_elapsed
       FROM stamps WHERE user_id = ? GROUP BY skill_id`
    )
    .all(userId);
  if (rows.length === 0) return;

  const insert = db.prepare(
    `INSERT OR IGNORE INTO review_reminders (user_id, skill_id, review_round, triggered_at)
     VALUES (?, ?, ?, datetime('now'))`
  );

  const tx = db.transaction(() => {
    for (const { skill_id, hours_elapsed } of rows) {
      for (const { round, targetHours, toleranceHours } of ROUNDS) {
        if (Math.abs(hours_elapsed - targetHours) <= toleranceHours) {
          insert.run(userId, skill_id, round);
        }
      }
    }
  });
  tx();
}

function getDueReminders(db, userId) {
  return db
    .prepare(
      `SELECT r.id, r.skill_id, r.review_round, r.triggered_at, s.skill_name
       FROM review_reminders r
       JOIN skills s ON s.id = r.skill_id
       WHERE r.user_id = ? AND r.opened = 0
       ORDER BY r.review_round ASC, r.triggered_at ASC`
    )
    .all(userId);
}

module.exports = { ROUNDS, ROUND_PROMPTS, triggerDueReminders, getDueReminders };
