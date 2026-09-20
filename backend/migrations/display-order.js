// [display_order, week_number] 主线路径映射：52周主线，分5个阶段。
// 与 week_number 完全独立，只用于"按周学习"入口的排序与解锁节奏（每5天解锁一张）。
const DISPLAY_ORDER_MAP = require('../lib/skillContent').loadLibrary().skills
  .filter((skill) => skill.display_order !== null)
  .map((skill) => [skill.display_order, skill.week_number]);

// 只在 display_order 还未设置时才写入，重复启动不会覆盖后台可能做的手动调整。
module.exports = function applyDisplayOrder(db) {
  const setOrder = db.prepare(
    'UPDATE skills SET display_order = ? WHERE week_number = ? AND display_order IS NULL'
  );
  const tx = db.transaction(() => {
    let updated = 0;
    for (const [order, week] of DISPLAY_ORDER_MAP) {
      const info = setOrder.run(order, week);
      updated += info.changes;
    }
    return updated;
  });
  const updated = tx();
  if (updated > 0) console.log(`display_order 主线映射：写入 ${updated} 条`);
  return updated;
};

module.exports.DISPLAY_ORDER_MAP = DISPLAY_ORDER_MAP;
