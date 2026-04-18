import type { Server, Socket } from 'socket.io';
import { roomManager } from '../roomManager';
import type { InitiativeEntry, EncounterState } from '@dnd/shared';

export function registerInitiativeHandlers(io: Server, socket: Socket): void {
  // ── encounter:start ───────────────────────────────────────────────────────
  socket.on('encounter:start', ({ entries }: { entries: InitiativeEntry[] }) => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;
    if (!roomManager.isDM(sessionId, userId)) return;

    const sorted = [...entries].sort((a, b) => b.initiative - a.initiative);
    const encounter: EncounterState = {
      active: true,
      round: 1,
      currentIndex: 0,
      entries: sorted,
    };

    roomManager.updateGameState(sessionId, (s) => ({ ...s, encounter }));
    io.to(sessionId).emit('encounter:updated', encounter);
  });

  // ── encounter:end ─────────────────────────────────────────────────────────
  socket.on('encounter:end', () => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;
    if (!roomManager.isDM(sessionId, userId)) return;

    const encounter: EncounterState = {
      active: false,
      round: 0,
      currentIndex: 0,
      entries: [],
    };

    roomManager.updateGameState(sessionId, (s) => ({ ...s, encounter }));
    io.to(sessionId).emit('encounter:updated', encounter);
  });

  // ── encounter:nextTurn ────────────────────────────────────────────────────
  socket.on('encounter:nextTurn', () => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;
    if (!roomManager.isDM(sessionId, userId)) return;

    const room = roomManager.getRoom(sessionId);
    if (!room || !room.gameState.encounter.active) return;

    const updated = roomManager.updateGameState(sessionId, (s) => {
      const enc = s.encounter;
      const nextIndex = (enc.currentIndex + 1) % enc.entries.length;
      const nextRound = nextIndex === 0 ? enc.round + 1 : enc.round;
      return {
        ...s,
        encounter: { ...enc, currentIndex: nextIndex, round: nextRound },
      };
    });

    if (updated) {
      io.to(sessionId).emit('encounter:updated', updated.encounter);
    }
  });

  // ── encounter:reorder ─────────────────────────────────────────────────────
  socket.on('encounter:reorder', ({ entries }: { entries: InitiativeEntry[] }) => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;
    if (!roomManager.isDM(sessionId, userId)) return;

    const updated = roomManager.updateGameState(sessionId, (s) => ({
      ...s,
      encounter: { ...s.encounter, entries, currentIndex: 0 },
    }));

    if (updated) io.to(sessionId).emit('encounter:updated', updated.encounter);
  });

  // ── encounter:updateEntry ─────────────────────────────────────────────────
  socket.on('encounter:updateEntry', (patch: Partial<InitiativeEntry> & { tokenId: string }) => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;
    if (!roomManager.isDM(sessionId, userId)) return;

    const updated = roomManager.updateGameState(sessionId, (s) => ({
      ...s,
      encounter: {
        ...s.encounter,
        entries: s.encounter.entries.map((e) =>
          e.tokenId === patch.tokenId ? { ...e, ...patch } : e
        ),
      },
    }));

    if (updated) io.to(sessionId).emit('encounter:updated', updated.encounter);
  });
}
