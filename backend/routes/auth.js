const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
}

router.post('/register', (req, res) => {
  const { activation_code, email, password } = req.body || {};
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
    INSERT INTO users (email, password_hash, activation_code, activated_at, enrolled_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const markCode = db.prepare(`
    UPDATE activation_codes SET used = 1, used_by = ?, used_at = ? WHERE code = ?
  `);

  const tx = db.transaction(() => {
    const info = insertUser.run(email.trim().toLowerCase(), passwordHash, code.code, now, now);
    markCode.run(info.lastInsertRowid, now, code.code);
    return info.lastInsertRowid;
  });

  const userId = tx();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.json({ token: signToken(user), user: { id: user.id, email: user.email, enrolled_at: user.enrolled_at } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: '邮箱和密码均为必填' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  res.json({ token: signToken(user), user: { id: user.id, email: user.email, enrolled_at: user.enrolled_at } });
});

module.exports = router;
