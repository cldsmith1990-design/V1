import * as PIXI from 'pixi.js';
import type { Token, Vec2 } from '@dnd/shared';
import { CONDITION_ICONS } from '@dnd/shared';

interface TokenSprite {
  container: PIXI.Container;
  base: PIXI.Graphics;
  label: PIXI.Text;
  hpBar: PIXI.Graphics;
  conditionText: PIXI.Text;
  token: Token;
}

export class TokenLayer {
  container: PIXI.Container;
  private sprites = new Map<string, TokenSprite>();
  private selectedId: string | null = null;
  private isDM: boolean;
  private myUserId: string;

  onTokenMoved: ((tokenId: string, position: Vec2) => void) | null = null;
  onTokenSelected: ((tokenId: string | null) => void) | null = null;

  constructor(isDM: boolean, myUserId: string) {
    this.isDM = isDM;
    this.myUserId = myUserId;
    this.container = new PIXI.Container();
  }

  syncTokens(tokens: Token[], cellSize: number): void {
    const seen = new Set<string>();

    for (const token of tokens) {
      // Hide gmOnly tokens from non-DM players
      if (token.gmOnly && !this.isDM) continue;
      // Hide invisible tokens from non-owners/non-DM
      if (!token.visible && !this.isDM && token.ownerId !== this.myUserId) continue;

      seen.add(token.id);

      if (!this.sprites.has(token.id)) {
        this.createSprite(token, cellSize);
      } else {
        this.updateSprite(token, cellSize);
      }
    }

    // Remove deleted tokens
    for (const [id, sprite] of this.sprites) {
      if (!seen.has(id)) {
        this.container.removeChild(sprite.container);
        this.sprites.delete(id);
      }
    }
  }

  private createSprite(token: Token, cellSize: number): void {
    const tc = new PIXI.Container();
    tc.interactive = true;
    tc.cursor = 'pointer';

    const size = token.size * cellSize;

    // Base circle
    const base = new PIXI.Graphics();
    this.drawBase(base, token, size);

    // Label
    const label = new PIXI.Text(token.name, {
      fontSize: 10,
      fill: 0xffffff,
      fontFamily: 'JetBrains Mono, monospace',
      align: 'center',
      dropShadow: true,
      dropShadowDistance: 1,
      dropShadowColor: 0x000000,
    });
    label.anchor.set(0.5, 1);
    label.y = -4;

    // HP bar
    const hpBar = new PIXI.Graphics();
    this.drawHpBar(hpBar, token, size);

    // Conditions
    const conditions = token.conditions.slice(0, 3).map((c) => CONDITION_ICONS[c] ?? c).join('');
    const conditionText = new PIXI.Text(conditions, { fontSize: 10 });
    conditionText.anchor.set(0.5, 0);
    conditionText.y = size + 2;

    tc.addChild(base, hpBar, label, conditionText);
    this.container.addChild(tc);
    this.sprites.set(token.id, { container: tc, base, label, hpBar, conditionText, token });

    this.positionSprite(tc, token, cellSize);
    this.setupDrag(token.id, tc, cellSize, token);
  }

  private drawBase(g: PIXI.Graphics, token: Token, size: number): void {
    const color = parseInt(token.color.replace('#', ''), 16);
    const isDead = token.conditions.includes('dead');
    const isUnconscious = token.conditions.includes('unconscious');

    g.clear();

    // Selection highlight (drawn behind)
    if (this.selectedId === token.id) {
      g.lineStyle(3, 0xfacc15, 1);
    } else {
      g.lineStyle(2, 0x000000, 0.6);
    }

    // Fill
    g.beginFill(color, isDead ? 0.3 : isUnconscious ? 0.6 : 0.9);
    g.drawCircle(size / 2, size / 2, size / 2 - 2);
    g.endFill();

    // Type indicator ring
    const ringColor = token.type === 'player' ? 0x60a5fa
      : token.type === 'npc' ? 0x34d399
      : token.type === 'monster' ? 0xf87171
      : 0x94a3b8;
    g.lineStyle(2, ringColor, 1);
    g.drawCircle(size / 2, size / 2, size / 2 - 1);

    // Dead X
    if (isDead) {
      g.lineStyle(2, 0xef4444, 1);
      const p = 6;
      g.moveTo(p, p);
      g.lineTo(size - p, size - p);
      g.moveTo(size - p, p);
      g.lineTo(p, size - p);
    }
  }

