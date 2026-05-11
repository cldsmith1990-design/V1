import { useGameStore, selectIsDM } from '../../store/useGameStore';
import { getSocket } from '../../socket/client';
import type { InitiativeEntry } from '@dnd/shared';

export default function InitiativeTracker() {
  const gameState = useGameStore((s) => s.gameState);
  const isDM = useGameStore(selectIsDM);
  const encounter = gameState?.encounter;

  function nextTurn() {
    getSocket().emit('encounter:nextTurn');
  }

  function endEncounter() {
    getSocket().emit('encounter:end');
  }

  function startEncounterFromTokens() {
    if (!gameState) return;
    const entries: InitiativeEntry[] = Object.values(gameState.tokens).map((t) => ({
      tokenId: t.id,
      name: t.name,
      initiative: Math.floor(Math.random() * 20) + 1 + t.initiative,
      hp: t.hp,
      maxHp: t.maxHp,
      conditions: t.conditions,
      isPlayer: t.type === 'player',
    }));
    getSocket().emit('encounter:start', { entries });
  }

  if (!encounter || !encounter.active) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 text-center">
        <div className="text-3xl mb-3">⚔️</div>
        <p className="text-dungeon-400 text-sm mb-4">No active encounter</p>
        {isDM && (
          <button onClick={startEncounterFromTokens} className="btn-primary text-sm">
            Start Encounter
          </button>
        )}
      </div>
    );
  }

  const current = encounter.entries[encounter.currentIndex];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-dungeon-700 bg-dungeon-900/50">
        <div className="text-xs text-parchment-300 font-semibold">
          Round {encounter.round}
        </div>
        {isDM && (
          <div className="flex gap-2">
            <button onClick={nextTurn} className="btn-primary text-xs px-2 py-1">
              Next ▶
            </button>
            <button onClick={endEncounter} className="btn-danger text-xs px-2 py-1">
              End
            </button>
          </div>
        )}
      </div>

      {/* Initiative list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {encounter.entries.map((entry, i) => (
          <InitiativeRow
            key={entry.tokenId}
            entry={entry}
            isActive={i === encounter.currentIndex}
            isDM={isDM}
          />
        ))}
      </div>
    </div>
  );
}

function InitiativeRow({
  entry,
  isActive,
  isDM,
}: {
  entry: InitiativeEntry;
  isActive: boolean;
  isDM: boolean;
}) {
  const hpPct = entry.maxHp > 0 ? Math.max(0, entry.hp / entry.maxHp) : 0;
  const hpColor = hpPct > 0.5 ? 'bg-green-500' : hpPct > 0.25 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div
      className={`rounded px-2 py-2 text-xs transition-colors ${
        isActive
          ? 'bg-parchment-400/20 border border-parchment-400/50 text-parchment-100'
          : 'bg-dungeon-700/40 border border-dungeon-600/30 text-parchment-300'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Turn indicator */}
        <span className={`w-4 text-center ${isActive ? 'text-parchment-400' : 'text-dungeon-600'}`}>
          {isActive ? '▶' : '·'}
        </span>

        {/* Initiative score */}
        <span
          className={`w-6 text-center font-mono font-bold text-sm ${
            isActive ? 'text-parchment-300' : 'text-dungeon-400'
          }`}
        >
          {entry.initiative}
        </span>

        {/* Name + type */}
        <div className="flex-1 min-w-0">
          <div className="truncate font-semibold">
            {entry.name}
            {!entry.isPlayer && ' 👾'}
          </div>
        </div>

        {/* HP display */}
        <div className="text-right">
          <span className="font-mono text-[10px]">
            {entry.hp}/{entry.maxHp}
          </span>
        </div>
      </div>

      {/* HP bar */}
      <div className="mt-1.5 mx-6">
        <div className="h-1 bg-dungeon-600 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${hpColor}`}
            style={{ width: `${hpPct * 100}%` }}
          />
        </div>
      </div>

      {/* Conditions */}
      {entry.conditions.length > 0 && (
        <div className="mt-1 mx-6 text-[10px] text-dungeon-400">
          {entry.conditions.join(', ')}
        </div>
      )}
    </div>
  );
}
