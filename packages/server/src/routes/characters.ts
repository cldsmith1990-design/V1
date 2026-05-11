import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { authMiddleware } from '../middleware/auth';

export const charactersRouter = Router();
charactersRouter.use(authMiddleware);

const characterSchema = z.object({
  name: z.string().min(1).max(80),
  campaignId: z.string(),
  class: z.string().optional(),
  race: z.string().optional(),
  level: z.number().int().min(1).max(20).default(1),
  hp: z.number().int().min(1).default(10),
  maxHp: z.number().int().min(1).default(10),
  ac: z.number().int().min(1).default(10),
  speed: z.number().int().default(30),
  initiativeBonus: z.number().int().default(0),
  strength: z.number().int().min(1).max(30).default(10),
  dexterity: z.number().int().min(1).max(30).default(10),
  constitution: z.number().int().min(1).max(30).default(10),
  intelligence: z.number().int().min(1).max(30).default(10),
  wisdom: z.number().int().min(1).max(30).default(10),
  charisma: z.number().int().min(1).max(30).default(10),
  notes: z.string().optional(),
  tokenColor: z.string().optional(),
});

charactersRouter.get('/', async (req, res) => {
  const characters = await prisma.character.findMany({
    where: { userId: req.user!.userId },
    orderBy: { updatedAt: 'desc' },
  });
  return res.json({ characters });
});

charactersRouter.post('/', async (req, res) => {
  const result = characterSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const character = await prisma.character.create({
    data: { ...result.data, userId: req.user!.userId },
  });
  return res.status(201).json({ character });
});

charactersRouter.put('/:id', async (req, res) => {
  const character = await prisma.character.findUnique({ where: { id: req.params.id } });
  if (!character) return res.status(404).json({ error: 'Not found' });
  if (character.userId !== req.user!.userId) return res.status(403).json({ error: 'Forbidden' });

  const result = characterSchema.partial().safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const updated = await prisma.character.update({
    where: { id: req.params.id },
    data: result.data,
  });
  return res.json({ character: updated });
});

charactersRouter.get('/:id', async (req, res) => {
  const character = await prisma.character.findUnique({ where: { id: req.params.id } });
  if (!character) return res.status(404).json({ error: 'Not found' });
  return res.json({ character });
});
