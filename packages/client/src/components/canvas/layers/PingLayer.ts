import * as PIXI from 'pixi.js';
import type { Vec2 } from '@dnd/shared';

interface PingMarker {
  id: string;
  position: Vec2;
  userName: string;
  label?: string;
}

export class PingLayer {
  container: PIXI.Container;
  private markers = new Map<string, PIXI.Container>();

  constructor() {
    this.container = new PIXI.Container();
  }

  setMarkers(markers: PingMarker[], cellSize: number): void {
    // Remove old markers not in the new list
    const ids = new Set(markers.map((m) => m.id));
    for (const [id, mc] of this.markers) {
      if (!ids.has(id)) {
        this.container.removeChild(mc);
        this.markers.delete(id);
      }
    }

    for (const marker of markers) {
      if (!this.markers.has(marker.id)) {
        const mc = this.createMarker(marker, cellSize);
        this.container.addChild(mc);
        this.markers.set(marker.id, mc);
      }
    }
  }

  private createMarker(marker: PingMarker, cellSize: number): PIXI.Container {
    const mc = new PIXI.Container();
    mc.x = (marker.position.x + 0.5) * cellSize;
    mc.y = (marker.position.y + 0.5) * cellSize;

    // Expanding ring
    const ring = new PIXI.Graphics();
    ring.lineStyle(3, 0xfbbf24, 1);
    ring.drawCircle(0, 0, cellSize * 0.6);
    mc.addChild(ring);

    const label = new PIXI.Text(marker.label ?? marker.userName, {
      fontSize: 11,
      fill: 0xfbbf24,
      align: 'center',
    });
    label.anchor.set(0.5, 1.2);
    mc.addChild(label);

    // Animate ring outward
    let frame = 0;
    const ticker = PIXI.Ticker.shared;
    const animate = () => {
      frame++;
      const scale = 1 + frame * 0.04;
      ring.scale.set(scale);
      ring.alpha = Math.max(0, 1 - frame / 25);
      if (frame >= 30) {
        ticker.remove(animate);
      }
    };
    ticker.add(animate);

    return mc;
  }
}
