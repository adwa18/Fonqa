// src/server.js — Fonqa (ፎንቃ)
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
// const { PrismaClient } = require('@prisma/client');

const logger = require('./utils/logger');
const rateLimiter = require('./middleware/rateLimit');
const { socketAuth } = require('./middleware/auth');
const { registerSocketHandlers } = require('./socket/handlers');

// Routes
const authRoutes       = require('./routes/auth');
const profileRoutes    = require('./routes/profiles');
const swipeRoutes      = require('./routes/swipes');
const matchRoutes      = require('./routes/matches');
const messageRoutes    = require('./routes/messages');
const uploadRoutes     = require('./routes/uploads');
const reportRoutes     = require('./routes/reports');
const premiumRoutes    = require('./routes/premium');
const verifyRoutes     = require('./routes/verify');
const referralRoutes   = require('./routes/referrals');
const notifyRoutes     = require('./routes/notifications');
const adminRoutes      = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const prisma = require('./lib/prisma'); // path relative to src/server.js

// const prisma = new PrismaClient();

// ── Socket.io
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.set('io', io);
app.set('prisma', prisma);

// ── Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: m => logger.info(m.trim()) } }));

// ── Health
app.get('/health', (req, res) => res.json({ status: 'ok', app: 'Fonqa', timestamp: new Date() }));

// ── API
app.use('/api/', rateLimiter);
app.use('/api/auth',          authRoutes);
app.use('/api/profiles',      profileRoutes);
app.use('/api/swipes',        swipeRoutes);
app.use('/api/matches',       matchRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/uploads',       uploadRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/premium',       premiumRoutes);
app.use('/api/verify',        verifyRoutes);
app.use('/api/referrals',     referralRoutes);
app.use('/api/notifications', notifyRoutes);
app.use('/api/admin',         adminRoutes);

// ── Socket.io
io.use(socketAuth);
io.on('connection', socket => registerSocketHandlers(io, socket, prisma));

// ── Serve React frontend
const FRONTEND = path.join(__dirname, '../../frontend/dist');
app.use(express.static(FRONTEND));
app.get('*', (req, res) => res.sendFile(path.join(FRONTEND, 'index.html')));

// ── Error handler
app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  res.status(err.statusCode || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => logger.info(`Fonqa running on :${PORT}`));
module.exports = { app, io, prisma };
