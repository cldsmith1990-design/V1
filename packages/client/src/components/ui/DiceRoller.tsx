import { useState } from 'react';
import { emitDiceRoll } from '../../socket/client';
import { useGameStore, selectIsDM } from '../../store/useGameStore';
import type { DiceType } from '@dnd/shared';

const DICE: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

const DICE_ICONS: Record<DiceType, string> = {
  d4: '▲',
  d6: '⬛',
  d8: '◆',
  d10: '⬡',
  d12: '⬠',
  d20: '⬟',
  d100: '%',
};

export default function DiceRoller() {
  const isDM = useGameStore(selectIsDM);
  const [selectedDice, setSelectedDice] = useState<DiceType>('d20');
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [advantage, setAdvantage] = useState(false);
  const [disadvantage, setDisadvantage] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  function roll() {
    emitDiceRoll({
      dice: selectedDice,
      count,
      modifier,
      advantage: advantage && !disadvantage,
      disadvantage: disadvantage && !advantage,
      isPrivate: isPrivate && isDM,
    });
  }

  return (
    <div className="border-t border-dungeon-700 p-3 bg-dungeon-900/50 shrink-0">
      {/* Dice picker */}
      <div className="flex gap-1 mb-2 flex-wrap">
        {DICE.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDice(d)}
            className={`flex flex-col items-center justify-center w-9 h-9 rounded text-xs font-mono transition-colors ${
              selectedDice === d
                ? 'bg-parchment-400 text-dungeon-900 font-bold'
                : 'bg-dungeon-700 text-parchment-300 hover:bg-dungeon-600'
            }`}
          >
            <span className="text-[10px]">{DICE_ICONS[d]}</span>
            <span className="text-[9px] leading-none">{d}</span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1">
          <span className="text-dungeon-400 text-xs">#</span>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
            className="input w-12 text-xs text-center px-1"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-dungeon-400 text-xs">±</span>
          <input
            type="number"
            min={-20}
            max={20}
            value={modifier}
            onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
            className="input w-14 text-xs text-center px-1"
          />
        </div>

        <div className="flex gap-1 ml-auto">
          {selectedDice === 'd20' && count === 1 && (
            <>
              <button
                onClick={() => { setAdvantage(!advantage); setDisadvantage(false); }}
                className={`px-2 py-1 text-[10px] rounded transition-colors ${
                  advantage ? 'bg-green-700 text-white' : 'bg-dungeon-700 text-dungeon-400 hover:bg-dungeon-600'
                }`}
                title="Advantage"
              >
                ADV
              </button>
              <button
                onClick={() => { setDisadvantage(!disadvantage); setAdvantage(false); }}
                className={`px-2 py-1 text-[10px] rounded transition-colors ${
                  disadvantage ? 'bg-red-700 text-white' : 'bg-dungeon-700 text-dungeon-400 hover:bg-dungeon-600'
                }`}
                title="Disadvantage"
              >
                DIS
              </button>
            </>
          )}
          {isDM && (
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={`px-2 py-1 text-[10px] rounded transition-colors ${
                isPrivate ? 'bg-purple-700 text-white' : 'bg-dungeon-700 text-dungeon-400 hover:bg-dungeon-600'
              }`}
              title="GM-only roll"
            >
              🔒
            </button>
          )}
        </div>
      </div>

      {/* Roll button */}
      <button
        onClick={roll}
        className="btn-primary w-full text-sm font-bold"
      >
        Roll {count}{selectedDice}{modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}
        {advantage ? ' (Adv)' : disadvantage ? ' (Dis)' : ''}
      </button>
    </div>
  );
}
