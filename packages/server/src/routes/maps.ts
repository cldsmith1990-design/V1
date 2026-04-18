import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { prisma } from '../db/client';
import { authMiddleware } from '../middleware/auth';
import { UPLOADS_DIR } from './uploads';

export const mapsRouter = Router();
mapsRouter.use(authMiddleware);

const mapSchema = z.object({
  name: z.string().min(1).max(80),
  campaignId: z.string(),
  gridWidth: z.number().int().min(5).max(100).default(30),
  gridHeight: z.number().int().min(5).max(100).default(20),
  cellSize: z.number().int().min(20).max(100).default(40),
  imageUrl: z.string().url().optional(),
  terrain: z.array(z.object({
    col: z.number().int(),
    row: z.number().int(),
    type: z.enum(['normal', 'difficult', 'impassable', 'water', 'wall']),
  })).optional(),
});

mapsRouter.get('/campaign/:campaignId', async (req, res) => {
  const maps = await prisma.map.findMany({
    where: { campaignId: req.params.campaignId },
    orderBy: { updatedAt: 'desc' },
  });
  return res.json({ maps });
});

mapsRouter.post('/', async (req, res) => {
  const result = mapSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  // Verify user owns the campaign
  const campaign = await prisma.campaign.findUnique({ where: { id: result.data.campaignId } });
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  if (campaign.ownerId !== req.user!.userId) return res.status(403).json({ error: 'Only the DM can create maps' });

  const map = await prisma.map.create({ data: result.data });
  return res.status(201).json({ map });
});

mapsRouter.get('/:id', async (req, res) => {
  const map = await prisma.map.findUnique({ where: { id: req.params.id } });
  if (!map) return res.status(404).json({ error: 'Not found' });
  return res.json({ map });
});

mapsRouter.delete('/:id', async (req, res) => {
  const map = await prisma.map.findUnique({ where: { id: req.params.id } });
  if (!map) return res.status(404).json({ error: 'Not found' });

  const campaign = await prisma.campaign.findUnique({ where: { id: map.campaignId } });
  if (campaign?.ownerId !== req.user!.userId) {
    return res.status(403).json({ error: 'Only the DM can delete maps' });
  }

  // Clean up image file if present
  if (map.imageUrl) {
    const filePath = path.join(UPLOADS_DIR, path.basename(map.imageUrl));
    fs.unlink(filePath, () => {});
  }

  await prisma.map.delete({ where: { id: req.params.id } });
  return res.json({ ok: true });
});
