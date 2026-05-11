import type { GameState, RoomUser } from '@dnd/shared';

// In-memory room state. For production, use Redis.
// Each session gets one RoomState which is the live game state.

export interface RoomState {
  sessionId: string;
  gameState: GameState;
  users: Map<string, RoomUser & { socketId: string }>;
  dmUserId: string;
}

class RoomManager {
  private rooms = new Map<string, RoomState>();

  getRoom(sessionId: string): RoomState | undefined {
    return this.rooms.get(sessionId);
  }

  getOrCreateRoom(sessionId: string, dmUserId: string, initialState: GameState): RoomState {
    if (!this.rooms.has(sessionId)) {
      const room: RoomState = {
        sessionId,
        gameState: initialState,
        users: new Map(),
        dmUserId,
      };
      this.rooms.set(sessionId, room);
    }
    return this.rooms.get(sessionId)!;
  }

  addUser(sessionId: string, user: RoomUser & { socketId: string }): void {
    const room = this.rooms.get(sessionId);
    if (room) {
      room.users.set(user.id, user);
    }
  }

  removeUser(sessionId: string, userId: string): void {
    const room = this.rooms.get(sessionId);
    if (room) {
      room.users.delete(userId);
      // Clean up empty rooms after a delay (allow reconnect)
      if (room.users.size === 0) {
        setTimeout(() => {
          const r = this.rooms.get(sessionId);
          if (r && r.users.size === 0) {
            this.rooms.delete(sessionId);
          }
        }, 60_000);
      }
    }
  }

  updateGameState(sessionId: string, updater: (state: GameState) => GameState): GameState | null {
    const room = this.rooms.get(sessionId);
    if (!room) return null;
    room.gameState = updater(room.gameState);
    return room.gameState;
  }

  getRoomUsers(sessionId: string): (RoomUser & { socketId: string })[] {
    return Array.from(this.rooms.get(sessionId)?.users.values() ?? []);
  }

  isDM(sessionId: string, userId: string): boolean {
    const room = this.rooms.get(sessionId);
    return room?.dmUserId === userId;
  }

  // Find which session a socket belongs to
  getUserRoom(socketId: string): { sessionId: string; userId: string } | null {
    for (const [sessionId, room] of this.rooms) {
      for (const [userId, user] of room.users) {
        if (user.socketId === socketId) {
          return { sessionId, userId };
        }
      }
    }
    return null;
  }
}

export const roomManager = new RoomManager();
