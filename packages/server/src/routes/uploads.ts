import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import { prisma } from '../db/client';
import { authMiddleware } from '../middleware/auth';

export const uploadsRouter = Router();
uploadsRouter.use(authMiddleware);

// Ensure uploads directory exists next to the server dist/src
export const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const name = `map-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, or GIF images are accepted'));
    }
  },
});

/**
 * POST /api/uploads/map
 * Multipart form fields:
 *   name        — map display name (required)
 *   campaignId  — campaign to attach to (required)
 *   gridWidth   — optional (default 30)
 *   gridHeight  — optional (default 20)
 *   cellSize    — optional (default 40)
 *   image       — the image file (required)
 *
 * Returns the created Map record with imageUrl.
 */
uploadsRouter.post('/map', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'image file is required' });
  }

  const { name, campaignId, gridWidth, gridHeight, cellSize } = req.body as {
    name?: string;
    campaignId?: string;
    gridWidth?: string;
    gridHeight?: string;
    cellSize?: string;
  };

  if (!name?.trim() || !campaignId?.trim()) {
    // Clean up uploaded file
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'name and campaignId are required' });
  }

  // Verify user owns the campaign
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    fs.unlink(req.file.path, () => {});
    return res.status(404).json({ error: 'Campaign not found' });
  }
  if (campaign.ownerId !== req.user!.userId) {
    fs.unlink(req.file.path, () => {});
    return res.status(403).json({ error: 'Only the DM can upload maps' });
  }

  const imageUrl = `/uploads/${req.file.filename}`;

  const map = await prisma.map.create({
    data: {
      campaignId,
      name: name.trim(),
      gridWidth: parseInt(gridWidth ?? '30') || 30,
      gridHeight: parseInt(gridHeight ?? '20') || 20,
      cellSize: parseInt(cellSize ?? '40') || 40,
      imageUrl,
    },
  });

  return res.status(201).json({ map });
});

/**
 * DELETE /api/uploads/map/:mapId/image
 * Removes the image file and clears imageUrl on the map.
 */
uploadsRouter.delete('/map/:mapId/image', async (req, res) => {
  const map = await prisma.map.findUnique({ where: { id: req.params.mapId } });
  if (!map) return res.status(404).json({ error: 'Map not found' });

  const campaign = await prisma.campaign.findUnique({ where: { id: map.campaignId } });
  if (campaign?.ownerId !== req.user!.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (map.imageUrl) {
    const filePath = path.join(UPLOADS_DIR, path.basename(map.imageUrl));
    fs.unlink(filePath, () => {}); // best-effort delete
  }

  const updated = await prisma.map.update({
    where: { id: req.params.mapId },
    data: { imageUrl: null },
  });

  return res.json({ map: updated });
});
