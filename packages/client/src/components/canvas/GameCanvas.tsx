import { useEffect, useRef } from 'react';
import { useGameStore, selectIsDM } from '../../store/useGameStore';
import { PixiApp } from './PixiApp';

let pixiApp: PixiApp | null = null;

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameState = useGameStore((s) => s.gameState);
  const myUserId = useGameStore((s) => s.myUserId);
  const isDM = useGameStore(selectIsDM);
  const selectedTokenId = useGameStore((s) => s.selectedTokenId);
  const pingMarkers = useGameStore((s) => s.pingMarkers);

  // Initialize Pixi.js once
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
  }, []);

  // Sync game state to canvas
  useEffect(() => {
    if (!pixiApp || !gameState) return;
    pixiApp.syncGameState(gameState);
  }, [gameState]);

  // Sync selection
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
