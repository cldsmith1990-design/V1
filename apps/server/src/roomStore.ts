import { InMemoryRoom } from "./types.js";
import { starterMap } from "@vtt/shared";

const roomStore = new Map<string, InMemoryRoom>();

export const getOrCreateRoom = (roomId: string, roomCode: string): InMemoryRoom => {
  const existing = roomStore.get(roomId);
  if (existing) return existing;

  const room: InMemoryRoom = {
    sessions: new Map(),
    state: {
      roomId,
      roomCode,
      mapId: starterMap.id,
      movementLocked: false,
      round: 1,
      currentTurnIndex: 0,
      members: [],
      initiative: [],
      tokens: [
        {
          id: "token_pc_1",
          label: "Ranger",
          ownerUserId: "seed-player-1",
          type: "pc",
          x: 18,
          y: 16,
          hp: 31,
          maxHp: 31,
          hidden: false
        },
        {
          id: "token_wolf_1",
          label: "Wolf",
          ownerUserId: null,
          type: "monster",
          x: 26,
          y: 9,
          hp: 11,
          maxHp: 11,
          hidden: false
        }
      ]
    }
  };

  roomStore.set(roomId, room);
  return room;
};

export const getRoom = (roomId: string) => roomStore.get(roomId);
