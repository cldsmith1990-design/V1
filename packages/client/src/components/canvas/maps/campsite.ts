import * as PIXI from 'pixi.js';
import type { MapLayer } from '../layers/MapLayer';

/**
 * Draws the Forest Campsite starter map procedurally using Pixi.js Graphics.
 *
 * Layout (30×20 grid):
 *   - Grassy clearing center
 *   - Dense tree border (2–3 cells thick)
 *   - Dirt path cutting through south
 *   - Three canvas tents (NW, NE, S)
 *   - Central campfire at roughly (15, 10)
 *   - Two fallen logs east/west of fire
 *   - Scattered rocks and bushes
 */
export function drawCampsiteMap(
  mapLayer: MapLayer,
  gridWidth: number,
  gridHeight: number,
  cellSize: number
): void {
  const g = mapLayer.graphics;
  g.clear();

  const W = gridWidth * cellSize;
  const H = gridHeight * cellSize;
  const C = cellSize;

  // ── 1. Background grass ──────────────────────────────────────────────────
  g.beginFill(0x3d6b35);
  g.drawRect(0, 0, W, H);
  g.endFill();

  // Grass texture variation — lighter patches
  const rng = mulberry32(42); // deterministic random
  for (let i = 0; i < 220; i++) {
    const px = rng() * W;
    const py = rng() * H;
    const r = 8 + rng() * 28;
    g.beginFill(0x4a7a41, 0.35);
    g.drawEllipse(px, py, r, r * 0.7);
    g.endFill();
  }

  // Darker grass patches
  for (let i = 0; i < 120; i++) {
    const px = rng() * W;
    const py = rng() * H;
    g.beginFill(0x2e5428, 0.3);
    g.drawEllipse(px, py, 12 + rng() * 20, 8 + rng() * 16);
    g.endFill();
  }

  // ── 2. Dirt clearing (center oval) ───────────────────────────────────────
  const cx = W / 2;
  const cy = H / 2;
  const clearW = 9 * C;
  const clearH = 7 * C;

  // Outer dirt gradient (dark)
  g.beginFill(0x5a4020, 0.7);
  g.drawEllipse(cx, cy, clearW + C, clearH + C);
  g.endFill();

  // Main clearing
  g.beginFill(0x7a5830, 0.8);
  g.drawEllipse(cx, cy, clearW, clearH);
  g.endFill();

  // Lighter center
  g.beginFill(0x8d6535, 0.5);
  g.drawEllipse(cx, cy, clearW * 0.6, clearH * 0.6);
  g.endFill();

  // Dirt texture
  for (let i = 0; i < 60; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * clearW * 0.9;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist * (clearH / clearW);
    g.beginFill(0x6b4a22, 0.3 + rng() * 0.2);
    g.drawEllipse(px, py, 4 + rng() * 10, 3 + rng() * 7);
    g.endFill();
  }

  // ── 3. Dirt path from south ──────────────────────────────────────────────
  const pathCx = cx;
  g.beginFill(0x7a5830, 0.8);
  g.drawRect(pathCx - C * 1.5, H - C * 3, C * 3, C * 3);
  g.endFill();
  // Path widening toward clearing
  g.beginFill(0x7a5830, 0.7);
  const pathPoints: number[] = [
    pathCx - C * 1.5, H - C * 3,
    pathCx + C * 1.5, H - C * 3,
    pathCx + C * 2, H,
    pathCx - C * 2, H,
  ];
  g.drawPolygon(pathPoints);
  g.endFill();

  // ── 4. Tree border ────────────────────────────────────────────────────────
  // Draw dense tree clusters around the perimeter, leaving path gap
  const borderDepth = 3;
  for (let col = 0; col < gridWidth; col++) {
    for (let row = 0; row < gridHeight; row++) {
      const inBorder =
        col < borderDepth ||
        col >= gridWidth - borderDepth ||
        row < borderDepth ||
        row >= gridHeight - borderDepth;

      // Leave south path open
      const inPath = row >= gridHeight - borderDepth &&
        col >= gridWidth / 2 - 2 &&
        col <= gridWidth / 2 + 2;

      if (inBorder && !inPath) {
        drawTree(g, col * C, row * C, C, rng);
      }
    }
  }

  // Extra scattered trees just inside border
  for (let i = 0; i < 18; i++) {
    const col = Math.floor(rng() * gridWidth);
    const row = Math.floor(rng() * gridHeight);
    const inCenter =
      col > 8 && col < gridWidth - 8 &&
      row > 5 && row < gridHeight - 5;
    if (!inCenter) {
      drawTree(g, col * C, row * C, C, rng);
    }
  }

  // ── 5. Campfire ───────────────────────────────────────────────────────────
  const fireCx = cx;
  const fireCy = cy;
  drawCampfire(g, fireCx, fireCy, C);

  // ── 6. Tents ──────────────────────────────────────────────────────────────
  // Northwest tent (~col 9, row 6)
  drawTent(g, 9 * C, 6 * C, C, 0xa89060);
  // Northeast tent (~col 19, row 6)
  drawTent(g, 19 * C, 6 * C, C, 0x806848);
  // South tent (~col 14, row 14)
  drawTent(g, 14 * C, 14 * C, C, 0x7a6050);

  // ── 7. Fallen logs ────────────────────────────────────────────────────────
  // West log
  drawLog(g, cx - 4 * C, cy + C * 0.5, C * 2.5, C * 0.5, -0.2);
  // East log
  drawLog(g, cx + 2 * C, cy - C * 0.5, C * 2, C * 0.45, 0.25);

  // ── 8. Rocks ──────────────────────────────────────────────────────────────
  const rockPositions = [
    [cx - 2 * C, cy - 2 * C],
    [cx + 3 * C, cy + 2 * C],
    [cx - C, cy + 3 * C],
    [cx + 4 * C, cy - C],
  ];
  for (const [rx, ry] of rockPositions) {
    drawRock(g, rx, ry, C * 0.35, rng);
  }

  // ── 9. Bushes/ferns in clearing ───────────────────────────────────────────
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + rng() * 0.5;
    const dist = clearW * (0.6 + rng() * 0.35);
    const bx = cx + Math.cos(angle) * dist;
    const by = cy + Math.sin(angle) * dist * (clearH / clearW);
    drawBush(g, bx, by, C * 0.3, rng);
  }

  // ── 10. Map border vignette ───────────────────────────────────────────────
  g.beginFill(0x0d1a0a, 0.4);
  // Draw a thick dark border to soften edges
  g.drawRect(0, 0, W, C * 0.5);
  g.drawRect(0, H - C * 0.5, W, C * 0.5);
  g.drawRect(0, 0, C * 0.5, H);
  g.drawRect(W - C * 0.5, 0, C * 0.5, H);
  g.endFill();
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function drawTree(
  g: PIXI.Graphics,
  x: number,
  y: number,
  cellSize: number,
  rng: () => number
): void {
  const cx = x + cellSize / 2 + (rng() - 0.5) * cellSize * 0.3;
  const cy = y + cellSize / 2 + (rng() - 0.5) * cellSize * 0.3;
  const r = cellSize * (0.35 + rng() * 0.2);

  // Shadow
  g.beginFill(0x1a2e16, 0.5);
  g.drawEllipse(cx + 3, cy + 5, r * 0.9, r * 0.5);
  g.endFill();

  // Dark outer canopy
  g.beginFill(0x1e4a1a, 0.9);
  g.drawCircle(cx, cy, r + 3);
  g.endFill();

  // Mid canopy
  g.beginFill(0x2d6624, 0.9);
  g.drawCircle(cx - 2, cy - 2, r);
  g.endFill();

  // Light canopy highlight
  g.beginFill(0x4a8c3c, 0.7);
  g.drawCircle(cx - r * 0.3, cy - r * 0.3, r * 0.55);
  g.endFill();

  // Trunk (sometimes visible)
  if (rng() > 0.6) {
    g.beginFill(0x5a3a1a);
    g.drawRect(cx - 2, cy + r - 3, 4, 6);
    g.endFill();
  }
}

