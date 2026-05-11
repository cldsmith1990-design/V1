import { getSocket } from '../../socket/client';

export default function FogControls() {
  function revealAll() {
    getSocket().emit('fog:revealAll');
  }

  function hideAll() {
    getSocket().emit('fog:hideAll');
  }

  return (
    <div className="p-3 space-y-3 text-xs">
      <p className="text-dungeon-400">
        Use the fog controls to reveal or hide areas of the map for players.
        Right-click+drag on the canvas to brush-reveal (coming in v2).
      </p>

      <div className="panel p-3 space-y-2">
        <div className="label mb-2">Global Fog Controls</div>

        <button
          onClick={revealAll}
          className="btn-primary w-full"
        >
          ☀️ Reveal Entire Map
        </button>

        <button
          onClick={hideAll}
          className="btn-danger w-full"
        >
          🌑 Hide Entire Map
        </button>
      </div>

      <div className="panel p-3">
        <div className="label mb-2">Brush Tool</div>
        <p className="text-dungeon-500">
          Brush fog reveal/hide tool launches in v2.
          For now, use the global controls above.
        </p>
      </div>
    </div>
  );
}
