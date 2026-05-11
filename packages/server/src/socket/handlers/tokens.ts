import type { Server, Socket } from 'socket.io';
import { roomManager } from '../roomManager';
import type { Token, Vec2 } from '@dnd/shared';
import { nanoid } from './utils';

export function registerTokenHandlers(io: Server, socket: Socket): void {
  // ── token:move ────────────────────────────────────────────────────────────
  socket.on('token:move', ({ tokenId, position }: { tokenId: string; position: Vec2 }) => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;

    const room = roomManager.getRoom(sessionId);
    if (!room) return;

    const token = room.gameState.tokens[tokenId];
    if (!token) return;

    const isDM = roomManager.isDM(sessionId, userId);

    // Players can only move their own token (and only when movement isn't locked)
    if (!isDM) {
      if (token.ownerId !== userId) return;
      if (room.gameState.lockedMovement) return;
    }

    // Validate grid bounds
    const { gridWidth, gridHeight } = getMapDimensions(room.gameState.activeMapId);
    if (
      position.x < 0 || position.y < 0 ||
      position.x >= gridWidth || position.y >= gridHeight
    ) return;

    roomManager.updateGameState(sessionId, (s) => ({
      ...s,
      tokens: { ...s.tokens, [tokenId]: { ...s.tokens[tokenId], position } },
    }));

    io.to(sessionId).emit('token:moved', { tokenId, position, movedBy: userId });
  });

  // ── token:create (DM only) ────────────────────────────────────────────────
  socket.on('token:create', (tokenData: Omit<Token, 'id'>) => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;
    if (!roomManager.isDM(sessionId, userId)) return;

    const token: Token = { ...tokenData, id: nanoid() };

    roomManager.updateGameState(sessionId, (s) => ({
      ...s,
      tokens: { ...s.tokens, [token.id]: token },
    }));

    io.to(sessionId).emit('token:created', token);
  });

  // ── token:update ──────────────────────────────────────────────────────────
  socket.on('token:update', (update: Partial<Token> & { id: string }) => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;

    const room = roomManager.getRoom(sessionId);
    if (!room) return;

    const existing = room.gameState.tokens[update.id];
    if (!existing) return;

    const isDM = roomManager.isDM(sessionId, userId);
    // Players can only update their own token's HP/conditions via limited fields
    if (!isDM && existing.ownerId !== userId) return;

    // If player, restrict what they can update
    let safeUpdate: Partial<Token> = update;
    if (!isDM) {
      const { id, hp, conditions, notes } = update;
      safeUpdate = { id, hp, conditions, notes };
    }

    roomManager.updateGameState(sessionId, (s) => ({
      ...s,
      tokens: { ...s.tokens, [update.id]: { ...s.tokens[update.id], ...safeUpdate } },
    }));

    io.to(sessionId).emit('token:updated', safeUpdate);
  });

  // ── token:delete (DM only) ────────────────────────────────────────────────
  socket.on('token:delete', ({ tokenId }: { tokenId: string }) => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;
    if (!roomManager.isDM(sessionId, userId)) return;

    roomManager.updateGameState(sessionId, (s) => {
      const tokens = { ...s.tokens };
      delete tokens[tokenId];
      return { ...s, tokens };
    });

    io.to(sessionId).emit('token:deleted', { tokenId });
  });
}

function getMapDimensions(_mapId: string): { gridWidth: number; gridHeight: number } {
  // Default dimensions; in production, look up from DB or room state
  return { gridWidth: 100, gridHeight: 100 };
}
