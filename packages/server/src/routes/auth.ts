import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db/client';
import { signToken } from '../middleware/auth';
import { PLAYER_COLORS } from '@dnd/shared';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(40),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const { email, name, password } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const color = PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];

  const user = await prisma.user.create({
    data: { email, name, passwordHash, avatarColor: color },
  });

  const token = signToken({ userId: user.id, email: user.email, name: user.name });
  return res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, avatarColor: user.avatarColor } });
});

authRouter.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const { email, password } = result.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken({ userId: user.id, email: user.email, name: user.name });
  return res.json({ token, user: { id: user.id, email: user.email, name: user.name, avatarColor: user.avatarColor } });
});

authRouter.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { verifyToken } = await import('../middleware/auth');
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return res.status(401).json({ error: 'Invalid token' });

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, avatarColor: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user });
});
