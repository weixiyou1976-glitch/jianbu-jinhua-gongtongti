const jwt = require('jsonwebtoken');
const db = require('../db');

const ACCOUNT_LOCKED_MESSAGE =
  '你的账号已被锁定。检测到你的账号在超过2个设备上登录，账号已自动锁定保护。如需解锁，请联系管理员（微信：751759951）';

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT account_locked FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: '登录已过期，请重新登录' });
    if (user.account_locked) {
      return res.status(401).json({ error: ACCOUNT_LOCKED_MESSAGE, locked: true });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: '管理员密码错误' });
  }
  next();
}

function requireTrialAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '试用信息不存在' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'trial') throw new Error('not a trial token');
    req.trial = payload;
    next();
  } catch {
    return res.status(401).json({ error: '体验时间已结束，欢迎加入渐步', expired: true });
  }
}

module.exports = { requireAuth, requireAdmin, requireTrialAuth, ACCOUNT_LOCKED_MESSAGE };
