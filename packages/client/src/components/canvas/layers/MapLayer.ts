import * as PIXI from 'pixi.js';

export class MapLayer {
  container: PIXI.Container;
  graphics: PIXI.Graphics;
  private mapSprite: PIXI.Sprite | null = null;
  private loadedUrl: string | null = null;

  constructor() {
    this.container = new PIXI.Container();
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);
  }

  /**
   * Load a map image URL and stretch it to fill the grid dimensions.
   * Resolves when the texture is ready. If the same URL is already loaded, no-ops.
   */
  async loadImage(url: string, widthPx: number, heightPx: number): Promise<void> {
    if (this.loadedUrl === url && this.mapSprite) return;

    this.clearImage();

    try {
      // PIXI.Assets.load handles caching automatically
      const texture = await PIXI.Assets.load(url);
      const sprite = new PIXI.Sprite(texture as PIXI.Texture);
      sprite.width = widthPx;
      sprite.height = heightPx;
      sprite.x = 0;
      sprite.y = 0;

      // Insert behind the procedural graphics layer
      this.container.addChildAt(sprite, 0);
      this.mapSprite = sprite;
      this.loadedUrl = url;

      // Hide procedural drawing when an image is loaded
      this.graphics.visible = false;
    } catch (err) {
      console.error('[MapLayer] Failed to load image:', url, err);
      // Fallback: keep procedural map visible
      this.graphics.visible = true;
    }
  }

  clearImage(): void {
    if (this.mapSprite) {
      this.container.removeChild(this.mapSprite);
      this.mapSprite.destroy({ texture: false }); // don't destroy cached texture
      this.mapSprite = null;
      this.loadedUrl = null;
    }
    this.graphics.visible = true;
  }

  get hasImage(): boolean {
    return this.mapSprite !== null;
  }
}
