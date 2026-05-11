import * as PIXI from 'pixi.js';

export class GridLayer {
  container: PIXI.Container;
  private graphics: PIXI.Graphics;

  constructor() {
    this.container = new PIXI.Container();
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);
  }

  draw(gridWidth: number, gridHeight: number, cellSize: number): void {
    const g = this.graphics;
    g.clear();
    g.lineStyle(1, 0x404040, 0.5);

    const totalW = gridWidth * cellSize;
    const totalH = gridHeight * cellSize;

    // Vertical lines
    for (let col = 0; col <= gridWidth; col++) {
      g.moveTo(col * cellSize, 0);
      g.lineTo(col * cellSize, totalH);
    }

    // Horizontal lines
    for (let row = 0; row <= gridHeight; row++) {
      g.moveTo(0, row * cellSize);
      g.lineTo(totalW, row * cellSize);
    }
  }

  setVisible(visible: boolean): void {
    this.container.visible = visible;
  }
}
