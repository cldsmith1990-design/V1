import { z } from "zod";

export type Role = "dm" | "player" | "observer";

export const JoinRoomPayload = z.object({
  roomCode: z.string().min(4),
  token: z.string().min(8),
  displayName: z.string().min(2).max(32)
});

export const TokenMovePayload = z.object({
  roomId: z.string(),
  tokenId: z.string(),
  x: z.number().int().min(0),
  y: z.number().int().min(0)
});

export const DiceRollPayload = z.object({
  roomId: z.string(),
  formula: z.string(),
  visibility: z.enum(["public", "gm"]).default("public")
});

export interface RoomMember {
  userId: string;
  displayName: string;
  role: Role;
  online: boolean;
}

export interface TokenState {
  id: string;
  label: string;
  ownerUserId: string | null;
  type: "pc" | "npc" | "monster" | "object";
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  hidden: boolean;
}

export interface InitiativeEntry {
  tokenId: string;
  initiative: number;
  status: string[];
}

export interface RoomState {
  roomId: string;
  roomCode: string;
  movementLocked: boolean;
  round: number;
  currentTurnIndex: number;
  mapId: string;
  tokens: TokenState[];
  initiative: InitiativeEntry[];
  members: RoomMember[];
}

export interface DeltaEvent<T = unknown> {
  type: string;
  payload: T;
  actorUserId: string;
  timestamp: string;
}

export const starterMap = {
  id: "forest_campsite_v1",
  name: "Forest Campsite",
  width: 42,
  height: 28,
  gridSize: 64,
  terrainZones: [
    { id: "tree_line_n", type: "blocking", polygon: [[0, 0], [42, 0], [42, 3], [0, 3]] },
    { id: "mud_patch", type: "difficult", polygon: [[16, 12], [23, 12], [23, 18], [16, 18]] }
  ],
  sceneObjects: [
    { id: "tent_1", type: "tent", x: 14, y: 11 },
    { id: "tent_2", type: "tent", x: 21, y: 10 },
    { id: "tent_3", type: "tent", x: 18, y: 15 },
    { id: "fire_1", type: "campfire", x: 19, y: 13 },
    { id: "log_1", type: "log", x: 17, y: 13 },
    { id: "log_2", type: "log", x: 21, y: 13 }
  ]
};

export const canControlToken = (role: Role, userId: string, token: TokenState) => {
  if (role === "dm") return true;
  if (role === "observer") return false;
  return token.ownerUserId === userId;
};
