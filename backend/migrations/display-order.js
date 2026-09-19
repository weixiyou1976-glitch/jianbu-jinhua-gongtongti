// [display_order, week_number] 主线路径映射：52周主线，分5个阶段。
// 与 week_number 完全独立，只用于"按周学习"入口的排序与解锁节奏（每5天解锁一张）。
const DISPLAY_ORDER_MAP = [
  [1, 7], [2, 199], [3, 33], [4, 216], [5, 217], [6, 215], [7, 218], [8, 8], [9, 6], [10, 54],
  [11, 1], [12, 35], [13, 38], [14, 3], [15, 10], [16, 207], [17, 208], [18, 209], [19, 36], [20, 37],
  [21, 49], [22, 50], [23, 20], [24, 28], [25, 22], [26, 210], [27, 52], [28, 211], [29, 29], [30, 51],
  [31, 213], [32, 214], [33, 58], [34, 4], [35, 61], [36, 69], [37, 71], [38, 72], [39, 48], [40, 60],
  [41, 16], [42, 17], [43, 18], [44, 21], [45, 19], [46, 219], [47, 220], [48, 222], [49, 53], [50, 26],
  [51, 59], [52, 64],
];

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
