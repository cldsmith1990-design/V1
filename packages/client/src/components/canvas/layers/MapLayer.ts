import * as PIXI from 'pixi.js';

export class MapLayer {
  container: PIXI.Container;
  graphics: PIXI.Graphics;

  constructor() {
    this.container = new PIXI.Container();
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);
  }
}
