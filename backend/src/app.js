const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./config/database');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

const response = (res, status, data = null, message = null, meta = null) => {
  const body = { success: status >= 200 && status < 400 };
  if (data !== null) body.data = data;
  if (message) body.message = message;
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};

app.use((req, res, next) => {
  res.success = (data, message, meta) => response(res, 200, data, message, meta);
  res.created = (data, message, meta) => response(res, 201, data, message, meta);
  res.error = (message, status = 400, meta) => response(res, status, null, message, meta);
  next();
});

app.get('/health', async (req, res) => {
  let dbConnected = false;
  try {
    await db.raw('SELECT 1');
    dbConnected = true;
  } catch (e) {
    dbConnected = false;
  }
  res.success({
    status: 'ok',
    db: dbConnected,
  });
});

const authRoutes = require('./routes/authRoutes');
app.use('/auth', authRoutes);

const orgRoutes = require('./routes/orgRoutes');
app.use('/api', orgRoutes);

const categoryRoutes = require('./routes/categoryRoutes');
app.use('/api', categoryRoutes);

const memberRoutes = require('./routes/memberRoutes');
app.use('/api', memberRoutes);

const contributionRoutes = require('./routes/contributionRoutes');
app.use('/api', contributionRoutes);

const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api', paymentRoutes);

const paymentLinkRoutes = require('./routes/paymentLinkRoutes');
app.use('/api', paymentLinkRoutes);

const paymentPublicRoutes = require('./routes/paymentPublicRoutes');
app.use('/', paymentPublicRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.error(message, status, process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined);
});

module.exports = app;