function drawCampfire(g: PIXI.Graphics, cx: number, cy: number, C: number): void {
  // Fire glow (large, soft)
  g.beginFill(0xff6600, 0.15);
  g.drawCircle(cx, cy, C * 1.2);
  g.endFill();

  g.beginFill(0xff8800, 0.2);
  g.drawCircle(cx, cy, C * 0.7);
  g.endFill();

  // Stone ring
  const stoneCount = 7;
  for (let i = 0; i < stoneCount; i++) {
    const angle = (i / stoneCount) * Math.PI * 2;
    const sx = cx + Math.cos(angle) * C * 0.38;
    const sy = cy + Math.sin(angle) * C * 0.38;
    g.beginFill(0x7a7a7a);
    g.drawEllipse(sx, sy, C * 0.1, C * 0.08);
    g.endFill();
    g.beginFill(0x5a5a5a);
    g.drawEllipse(sx + 1, sy + 1, C * 0.07, C * 0.06);
    g.endFill();
  }

  // Logs in fire
  g.beginFill(0x5a2f0a);
  g.beginFill(0x7a4010);
  // Log 1 (diagonal)
  drawRotatedRect(g, cx - C * 0.1, cy + C * 0.05, C * 0.6, C * 0.12, -0.4);
  // Log 2 (other diagonal)
  drawRotatedRect(g, cx + C * 0.05, cy + C * 0.05, C * 0.55, C * 0.11, 0.5);
  g.endFill();

  // Flame layers (inner → outer glow)
  // Outer orange
  g.beginFill(0xff6600, 0.85);
  drawFlame(g, cx, cy, C * 0.28, C * 0.52);
  g.endFill();
  // Mid yellow
  g.beginFill(0xffcc00, 0.8);
  drawFlame(g, cx, cy, C * 0.18, C * 0.38);
  g.endFill();
  // Inner white/yellow
  g.beginFill(0xffffa0, 0.9);
  drawFlame(g, cx, cy, C * 0.1, C * 0.22);
  g.endFill();

  // Ember sparks
  for (let i = 0; i < 5; i++) {
    const ex = cx + (Math.random() - 0.5) * C * 0.5;
    const ey = cy - Math.random() * C * 0.6;
    g.beginFill(0xff8800, 0.7);
    g.drawCircle(ex, ey, 2);
    g.endFill();
  }
}

