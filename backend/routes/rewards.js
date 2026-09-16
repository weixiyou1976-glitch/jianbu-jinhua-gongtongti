const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { SHARE_MILESTONES, CONVERSION_MILESTONES, getShareTag, getConversionTag } = require('../lib/rewards');

const router = express.Router();

function maskEmail(email) {
  const [name, domain] = (email || '').split('@');
  if (!name || !domain) return email || '未知';
  if (name.length <= 2) return `${name[0]}*@${domain}`;
  return `${name.slice(0, 2)}${'*'.repeat(Math.min(name.length - 2, 4))}@${domain}`;
}

router.get('/rewards/pending', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      'SELECT id, reward_type, milestone, reward_content, unlocked_at FROM referral_rewards WHERE user_id = ? AND is_notified = 0 ORDER BY unlocked_at ASC'
    )
    .all(req.user.id);
  res.json(rows);
});

router.post('/rewards/:id/mark-notified', requireAuth, (req, res) => {
  db.prepare('UPDATE referral_rewards SET is_notified = 1 WHERE id = ? AND user_id = ?').run(
    req.params.id,
    req.user.id
  );
  res.json({ ok: true });
});

router.get('/rewards/me', requireAuth, (req, res) => {
  const user = db
    .prepare(
      `SELECT share_click_count, conversion_count, has_double_quote, quote_discount
       FROM users WHERE id = ?`
    )
    .get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const unlockedShare = new Set(
    db.prepare("SELECT milestone FROM referral_rewards WHERE user_id = ? AND reward_type = 'share_click'").all(req.user.id).map((r) => r.milestone)
  );
  const unlockedConversion = new Set(
    db.prepare("SELECT milestone FROM referral_rewards WHERE user_id = ? AND reward_type = 'conversion'").all(req.user.id).map((r) => r.milestone)
  );

  const shareMilestones = SHARE_MILESTONES.map((m) => ({
    milestone: m.milestone,
    reward_content: m.reward_content,
    unlocked: unlockedShare.has(m.milestone),
    remaining: Math.max(0, m.milestone - user.share_click_count),
  }));
  const conversionMilestones = CONVERSION_MILESTONES.map((m) => ({
    milestone: m.milestone,
    reward_content: m.reward_content,
    unlocked: unlockedConversion.has(m.milestone),
    remaining: Math.max(0, m.milestone - user.conversion_count),
  }));

  const fangsVoice = db
    .prepare('SELECT id, title, audio_url, required_share_clicks, required_conversions FROM fangs_voice ORDER BY created_at ASC')
    .all()
    .map((f) => ({
      id: f.id,
      title: f.title,
      audio_url: f.audio_url,
      required_share_clicks: f.required_share_clicks,
      required_conversions: f.required_conversions,
      unlocked:
        (f.required_share_clicks > 0 && user.share_click_count >= f.required_share_clicks) ||
        (f.required_conversions > 0 && user.conversion_count >= f.required_conversions),
    }));

  const commissionRows = db
    .prepare(
      `SELECT c.id, c.commission_type, c.order_amount, c.commission_amount, c.status, c.created_at, c.paid_at, p.email AS payer_email
       FROM commission_records c
       JOIN users p ON p.id = c.payer_user_id
       WHERE c.beneficiary_user_id = ?
       ORDER BY c.created_at DESC`
    )
    .all(req.user.id);

  const commissions = commissionRows.map((r) => ({ ...r, payer_label: maskEmail(r.payer_email) }));
  const commissionSummary = commissions.reduce(
    (acc, c) => {
      acc.total += c.commission_amount;
      if (c.status === 'paid') acc.paid += c.commission_amount;
      else acc.pending += c.commission_amount;
      return acc;
    },
    { total: 0, paid: 0, pending: 0 }
  );

  res.json({
    share_click_count: user.share_click_count,
    conversion_count: user.conversion_count,
    has_double_quote: !!user.has_double_quote,
    quote_discount: user.quote_discount,
    share_tag: getShareTag(user.share_click_count),
    conversion_tag: getConversionTag(user.conversion_count),
    share_milestones: shareMilestones,
    conversion_milestones: conversionMilestones,
    fangs_voice: fangsVoice,
    commissions,
    commission_summary: commissionSummary,
  });
});

module.exports = router;
