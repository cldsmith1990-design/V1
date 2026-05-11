import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { authRouter } from './routes/auth';
import { campaignsRouter } from './routes/campaigns';
import { charactersRouter } from './routes/characters';
import { mapsRouter } from './routes/maps';
import { uploadsRouter, UPLOADS_DIR } from './routes/uploads';
import { setupSocketHandlers } from './socket';

const app = express();
const httpServer = createServer(app);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

// Rate limiting (simple in-process — use express-rate-limit + Redis in production)
const requestCounts = new Map<string, { count: number; resetAt: number }>();
app.use((req, res, next) => {
  const ip = req.ip ?? 'unknown';
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || entry.resetAt < now) {
    requestCounts.set(ip, { count: 1, resetAt: now + 60_000 });
  } else {
    entry.count++;
    if (entry.count > 300) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }
  }
  next();
});

// ── Static file serving for uploaded map images ───────────────────────────────
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '7d',
  immutable: false,
}));

// ── REST Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/characters', charactersRouter);
app.use('/api/maps', mapsRouter);
app.use('/api/uploads', uploadsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: {
    origin: config.clientUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60_000,
  pingInterval: 25_000,
});

setupSocketHandlers(io);

// ── Start ─────────────────────────────────────────────────────────────────────
httpServer.listen(config.port, () => {
  console.log(`🎲 DnD Tabletop server running on port ${config.port}`);
  console.log(`   Client URL: ${config.clientUrl}`);
  console.log(`   Environment: ${config.nodeEnv}`);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  httpServer.close();
  process.exit(0);
});
