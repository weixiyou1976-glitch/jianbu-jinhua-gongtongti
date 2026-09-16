const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth, ACCOUNT_LOCKED_MESSAGE } = require('../middleware/auth');

const router = express.Router();

const LOGIN_WHILE_LOCKED_MESSAGE =
  '你的账号因为在多个设备登录已被锁定，请联系傲龙解锁（微信：751759951）';

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
}

function registerDevice(userId, fingerprint, deviceName) {
  db.prepare(
    `INSERT INTO devices (user_id, device_fingerprint, device_name) VALUES (?, ?, ?)`
  ).run(userId, fingerprint, deviceName || '');
}

// 返回 null 表示放行；返回字符串表示登录应被拒绝的原因
function checkAndTrackDevice(user, fingerprint, deviceName) {
  if (!fingerprint) return null;

  const existingDevice = db
    .prepare('SELECT id FROM devices WHERE user_id = ? AND device_fingerprint = ?')
    .get(user.id, fingerprint);

  if (existingDevice) {
    db.prepare("UPDATE devices SET last_active_at = datetime('now') WHERE id = ?").run(existingDevice.id);
    return null;
  }

  const deviceCount = db.prepare('SELECT COUNT(*) AS c FROM devices WHERE user_id = ?').get(user.id).c;
  const limit = user.device_limit || 2;
  if (deviceCount >= limit) {
    db.prepare('UPDATE users SET account_locked = 1, locked_reason = ? WHERE id = ?').run('多设备登录', user.id);
    return ACCOUNT_LOCKED_MESSAGE;
  }

  registerDevice(user.id, fingerprint, deviceName);
  return null;
}

router.post('/register', (req, res) => {
  const { activation_code, email, password, device_fingerprint, device_name } = req.body || {};
  if (!activation_code || !email || !password) {
    return res.status(400).json({ error: '激活码、邮箱、密码均为必填' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' });
  }

  const code = db
    .prepare('SELECT * FROM activation_codes WHERE code = ?')
    .get(activation_code.trim().toUpperCase());
  if (!code) return res.status(400).json({ error: '激活码不存在' });
  if (code.used) return res.status(400).json({ error: '激活码已被使用' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existing) return res.status(400).json({ error: '该邮箱已注册，请直接登录' });

  const passwordHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, activation_code, activated_at, enrolled_at, referral_code)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const markCode = db.prepare(`
    UPDATE activation_codes SET used = 1, used_by = ?, used_at = ? WHERE code = ?
  `);

  const tx = db.transaction(() => {
    const info = insertUser.run(
      email.trim().toLowerCase(),
      passwordHash,
      code.code,
      now,
      now,
      db.generateReferralCode()
    );
    markCode.run(info.lastInsertRowid, now, code.code);
    return info.lastInsertRowid;
  });

  const userId = tx();
  if (device_fingerprint) {
    registerDevice(userId, device_fingerprint, device_name);
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.json({
    token: signToken(user),
    user: { id: user.id, email: user.email, enrolled_at: user.enrolled_at, referral_code: user.referral_code },
  });
});

router.post('/login', (req, res) => {
  const { email, password, device_fingerprint, device_name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: '邮箱和密码均为必填' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  if (user.account_locked) {
    return res.status(401).json({ error: LOGIN_WHILE_LOCKED_MESSAGE, locked: true });
  }

  const lockMessage = checkAndTrackDevice(user, device_fingerprint, device_name);
  if (lockMessage) {
    return res.status(401).json({ error: lockMessage, locked: true });
  }

  res.json({
    token: signToken(user),
    user: { id: user.id, email: user.email, enrolled_at: user.enrolled_at, referral_code: user.referral_code },
  });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, enrolled_at, referral_code FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ user });
});

module.exports = router;
