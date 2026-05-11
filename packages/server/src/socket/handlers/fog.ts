import type { Server, Socket } from 'socket.io';
import { roomManager } from '../roomManager';
import type { Vec2 } from '@dnd/shared';

export function registerFogHandlers(io: Server, socket: Socket): void {
  // ── fog:reveal ────────────────────────────────────────────────────────────
  socket.on('fog:reveal', ({ cells }: { cells: Vec2[] }) => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;
    if (!roomManager.isDM(sessionId, userId)) return;

    roomManager.updateGameState(sessionId, (s) => {
      const revealed = { ...s.fog.revealed };
      for (const cell of cells) {
        revealed[`${cell.x},${cell.y}`] = true;
      }
      return { ...s, fog: { revealed } };
    });

    io.to(sessionId).emit('fog:updated', { cells, revealed: true });
  });

  // ── fog:hide ──────────────────────────────────────────────────────────────
  socket.on('fog:hide', ({ cells }: { cells: Vec2[] }) => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;
    if (!roomManager.isDM(sessionId, userId)) return;

    roomManager.updateGameState(sessionId, (s) => {
      const revealed = { ...s.fog.revealed };
      for (const cell of cells) {
        delete revealed[`${cell.x},${cell.y}`];
      }
      return { ...s, fog: { revealed } };
    });

    io.to(sessionId).emit('fog:updated', { cells, revealed: false });
  });

  // ── fog:revealAll ─────────────────────────────────────────────────────────
  socket.on('fog:revealAll', () => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;
    if (!roomManager.isDM(sessionId, userId)) return;

    roomManager.updateGameState(sessionId, (s) => ({
      ...s,
      fog: { revealed: {} }, // empty = treat as "all revealed" sentinel
    }));

    io.to(sessionId).emit('fog:reset', { revealed: true });
  });

  // ── fog:hideAll ───────────────────────────────────────────────────────────
  socket.on('fog:hideAll', () => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;
    if (!roomManager.isDM(sessionId, userId)) return;

    roomManager.updateGameState(sessionId, (s) => ({
      ...s,
      fog: { revealed: { __all_hidden__: true } as Record<string, boolean> },
    }));

    io.to(sessionId).emit('fog:reset', { revealed: false });
  });
}