function drawFlame(
  g: PIXI.Graphics,
  cx: number,
  cy: number,
  radiusX: number,
  height: number
): void {
  // Simple teardrop shape for a flame
  const pts: number[] = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = Math.PI + t * Math.PI; // bottom half circle
    const x = cx + Math.cos(angle) * radiusX * (1 - t * 0.5);
    const y = cy + Math.sin(angle) * radiusX;
    pts.push(x, y);
  }
  // Top tip
  pts.push(cx, cy - height);
  // Bottom center
  pts.push(cx - radiusX, cy);
  g.drawPolygon(pts);
}

function drawTent(
  g: PIXI.Graphics,
  x: number,
  y: number,
  C: number,
  color: number
): void {
  const w = C * 2.2;
  const h = C * 1.6;
  const cx = x + C;
  const cy = y;

  // Shadow
  g.beginFill(0x000000, 0.3);
  g.drawEllipse(cx + w * 0.05, cy + h + 4, w * 0.5, h * 0.15);
  g.endFill();

  // Tent body (triangle)
  g.beginFill(color);
  g.drawPolygon([cx, cy, cx + w / 2, cy + h, cx - w / 2, cy + h]);
  g.endFill();

  // Tent side shading
  g.beginFill(0x000000, 0.25);
  g.drawPolygon([cx + w * 0.05, cy + h * 0.1, cx + w / 2, cy + h, cx, cy + h]);
  g.endFill();

  // Tent opening
  g.beginFill(0x1a1916, 0.8);
  g.drawPolygon([
    cx - C * 0.3, cy + h,
    cx + C * 0.3, cy + h,
    cx, cy + h * 0.4,
  ]);
  g.endFill();

  // Tent ridge line
  g.lineStyle(2, 0xffffff, 0.3);
  g.moveTo(cx, cy);
  g.lineTo(cx, cy + h * 0.5);

  // Stakes + guy-ropes
  g.lineStyle(1, 0x8a7050, 0.6);
  g.moveTo(cx - w / 2, cy + h);
  g.lineTo(cx - w / 2 - C * 0.4, cy + h + C * 0.3);
  g.moveTo(cx + w / 2, cy + h);
  g.lineTo(cx + w / 2 + C * 0.4, cy + h + C * 0.3);
  g.lineStyle(0);
}

function drawLog(
  g: PIXI.Graphics,
  x: number,
  y: number,
  length: number,
  thickness: number,
  angle: number
): void {
  g.beginFill(0x6b3a10);
  drawRotatedRect(g, x, y, length, thickness, angle);
  g.endFill();

  // End grain
  g.beginFill(0x8b5a28);
  const ex = x + Math.cos(angle) * length;
  const ey = y + Math.sin(angle) * length;
  g.drawEllipse(ex, ey, thickness * 0.7, thickness * 0.5);
  g.endFill();

  // Bark texture lines
  g.lineStyle(1, 0x4a2408, 0.5);
  const perpX = Math.sin(angle) * thickness * 0.3;
  const perpY = -Math.cos(angle) * thickness * 0.3;
  g.moveTo(x + perpX, y + perpY);
  g.lineTo(ex + perpX, ey + perpY);
  g.lineStyle(0);
}

function drawRock(
  g: PIXI.Graphics,
  x: number,
  y: number,
  r: number,
  rng: () => number
): void {
  g.beginFill(0x555555, 0.9);
  g.drawPolygon(irregularCircle(x, y, r, 6, rng, 0.3));
  g.endFill();
  g.beginFill(0x888888, 0.6);
  g.drawEllipse(x - r * 0.2, y - r * 0.3, r * 0.5, r * 0.35);
  g.endFill();
}

function drawBush(g: PIXI.Graphics, x: number, y: number, r: number, rng: () => number): void {
  g.beginFill(0x2a5520, 0.85);
  g.drawCircle(x, y, r);
  g.endFill();
  g.beginFill(0x3d7a30, 0.7);
  g.drawCircle(x - r * 0.3, y - r * 0.2, r * 0.6);
  g.endFill();
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function drawRotatedRect(
  g: PIXI.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
  angle: number
): void {
  const hw = width / 2;
  const hh = height / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const corners = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([lx, ly]) => [cx + lx * cos - ly * sin, cy + lx * sin + ly * cos]);

  g.drawPolygon(corners.flat());
}

function irregularCircle(
  cx: number,
  cy: number,
  r: number,
  points: number,
  rng: () => number,
  irregularity: number
): number[] {
  const pts: number[] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const dist = r * (1 - irregularity + rng() * irregularity * 2);
    pts.push(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
  }
  return pts;
}

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
