import * as PIXI from 'pixi.js';
import type { FogState } from '@dnd/shared';

export class FogLayer {
  container: PIXI.Container;
  private graphics: PIXI.Graphics;
  private isDM: boolean;

  constructor(isDM: boolean) {
    this.isDM = isDM;
    this.container = new PIXI.Container();
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);
    // DM sees fog at 40% opacity; players see 100% black
    this.container.alpha = isDM ? 0.5 : 1;
  }

  syncFog(fog: FogState, gridWidth: number, gridHeight: number, cellSize: number): void {
    const g = this.graphics;
    g.clear();

    const revealedKeys = fog.revealed;
    const allHidden = '__all_hidden__' in revealedKeys;
    const allRevealed = Object.keys(revealedKeys).length === 0;

    if (allRevealed) {
      // No fog drawn — everything visible
      return;
    }

    g.beginFill(0x000000);

    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        const key = `${col},${row}`;
        const isRevealed = !allHidden && revealedKeys[key] === true;
        if (!isRevealed) {
          g.drawRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }

    g.endFill();
  }
}
