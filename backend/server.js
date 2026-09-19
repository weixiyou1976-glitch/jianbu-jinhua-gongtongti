require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const skillsRoutes = require('./routes/skills');
const stampsRoutes = require('./routes/stamps');
const progressRoutes = require('./routes/progress');
const adminRoutes = require('./routes/admin');
const coachRoutes = require('./routes/coach');
const modulesRoutes = require('./routes/modules');
const trialRoutes = require('./routes/trial');
const referralRoutes = require('./routes/referral');
const quotesRoutes = require('./routes/quotes');
const rewardsRoutes = require('./routes/rewards');
const growthRoutes = require('./routes/growth');
const reviewsRoutes = require('./routes/reviews');

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : '*';

const app = express();
app.set('trust proxy', true);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api', skillsRoutes);
app.use('/api', stampsRoutes);
app.use('/api', progressRoutes);
app.use('/api', coachRoutes);
app.use('/api', modulesRoutes);
app.use('/api', trialRoutes);
app.use('/api', referralRoutes);
app.use('/api', quotesRoutes);
app.use('/api', rewardsRoutes);
app.use('/api', growthRoutes);
app.use('/api', reviewsRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '服务器内部错误' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`渐步进化共同体 后端已启动 http://localhost:${PORT}`);
});