  private drawHpBar(g: PIXI.Graphics, token: Token, size: number): void {
    g.clear();
    if (token.maxHp <= 0) return;

    const barW = size - 4;
    const barH = 4;
    const x = 2;
    const y = size - 8;
    const pct = Math.max(0, Math.min(1, token.hp / token.maxHp));

    // Background
    g.beginFill(0x1a1916);
    g.drawRect(x, y, barW, barH);
    g.endFill();

    // Fill
    const fillColor = pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xfbbf24 : 0xef4444;
    g.beginFill(fillColor);
    g.drawRect(x, y, Math.floor(barW * pct), barH);
    g.endFill();
  }

  private updateSprite(token: Token, cellSize: number): void {
    const sprite = this.sprites.get(token.id);
    if (!sprite) return;

    sprite.token = token;
    const size = token.size * cellSize;

    this.drawBase(sprite.base, token, size);
    this.drawHpBar(sprite.hpBar, token, size);

    sprite.label.text = token.name;

    const conditions = token.conditions.slice(0, 3).map((c) => CONDITION_ICONS[c] ?? c).join('');
    sprite.conditionText.text = conditions;

    this.positionSprite(sprite.container, token, cellSize);
  }

  private positionSprite(tc: PIXI.Container, token: Token, cellSize: number): void {
    tc.x = token.position.x * cellSize;
    tc.y = token.position.y * cellSize;
    // Labels appear above token
    const labelObj = tc.children.find((c): c is PIXI.Text => c instanceof PIXI.Text && (c as PIXI.Text).y < 0);
    if (labelObj) {
      labelObj.x = (token.size * cellSize) / 2;
    }
  }

  private setupDrag(tokenId: string, tc: PIXI.Container, cellSize: number, token: Token): void {
    const canMove = this.isDM || token.ownerId === this.myUserId;
    if (!canMove) return;

    let dragData: PIXI.FederatedPointerEvent | null = null;
    let startPos = { x: 0, y: 0 };
    let isDragging = false;

    tc.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      dragData = e;
      startPos = { x: tc.x, y: tc.y };
      isDragging = false;
      tc.cursor = 'grabbing';
      this.onTokenSelected?.(tokenId);
      e.stopPropagation();
    });

    tc.on('pointermove', (e: PIXI.FederatedPointerEvent) => {
      if (!dragData) return;
      isDragging = true;
      const parent = tc.parent;
      if (!parent) return;
      const local = parent.toLocal(e.global);
      tc.x = local.x;
      tc.y = local.y;
    });

    tc.on('pointerup', () => {
      if (!dragData || !isDragging) {
        dragData = null;
        tc.cursor = 'pointer';
        return;
      }
      dragData = null;
      tc.cursor = 'pointer';

      // Snap to grid
      const col = Math.round(tc.x / cellSize);
      const row = Math.round(tc.y / cellSize);
      const snapped: Vec2 = { x: col, y: row };
      tc.x = col * cellSize;
      tc.y = row * cellSize;

      this.onTokenMoved?.(tokenId, snapped);
    });

    tc.on('pointerupoutside', () => {
      if (dragData) {
        // Snap back
        tc.x = startPos.x;
        tc.y = startPos.y;
        dragData = null;
        tc.cursor = 'pointer';
      }
    });
  }

  setSelected(tokenId: string | null): void {
    const prev = this.selectedId;
    this.selectedId = tokenId;

    // Redraw base for both tokens
    if (prev) {
      const s = this.sprites.get(prev);
      if (s) this.drawBase(s.base, s.token, s.token.size * 40);
    }
    if (tokenId) {
      const s = this.sprites.get(tokenId);
      if (s) this.drawBase(s.base, s.token, s.token.size * 40);
    }
  }
}
