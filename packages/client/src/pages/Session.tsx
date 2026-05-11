import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useGameStore, selectIsDM } from '../store/useGameStore';
import { initSocket, joinRoom, disconnectSocket } from '../socket/client';
import { useApi } from '../hooks/useApi';
import GameCanvas from '../components/canvas/GameCanvas';
import ChatPanel from '../components/ui/ChatPanel';
import InitiativeTracker from '../components/ui/InitiativeTracker';
import DiceRoller from '../components/ui/DiceRoller';
import PresenceBar from '../components/ui/PresenceBar';
import CharacterPanel from '../components/ui/CharacterPanel';
import DMPanel from '../components/dm/DMPanel';

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const { initSession, connected, gameState } = useGameStore();
  const isDM = useGameStore(selectIsDM);
  const api = useApi();

  const [activePanel, setActivePanel] = useState<'chat' | 'initiative' | 'character' | 'dm'>('chat');
  const initialized = useRef(false);

  useEffect(() => {
    if (!sessionId || !user || initialized.current) return;
    initialized.current = true;

    async function bootstrap() {
      try {
        // Ensure we're joined via REST (sets up DB record)
        const data = await api.post<{ role: 'dm' | 'player' | 'observer' }>(
          `/campaigns/unknown/sessions/${sessionId}/join`,
          {}
        );
        initSession(sessionId!, user!.id, data.role ?? 'player');

        // Init socket and join room
        initSocket();
        setTimeout(() => joinRoom(sessionId!), 200);
      } catch (err) {
        console.error('Session bootstrap failed', err);
      }
    }

    bootstrap();

    return () => {
      // Don't disconnect on unmount — leave event handles it
    };
  }, [sessionId, user]);

  if (!sessionId) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-dungeon-900 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-dungeon-700 bg-dungeon-800 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-dungeon-400 hover:text-parchment-300 text-sm"
          >
            ← Back
          </button>
          <span className="text-dungeon-600">|</span>
          <span className="fantasy-heading text-sm font-semibold text-parchment-300">
            {isDM ? '⚔️ DM View' : '🧙 Player View'}
          </span>
          <div
            className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-500'}`}
            title={connected ? 'Connected' : 'Disconnected'}
          />
        </div>
        <PresenceBar />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Game Canvas — center */}
        <div className="flex-1 relative">
          {gameState ? (
            <GameCanvas />
          ) : (
            <div className="flex items-center justify-center h-full text-dungeon-400">
              <div className="text-center">
                <div className="text-4xl mb-3">🎲</div>
                <p>{connected ? 'Loading session...' : 'Connecting...'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-80 flex flex-col border-l border-dungeon-700 shrink-0 bg-dungeon-800">
          {/* Panel Tabs */}
          <div className="flex border-b border-dungeon-700">
            {[
              { id: 'chat', label: 'Chat' },
              { id: 'initiative', label: 'Initiative' },
              { id: 'character', label: isDM ? 'Tokens' : 'Character' },
              ...(isDM ? [{ id: 'dm', label: 'DM' }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id as typeof activePanel)}
                className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 ${
                  activePanel === tab.id
                    ? 'text-parchment-200 border-parchment-400'
                    : 'text-dungeon-400 border-transparent hover:text-parchment-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activePanel === 'chat' && <ChatPanel />}
            {activePanel === 'initiative' && <InitiativeTracker />}
            {activePanel === 'character' && <CharacterPanel />}
            {activePanel === 'dm' && isDM && <DMPanel />}
          </div>

          {/* Dice Roller — always visible at bottom */}
          <DiceRoller />
        </div>
      </div>
    </div>
  );
}
