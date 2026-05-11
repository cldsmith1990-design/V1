import * as PIXI from 'pixi.js';
import type { GameState, MapData, Vec2 } from '@dnd/shared';
import { GRID_CELL_SIZE } from '@dnd/shared';
import { MapLayer } from './layers/MapLayer';
import { GridLayer } from './layers/GridLayer';
import { FogLayer } from './layers/FogLayer';
import { TokenLayer } from './layers/TokenLayer';
import { PingLayer } from './layers/PingLayer';
import { useGameStore } from '../../store/useGameStore';
import { emitTokenMove, emitPing } from '../../socket/client';
import { drawCampsiteMap } from './maps/campsite';

interface PixiAppOptions {
  isDM: boolean;
  myUserId: string;
}

export class PixiApp {
  private app: PIXI.Application;
  private viewport: PIXI.Container;

  // Layers
  private mapLayer: MapLayer;
  private gridLayer: GridLayer;
  private fogLayer: FogLayer;
  private tokenLayer: TokenLayer;
  private pingLayer: PingLayer;

  // Pan/zoom state
  private isPanning = false;
  private panStart = { x: 0, y: 0 };
  private viewportOffset = { x: 0, y: 0 };
  private scale = 1;

  private gridWidth = 30;
  private gridHeight = 20;
  private cellSize = GRID_CELL_SIZE;

  private isDM: boolean;
  private myUserId: string;

  // Fog brush state (DM only)
  private isBrushing = false;
  private brushMode: 'reveal' | 'hide' | null = null;

  constructor(container: HTMLElement, options: PixiAppOptions) {
    this.isDM = options.isDM;
    this.myUserId = options.myUserId;

    this.app = new PIXI.Application({
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: 0x0f0e0d,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    container.appendChild(this.app.view as HTMLCanvasElement);

    // Viewport is the pannable/zoomable root
    this.viewport = new PIXI.Container();
    this.app.stage.addChild(this.viewport);

    // Build layer stack
    this.mapLayer = new MapLayer();
    this.gridLayer = new GridLayer();
    this.fogLayer = new FogLayer(this.isDM);
    this.tokenLayer = new TokenLayer(this.isDM, this.myUserId);
    this.pingLayer = new PingLayer();

    this.viewport.addChild(this.mapLayer.container);
    this.viewport.addChild(this.gridLayer.container);
    this.viewport.addChild(this.fogLayer.container);
    this.viewport.addChild(this.tokenLayer.container);
    this.viewport.addChild(this.pingLayer.container);

    // Draw the starter campsite map
    drawCampsiteMap(this.mapLayer, this.gridWidth, this.gridHeight, this.cellSize);
    this.gridLayer.draw(this.gridWidth, this.gridHeight, this.cellSize);

    // Center viewport
    this.centerViewport();

    // Setup interactions
    this.setupInteractions(container);

    // Resize handling
    const resizeObserver = new ResizeObserver(() => this.onResize(container));
    resizeObserver.observe(container);
  }

  private centerViewport(): void {
    const mapWidth = this.gridWidth * this.cellSize;
    const mapHeight = this.gridHeight * this.cellSize;
    this.viewport.x = (this.app.screen.width - mapWidth) / 2;
    this.viewport.y = (this.app.screen.height - mapHeight) / 2;
    this.viewportOffset = { x: this.viewport.x, y: this.viewport.y };
  }

  private onResize(container: HTMLElement): void {
    this.app.renderer.resize(container.clientWidth, container.clientHeight);
  }

  private setupInteractions(container: HTMLElement): void {
    const canvas = this.app.view as HTMLCanvasElement;

    // Middle-mouse / right-click pan
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || e.button === 2) {
        this.isPanning = true;
        this.panStart = { x: e.clientX - this.viewport.x, y: e.clientY - this.viewport.y };
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.viewport.x = e.clientX - this.panStart.x;
        this.viewport.y = e.clientY - this.panStart.y;
        this.viewportOffset = { x: this.viewport.x, y: this.viewport.y };
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 1 || e.button === 2) {
        this.isPanning = false;
        canvas.style.cursor = 'default';
      }
    });

    // Scroll to zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(this.scale * zoomFactor, 0.3), 4);

      // Zoom toward mouse position
      const mouseX = e.clientX - this.viewport.x;
      const mouseY = e.clientY - this.viewport.y;
      const ratio = newScale / this.scale;

      this.viewport.x -= mouseX * (ratio - 1);
      this.viewport.y -= mouseY * (ratio - 1);
      this.viewport.scale.set(newScale);
      this.scale = newScale;
    }, { passive: false });

    // Right-click ping
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const gridPos = this.screenToGrid(e.clientX, e.clientY);
      if (gridPos) {
        emitPing(gridPos);
      }
    });

    // Token drag is handled inside TokenLayer
    this.tokenLayer.onTokenMoved = (tokenId, position) => {
      useGameStore.getState().moveToken(tokenId, position);
      emitTokenMove(tokenId, position);
    };

    this.tokenLayer.onTokenSelected = (tokenId) => {
      useGameStore.getState().selectToken(tokenId);
    };
  }

  private screenToGrid(screenX: number, screenY: number): Vec2 | null {
    const localX = (screenX - this.viewport.x) / this.scale;
    const localY = (screenY - this.viewport.y) / this.scale;
    const col = Math.floor(localX / this.cellSize);
    const row = Math.floor(localY / this.cellSize);
    if (col < 0 || row < 0 || col >= this.gridWidth || row >= this.gridHeight) return null;
    return { x: col, y: row };
  }

  syncGameState(state: GameState): void {
    this.tokenLayer.syncTokens(Object.values(state.tokens), this.cellSize);
    this.fogLayer.syncFog(state.fog, this.gridWidth, this.gridHeight, this.cellSize);
  }

  /**
   * Called whenever the active map changes (new upload or DM switches map).
   * Redraws the map layer and resizes the grid to match the new map's dimensions.
   */
  async loadMap(map: MapData): Promise<void> {
    this.gridWidth = map.gridWidth;
    this.gridHeight = map.gridHeight;
    this.cellSize = map.cellSize;

    const widthPx = map.gridWidth * map.cellSize;
    const heightPx = map.gridHeight * map.cellSize;

    if (map.imageUrl) {
      // Build the absolute URL — in dev the Vite proxy forwards /uploads to the server
      const imageUrl = map.imageUrl.startsWith('http')
        ? map.imageUrl
        : map.imageUrl; // relative URLs work fine via the proxy
      await this.mapLayer.loadImage(imageUrl, widthPx, heightPx);
    } else {
      this.mapLayer.clearImage();
      drawCampsiteMap(this.mapLayer, map.gridWidth, map.gridHeight, map.cellSize);
    }

    this.gridLayer.draw(map.gridWidth, map.gridHeight, map.cellSize);
    this.fogLayer.syncFog({ revealed: {} }, map.gridWidth, map.gridHeight, map.cellSize);
    this.tokenLayer.syncTokens([], map.cellSize);
    this.centerViewport();
  }

  setSelectedToken(tokenId: string | null): void {
    this.tokenLayer.setSelected(tokenId);
  }

  setPingMarkers(markers: Array<{ id: string; position: Vec2; userName: string; label?: string }>): void {
    this.pingLayer.setMarkers(markers, this.cellSize);
  }

  destroy(): void {
    this.app.destroy(true);
  }
}
