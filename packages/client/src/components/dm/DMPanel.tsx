import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import {
  emitTokenCreate,
  emitTokenDelete,
  emitSaveState,
  emitLockMovement,
  getSocket,
} from '../../socket/client';
import type { Token, TokenType } from '@dnd/shared';
import { PLAYER_COLORS } from '@dnd/shared';
import TokenCreator from './TokenCreator';
import FogControls from './FogControls';
import MapManager from './MapManager';

type DMTab = 'tokens' | 'maps' | 'fog' | 'session';

export default function DMPanel() {
  const [tab, setTab] = useState<DMTab>('tokens');
  const gameState = useGameStore((s) => s.gameState);
  const lockedMovement = gameState?.lockedMovement ?? false;

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex border-b border-dungeon-700 bg-dungeon-900/30">
        {([
          { id: 'tokens', label: 'Tokens' },
          { id: 'maps', label: 'Maps' },
          { id: 'fog', label: 'Fog' },
          { id: 'session', label: 'Session' },
        ] as { id: DMTab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
              tab === t.id
                ? 'text-parchment-200 bg-dungeon-700/50'
                : 'text-dungeon-400 hover:text-parchment-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'tokens' && <TokensTab />}
        {tab === 'maps' && <MapManager />}
        {tab === 'fog' && <FogControls />}
        {tab === 'session' && (
          <SessionTab lockedMovement={lockedMovement} />
        )}
      </div>
    </div>
  );
}

function TokensTab() {
  const gameState = useGameStore((s) => s.gameState);
  const [showCreator, setShowCreator] = useState(false);
  const tokens = Object.values(gameState?.tokens ?? {});

  return (
    <div className="p-3 space-y-3">
      <button
        onClick={() => setShowCreator(true)}
        className="btn-primary w-full text-sm"
      >
        + Add Token
      </button>

      {showCreator && (
        <TokenCreator onClose={() => setShowCreator(false)} />
      )}

      {/* Token list */}
      <div className="space-y-1">
        {tokens.length === 0 ? (
          <div className="text-dungeon-500 text-xs text-center py-4">No tokens on map.</div>
        ) : (
          tokens.map((token) => (
            <TokenRow key={token.id} token={token} />
          ))
        )}
      </div>
    </div>
  );
}

function TokenRow({ token }: { token: Token }) {
  const [expanded, setExpanded] = useState(false);
  const store = useGameStore();

  function toggle(field: 'visible' | 'gmOnly') {
    store.updateToken({ id: token.id, [field]: !token[field] });
    emitTokenUpdate(token.id, { [field]: !token[field] });
  }

  function deleteToken() {
    if (confirm(`Delete ${token.name}?`)) {
      emitTokenDelete(token.id);
    }
  }

  return (
    <div className="panel text-xs">
      <div
        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-dungeon-700/30"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="w-5 h-5 rounded-full shrink-0"
          style={{ background: token.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="truncate font-semibold">{token.name}</div>
          <div className="text-dungeon-500">{token.type} · HP {token.hp}/{token.maxHp}</div>
        </div>
        <div className="flex items-center gap-1 text-dungeon-500">
          {!token.visible && <span title="Hidden">🚫</span>}
          {token.gmOnly && <span title="DM Only">👁️</span>}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-dungeon-700 p-2 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => toggle('visible')}
              className={`flex-1 py-1 rounded text-[10px] transition-colors ${
                token.visible ? 'bg-green-900/40 text-green-300' : 'bg-dungeon-700 text-dungeon-400'
              }`}
            >
              {token.visible ? '👁 Visible' : '🚫 Hidden'}
            </button>
            <button
              onClick={() => toggle('gmOnly')}
              className={`flex-1 py-1 rounded text-[10px] transition-colors ${
                token.gmOnly ? 'bg-purple-900/40 text-purple-300' : 'bg-dungeon-700 text-dungeon-400'
              }`}
            >
              {token.gmOnly ? '🔒 GM Only' : '🌐 All See'}
            </button>
          </div>
          <button
            onClick={deleteToken}
            className="btn-danger w-full py-1 text-[10px]"
          >
            Delete Token
          </button>
        </div>
      )}
    </div>
  );
}

function emitTokenUpdate(tokenId: string, patch: Partial<Token>): void {
  getSocket().emit('token:update', { id: tokenId, ...patch });
}

function SessionTab({ lockedMovement }: { lockedMovement: boolean }) {
  const { user } = useAuthStore();
  const sessionId = useGameStore((s) => s.sessionId);

  const inviteUrl = `${window.location.origin}/session/${sessionId}`;

  return (
    <div className="p-3 space-y-3 text-xs">
      {/* Invite link */}
      <div className="panel p-3">
        <div className="label mb-2">Session Link</div>
        <div className="flex gap-2">
          <code className="input flex-1 text-[10px] truncate">{inviteUrl}</code>
          <button
            onClick={() => navigator.clipboard.writeText(inviteUrl)}
            className="btn-secondary text-[10px] px-2 shrink-0"
          >
            Copy
          </button>
        </div>
        <p className="text-dungeon-500 mt-1 text-[10px]">
          Share this link with your players.
        </p>
      </div>

      {/* Movement lock */}
      <div className="panel p-3">
        <div className="label mb-2">Player Movement</div>
        <button
          onClick={() => emitLockMovement(!lockedMovement)}
          className={`w-full py-2 rounded text-xs font-semibold transition-colors ${
            lockedMovement
              ? 'bg-red-900/50 text-red-300 border border-red-700 hover:bg-red-900/70'
              : 'bg-green-900/50 text-green-300 border border-green-700 hover:bg-green-900/70'
          }`}
        >
          {lockedMovement ? '🔒 Movement Locked' : '🔓 Movement Unlocked'}
        </button>
      </div>

      {/* Save state */}
      <div className="panel p-3">
        <div className="label mb-2">Save Session</div>
        <button onClick={emitSaveState} className="btn-primary w-full">
          💾 Save Current State
        </button>
        <p className="text-dungeon-500 mt-1 text-[10px]">
          Saves map state, token positions, fog, and encounter to the database.
        </p>
      </div>
    </div>
  );
}
