import { useState } from 'react';
import { emitTokenCreate } from '../../socket/client';
import type { TokenType } from '@dnd/shared';
import { PLAYER_COLORS } from '@dnd/shared';

interface TokenCreatorProps {
  onClose: () => void;
}

export default function TokenCreator({ onClose }: TokenCreatorProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TokenType>('monster');
  const [hp, setHp] = useState(10);
  const [maxHp, setMaxHp] = useState(10);
  const [ac, setAc] = useState(12);
  const [speed, setSpeed] = useState(30);
  const [size, setSize] = useState<1 | 2 | 3 | 4>(1);
  const [color, setColor] = useState(PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)]);

  function create() {
    if (!name.trim()) return;
    emitTokenCreate({
      name: name.trim(),
      type,
      position: { x: 15, y: 10 }, // center of default map
      size,
      hp,
      maxHp,
      ac,
      speed,
      initiative: 0,
      conditions: [],
      color,
      visible: true,
      gmOnly: false,
    });
    onClose();
  }

  return (
    <div className="panel p-3 space-y-2 text-xs border-parchment-400/20">
      <div className="font-semibold text-parchment-200 mb-2">New Token</div>

      <div>
        <label className="label">Name</label>
        <input
          className="input mt-1"
          placeholder="Goblin Chief"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div>
        <label className="label">Type</label>
        <div className="flex gap-1 mt-1">
          {(['player', 'npc', 'monster', 'object'] as TokenType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-1 rounded text-[10px] capitalize transition-colors ${
                type === t ? 'bg-parchment-400 text-dungeon-900 font-bold' : 'bg-dungeon-700 text-dungeon-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">HP</label>
          <input
            className="input mt-1"
            type="number"
            value={hp}
            onChange={(e) => setHp(parseInt(e.target.value) || 1)}
          />
        </div>
        <div>
          <label className="label">Max HP</label>
          <input
            className="input mt-1"
            type="number"
            value={maxHp}
            onChange={(e) => setMaxHp(parseInt(e.target.value) || 1)}
          />
        </div>
        <div>
          <label className="label">AC</label>
          <input
            className="input mt-1"
            type="number"
            value={ac}
            onChange={(e) => setAc(parseInt(e.target.value) || 10)}
          />
        </div>
        <div>
          <label className="label">Speed (ft)</label>
          <input
            className="input mt-1"
            type="number"
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value) || 30)}
          />
        </div>
      </div>

      <div>
        <label className="label">Size (grid cells)</label>
        <div className="flex gap-1 mt-1">
          {([1, 2, 3, 4] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`flex-1 py-1 rounded text-[10px] transition-colors ${
                size === s ? 'bg-parchment-400 text-dungeon-900 font-bold' : 'bg-dungeon-700 text-dungeon-300'
              }`}
            >
              {s}×{s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Color</label>
        <div className="flex gap-1.5 mt-1 flex-wrap">
          {PLAYER_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-all ${
                color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-dungeon-800' : ''
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={create} className="btn-primary flex-1">
          Place Token
        </button>
        <button onClick={onClose} className="btn-secondary">Cancel</button>
      </div>
    </div>
  );
}
