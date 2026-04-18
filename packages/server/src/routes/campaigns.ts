import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { authMiddleware } from '../middleware/auth';

export const campaignsRouter = Router();
campaignsRouter.use(authMiddleware);

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
});

// List campaigns the user owns or participates in
campaignsRouter.get('/', async (req, res) => {
  const userId = req.user!.userId;
  const campaigns = await prisma.campaign.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { sessions: { some: { users: { some: { userId } } } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true } },
      _count: { select: { sessions: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return res.json({ campaigns });
});

campaignsRouter.post('/', async (req, res) => {
  const result = createSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const campaign = await prisma.campaign.create({
    data: {
      name: result.data.name,
      description: result.data.description,
      ownerId: req.user!.userId,
    },
  });
  return res.status(201).json({ campaign });
});

// Join via invite code
campaignsRouter.post('/join', async (req, res) => {
  const { inviteCode } = req.body as { inviteCode: string };
  if (!inviteCode) return res.status(400).json({ error: 'inviteCode required' });

  const campaign = await prisma.campaign.findUnique({ where: { inviteCode } });
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  return res.json({ campaign });
});

campaignsRouter.get('/:id', async (req, res) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, name: true } },
      sessions: { orderBy: { createdAt: 'desc' } },
      maps: { select: { id: true, name: true, gridWidth: true, gridHeight: true } },
      characters: {
        where: { userId: req.user!.userId },
        select: { id: true, name: true, class: true, level: true },
      },
    },
  });
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  return res.json({ campaign });
});

// Create a session within a campaign (DM only)
campaignsRouter.post('/:id/sessions', async (req, res) => {
  const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  if (campaign.ownerId !== req.user!.userId) {
    return res.status(403).json({ error: 'Only the DM can create sessions' });
  }

  const { name } = req.body as { name: string };
  const session = await prisma.session.create({
    data: {
      campaignId: campaign.id,
      name: name || `Session ${Date.now()}`,
      state: {
        sessionId: '',
        mapId: '',
        tokens: {},
        encounter: { active: false, round: 0, currentIndex: 0, entries: [] },
        fog: { revealed: {} },
        lockedMovement: false,
        activeMapId: '',
      },
    },
  });
  // Add DM as session user
  await prisma.sessionUser.create({
    data: { sessionId: session.id, userId: req.user!.userId, role: 'dm' },
  });
  return res.status(201).json({ session });
});

// Get session details + join as player
campaignsRouter.get('/:campaignId/sessions/:sessionId', async (req, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.sessionId },
    include: {
      campaign: { select: { id: true, name: true, ownerId: true } },
      users: {
        include: { user: { select: { id: true, name: true, avatarColor: true } } },
      },
    },
  });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  return res.json({ session });
});

// Join session as player
campaignsRouter.post('/:campaignId/sessions/:sessionId/join', async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user!.userId;
  const { characterId } = req.body as { characterId?: string };

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { campaign: true },
  });
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const isDM = session.campaign.ownerId === userId;
  const role = isDM ? 'dm' : 'player';

  await prisma.sessionUser.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    create: { sessionId, userId, role, characterId },
    update: { characterId },
  });

  return res.json({ role, sessionId });
});
