import { useEffect, useRef } from 'react';
import { useGameStore, selectIsDM } from '../../store/useGameStore';
import { PixiApp } from './PixiApp';

// Module-level ref so the PixiApp instance survives React re-renders
let pixiApp: PixiApp | null = null;

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameState = useGameStore((s) => s.gameState);
  const currentMap = useGameStore((s) => s.currentMap);
  const myUserId = useGameStore((s) => s.myUserId);
  const isDM = useGameStore(selectIsDM);
  const selectedTokenId = useGameStore((s) => s.selectedTokenId);
  const pingMarkers = useGameStore((s) => s.pingMarkers);

  // Initialize Pixi.js once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    pixiApp = new PixiApp(containerRef.current, {
      isDM,
      myUserId: myUserId ?? '',
    });

    return () => {
      pixiApp?.destroy();
      pixiApp = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the active map changes (DM uploads or switches), reload the canvas map
  useEffect(() => {
    if (!pixiApp) return;
    if (currentMap) {
      pixiApp.loadMap(currentMap);
    }
    // currentMap === null means "use the default campsite" — already drawn on init
  }, [currentMap]);

  // Sync live game state (tokens, fog) to the canvas
  useEffect(() => {
    if (!pixiApp || !gameState) return;
    pixiApp.syncGameState(gameState);
  }, [gameState]);

  // Sync token selection highlight
  useEffect(() => {
    pixiApp?.setSelectedToken(selectedTokenId);
  }, [selectedTokenId]);

  // Sync ping markers
  useEffect(() => {
    pixiApp?.setPingMarkers(pingMarkers);
  }, [pingMarkers]);

  return (
    <div
      ref={containerRef}
      id="game-canvas-container"
      style={{ width: '100%', height: '100%', cursor: 'default' }}
    />
  );
}
