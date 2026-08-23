require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const skillsRoutes = require('./routes/skills');
const stampsRoutes = require('./routes/stamps');
const progressRoutes = require('./routes/progress');
const adminRoutes = require('./routes/admin');
const coachRoutes = require('./routes/coach');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api', skillsRoutes);
app.use('/api', stampsRoutes);
app.use('/api', progressRoutes);
app.use('/api', coachRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '服务器内部错误' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`渐步进化共同体 后端已启动 http://localhost:${PORT}`);
});
