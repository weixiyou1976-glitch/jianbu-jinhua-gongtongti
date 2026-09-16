const db = require('../db');

const SHARE_MILESTONES = [
  { milestone: 10, reward_content: '私房话解锁 1 条 + "传播者" 标签' },
  { milestone: 30, reward_content: '私房话解锁 2 条 + 今日双签', has_double_quote: true },
  { milestone: 50, reward_content: '私房话解锁 5 条 + 专属头像框' },
  { milestone: 100, reward_content: '私房话解锁 10 条 + "传播官" 标签 + 续费 9 折', quote_discount: 0.9 },
  { milestone: 200, reward_content: '私房话解锁 20 条 + 永久双签 + 续费 8 折', has_double_quote: true, quote_discount: 0.8 },
  { milestone: 1000, reward_content: '全部私房话解锁 + "渐步首席传播官" 标签 + 永久续费 5 折', quote_discount: 0.5 },
];

const CONVERSION_MILESTONES = [
  { milestone: 1, reward_content: '"渐行者" 标签 + 私房话解锁 1 条' },
  { milestone: 3, reward_content: '"渐进者" 标签 + 隐藏 Skill 5 张 + 1对1答疑 1 次 + 续费 8 折', quote_discount: 0.8 },
  { milestone: 10, reward_content: '"渐领者" 标签 + 全部隐藏 Skill' },
  { milestone: 30, reward_content: '"渐步大使" 标签 + 联名 Skill 卡 + 季度闭门分享会邀请' },
];

function getShareTag(count) {
  if (count >= 1000) return '渐步首席传播官';
  if (count >= 100) return '传播官';
  if (count >= 10) return '传播者';
  return null;
}

function getConversionTag(count) {
  if (count >= 30) return '渐步大使';
  if (count >= 10) return '渐领者';
  if (count >= 3) return '渐进者';
  if (count >= 1) return '渐行者';
  return null;
}

const insertReward = db.prepare(`
  INSERT OR IGNORE INTO referral_rewards (user_id, reward_type, milestone, reward_content)
  VALUES (?, ?, ?, ?)
`);

// 检查并写入新达成的里程碑奖励，同步更新users表的双签/折扣/等级字段
function checkAndGrantMilestones(userId, type, newCount) {
  const list = type === 'share_click' ? SHARE_MILESTONES : CONVERSION_MILESTONES;
  const levelColumn = type === 'share_click' ? 'referral_level_share' : 'referral_level_conversion';

  const user = db.prepare('SELECT has_double_quote, quote_discount FROM users WHERE id = ?').get(userId);
  if (!user) return;

  let hasDoubleQuote = !!user.has_double_quote;
  let quoteDiscount = user.quote_discount;
  let level = 0;

  list.forEach((m, i) => {
    if (newCount < m.milestone) return;
    level = i + 1;
    const info = insertReward.run(userId, type, m.milestone, m.reward_content);
    if (info.changes > 0) {
      if (m.has_double_quote) hasDoubleQuote = true;
      if (typeof m.quote_discount === 'number' && m.quote_discount < quoteDiscount) {
        quoteDiscount = m.quote_discount;
      }
    }
  });

  db.prepare(
    `UPDATE users SET ${levelColumn} = MAX(${levelColumn}, ?), has_double_quote = ?, quote_discount = ? WHERE id = ?`
  ).run(level, hasDoubleQuote ? 1 : 0, quoteDiscount, userId);
}

module.exports = {
  SHARE_MILESTONES,
  CONVERSION_MILESTONES,
  getShareTag,
  getConversionTag,
  checkAndGrantMilestones,
};
