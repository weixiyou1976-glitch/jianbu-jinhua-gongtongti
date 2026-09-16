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

module.exports = { computeStreak };
