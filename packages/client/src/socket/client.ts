import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/useGameStore';
import { useAuthStore } from '../store/useAuthStore';
import type { ChatMessage, Token, RoomUser, EncounterState, GameState, Vec2, MapData } from '@dnd/shared';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    throw new Error('Socket not initialized. Call initSocket() first.');
  }
  return socket;
}

export function initSocket(): Socket {
  if (socket?.connected) return socket;

  const token = useAuthStore.getState().token;

  socket = io(import.meta.env.VITE_SERVER_URL ?? '', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });

  const store = useGameStore.getState();

  // ── Connection lifecycle ──────────────────────────────────────────────────
  socket.on('connect', () => {
    store.setConnected(true);
    // Rejoin room on reconnect if we were in a session
    const { sessionId } = useGameStore.getState();
    if (sessionId) {
      socket!.emit('room:join', { sessionId });
    }
  });

  socket.on('disconnect', () => {
    store.setConnected(false);
  });

  // ── Room events ───────────────────────────────────────────────────────────
  socket.on(
    'room:joined',
    (payload: {
      state: GameState;
      campaignId: string;
      activeMap: MapData | null;
      users: RoomUser[];
      messages: ChatMessage[];
    }) => {
      store.setGameState(payload.state);
      store.setCampaignId(payload.campaignId);
      store.setCurrentMap(payload.activeMap);
      store.setRoomUsers(payload.users);
      store.setMessages(payload.messages);
    }
  );

  socket.on('room:userJoined', (user: RoomUser) => {
    store.addRoomUser(user);
  });

  socket.on('room:userLeft', ({ userId }: { userId: string }) => {
    store.removeRoomUser(userId);
  });

  socket.on('room:ping', (payload: { userId: string; userName: string; position: Vec2; label?: string }) => {
    store.addPingMarker({ position: payload.position, userName: payload.userName, label: payload.label });
  });

  // ── Token events ──────────────────────────────────────────────────────────
  socket.on('token:created', (token: Token) => {
    store.upsertToken(token);
  });

  socket.on('token:moved', ({ tokenId, position }: { tokenId: string; position: Vec2 }) => {
    store.moveToken(tokenId, position);
  });

  socket.on('token:updated', (patch: Partial<Token> & { id: string }) => {
    store.updateToken(patch);
  });

  socket.on('token:deleted', ({ tokenId }: { tokenId: string }) => {
    store.deleteToken(tokenId);
  });

  // ── Chat / Dice ───────────────────────────────────────────────────────────
  socket.on('chat:message', (msg: ChatMessage) => {
    store.addMessage(msg);
  });

  socket.on('dice:result', (msg: ChatMessage) => {
    store.addMessage(msg);
  });

  // ── Encounter ─────────────────────────────────────────────────────────────
  socket.on('encounter:updated', (enc: EncounterState) => {
    store.setEncounter(enc);
  });

  // ── Fog ───────────────────────────────────────────────────────────────────
  socket.on('fog:updated', ({ cells, revealed }: { cells: Vec2[]; revealed: boolean }) => {
    if (revealed) store.revealFogCells(cells);
    else store.hideFogCells(cells);
  });

  socket.on('fog:reset', ({ revealed }: { revealed: boolean }) => {
    store.resetFog(revealed);
  });

  // ── Session ───────────────────────────────────────────────────────────────
  socket.on('session:movementLocked', ({ locked }: { locked: boolean }) => {
    store.setMovementLocked(locked);
  });

  socket.on('session:mapChanged', ({ map }: { map: MapData }) => {
    store.setCurrentMap(map);
    // Clear tokens and fog (server already did this on its side)
    store.setGameState({
      ...useGameStore.getState().gameState!,
      tokens: {},
      fog: { revealed: {} },
      activeMapId: map.id,
    });
  });

  socket.on('error', ({ message }: { message: string }) => {
    console.error('[Socket error]', message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// ── Emit helpers ──────────────────────────────────────────────────────────────

export function joinRoom(sessionId: string): void {
  getSocket().emit('room:join', { sessionId });
}

export function emitTokenMove(tokenId: string, position: Vec2): void {
  getSocket().emit('token:move', { tokenId, position });
}

export function emitTokenCreate(token: Omit<Token, 'id'>): void {
  getSocket().emit('token:create', token);
}

export function emitTokenUpdate(patch: Partial<Token> & { id: string }): void {
  getSocket().emit('token:update', patch);
}

export function emitTokenDelete(tokenId: string): void {
  getSocket().emit('token:delete', { tokenId });
}

export function emitDiceRoll(payload: {
  dice: string;
  count: number;
  modifier: number;
  advantage?: boolean;
  disadvantage?: boolean;
  isPrivate?: boolean;
  label?: string;
}): void {
  getSocket().emit('dice:roll', payload);
}

export function emitChat(content: string, isPrivate?: boolean): void {
  getSocket().emit('chat:send', { content, isPrivate });
}

export function emitPing(position: Vec2, label?: string): void {
  getSocket().emit('room:ping', { position, label });
}

export function emitSaveState(): void {
  getSocket().emit('session:saveState');
}

export function emitLockMovement(locked: boolean): void {
  getSocket().emit('session:lockMovement', { locked });
}

export function emitSetMap(mapId: string): void {
  getSocket().emit('session:setMap', { mapId });
}
