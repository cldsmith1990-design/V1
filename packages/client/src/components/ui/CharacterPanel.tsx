import { useState, useEffect } from 'react';
import { useGameStore, selectMyToken } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useApi } from '../../hooks/useApi';
import { emitTokenUpdate } from '../../socket/client';
import type { Character } from '@dnd/shared';

export default function CharacterPanel() {
  const myToken = useGameStore(selectMyToken);
  const { user } = useAuthStore();
  const api = useApi();
  const [character, setCharacter] = useState<Character | null>(null);
  const [editingHp, setEditingHp] = useState(false);
  const [hpInput, setHpInput] = useState('');

  useEffect(() => {
    if (myToken?.ownerId) {
      // Load character (we'll fake it from token data for now)
      setCharacter(null);
    }
  }, [myToken?.ownerId]);

  if (!myToken) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 text-center">
        <div className="text-3xl mb-3">🧙</div>
        <p className="text-dungeon-400 text-sm">No character token assigned.</p>
        <p className="text-dungeon-500 text-xs mt-2">Ask your DM to assign you a token.</p>
      </div>
    );
  }

  function updateHp() {
    if (!myToken) return;
    const newHp = Math.min(myToken.maxHp, Math.max(0, parseInt(hpInput) || 0));
    emitTokenUpdate({ id: myToken.id, hp: newHp });
    setEditingHp(false);
  }

  const hpPct = myToken.maxHp > 0 ? myToken.hp / myToken.maxHp : 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 space-y-3 text-xs">
      {/* Token header */}
      <div className="flex items-center gap-3 panel p-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
          style={{ background: myToken.color }}
        >
          {myToken.name[0]?.toUpperCase()}
        </div>
        <div>
          <div className="font-bold text-sm text-parchment-100">{myToken.name}</div>
          <div className="text-dungeon-400">
            {myToken.type.charAt(0).toUpperCase() + myToken.type.slice(1)} · AC {myToken.ac} · Speed {myToken.speed}ft
          </div>
        </div>
      </div>

      {/* HP */}
      <div className="panel p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="label">Hit Points</span>
          <button
            onClick={() => { setEditingHp(true); setHpInput(String(myToken.hp)); }}
            className="text-dungeon-400 hover:text-parchment-300 text-[10px]"
          >
            Edit
          </button>
        </div>
        {editingHp ? (
          <div className="flex gap-2">
            <input
              className="input text-xs w-20 text-center"
              type="number"
              value={hpInput}
              onChange={(e) => setHpInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && updateHp()}
              autoFocus
              min={0}
              max={myToken.maxHp}
            />
            <button onClick={updateHp} className="btn-primary text-xs px-2">Save</button>
            <button onClick={() => setEditingHp(false)} className="btn-secondary text-xs px-2">✕</button>
          </div>
        ) : (
          <>
            <div className="text-2xl font-mono font-bold text-parchment-100 mb-1">
              {myToken.hp} <span className="text-dungeon-400 text-sm">/ {myToken.maxHp}</span>
            </div>
            <div className="h-2 bg-dungeon-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  hpPct > 0.5 ? 'bg-green-500' : hpPct > 0.25 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${hpPct * 100}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Quick HP adjustments */}
      <div className="panel p-3">
        <div className="label mb-2">Damage / Heal</div>
        <div className="flex gap-1 flex-wrap">
          {[-10, -5, -1, +1, +5, +10].map((delta) => (
            <button
              key={delta}
              onClick={() => {
                const newHp = Math.min(myToken.maxHp, Math.max(0, myToken.hp + delta));
                emitTokenUpdate({ id: myToken.id, hp: newHp });
              }}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                delta < 0
                  ? 'bg-red-900/50 hover:bg-red-800/70 text-red-300'
                  : 'bg-green-900/50 hover:bg-green-800/70 text-green-300'
              }`}
            >
              {delta > 0 ? '+' : ''}{delta}
            </button>
          ))}
        </div>
      </div>

      {/* Conditions */}
      <div className="panel p-3">
        <div className="label mb-2">Conditions</div>
        {myToken.conditions.length === 0 ? (
          <div className="text-dungeon-500">None</div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {myToken.conditions.map((c) => (
              <span key={c} className="px-2 py-0.5 bg-dungeon-700 rounded text-parchment-300 text-[10px]">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="panel p-3">
        <div className="label mb-2">Stats</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'AC', value: myToken.ac },
            { label: 'Speed', value: `${myToken.speed}ft` },
            { label: 'Initiative', value: myToken.initiative >= 0 ? `+${myToken.initiative}` : myToken.initiative },
          ].map(({ label, value }) => (
            <div key={label} className="text-center bg-dungeon-700/50 rounded p-2">
              <div className="text-dungeon-400 text-[10px]">{label}</div>
              <div className="font-mono font-bold text-sm text-parchment-100">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
