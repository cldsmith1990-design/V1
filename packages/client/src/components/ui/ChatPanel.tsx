import { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { emitChat } from '../../socket/client';
import type { ChatMessage } from '@dnd/shared';

export default function ChatPanel() {
  const messages = useGameStore((s) => s.messages);
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function send() {
    const trimmed = input.trim();
    if (!trimmed) return;
    emitChat(trimmed);
    setInput('');
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
        {messages.map((msg) => (
          <MessageRow key={msg.id} msg={msg} myId={user?.id} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-dungeon-700 p-2 flex gap-2">
        <input
          className="input text-xs flex-1"
          placeholder="Say something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button onClick={send} className="btn-secondary text-xs px-3">
          ↵
        </button>
      </div>
    </div>
  );
}

function MessageRow({ msg, myId }: { msg: ChatMessage; myId?: string }) {
  const isSystem = msg.type === 'system';
  const isRoll = msg.type === 'roll';
  const isMe = msg.userId === myId;

  if (isSystem) {
    return (
      <div className="text-center text-dungeon-500 italic py-0.5">
        {msg.content}
      </div>
    );
  }

  const total = msg.roll?.total;
  const isNat20 = msg.roll?.dice === 'd20' && msg.roll?.rolls?.[0] === 20;
  const isNat1 = msg.roll?.dice === 'd20' && msg.roll?.rolls?.[0] === 1;

  return (
    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
      <div className="flex items-baseline gap-1 mb-0.5">
        <span className="font-bold text-[10px]" style={{ color: msg.userColor }}>
          {msg.userName}
        </span>
        <span className="text-dungeon-600 text-[10px]">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {isRoll ? (
        <div
          className={`px-2 py-1 rounded text-[11px] max-w-[90%] border ${
            isNat20
              ? 'bg-yellow-900/40 border-yellow-500 text-yellow-300 nat20-glow'
              : isNat1
              ? 'bg-red-900/40 border-red-700 text-red-300'
              : 'bg-dungeon-700/60 border-dungeon-600 text-parchment-200'
          }`}
        >
          <div className="font-mono">{msg.content}</div>
          {msg.roll && (
            <div className="text-dungeon-400 text-[10px] mt-0.5">
              [{msg.roll.rolls.join(', ')}]{msg.roll.modifier !== 0 ? ` ${msg.roll.modifier > 0 ? '+' : ''}${msg.roll.modifier}` : ''}
              {isNat20 ? ' ✨ NAT 20!' : isNat1 ? ' 💀 NAT 1!' : ''}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`px-2 py-1 rounded text-[11px] max-w-[90%] ${
            isMe ? 'bg-dungeon-600 text-parchment-100' : 'bg-dungeon-700/60 text-parchment-200'
          }`}
        >
          {msg.content}
        </div>
      )}
    </div>
  );
}
