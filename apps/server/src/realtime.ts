import { Server as IOServer } from "socket.io";
import {
  canControlToken,
  DiceRollPayload,
  JoinRoomPayload,
  TokenMovePayload,
  Role
} from "@vtt/shared";
import { getOrCreateRoom, getRoom } from "./roomStore.js";
import { AuthContext } from "./types.js";

const parseAuth = (token?: string): AuthContext | null => {
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as AuthContext;
    if (!payload.userId || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
};

const rollFromFormula = (formula: string) => {
  const match = formula.trim().match(/(\d*)d(4|6|8|10|12|20|100)([+-]\d+)?/i);
  if (!match) return null;

  const count = Number(match[1] || 1);
  const sides = Number(match[2]);
  const mod = Number(match[3] || 0);
  const rolls = Array.from({ length: count }, () => Math.ceil(Math.random() * sides));
  const total = rolls.reduce((a, b) => a + b, 0) + mod;
  return { count, sides, mod, rolls, total };
};

export const registerRealtime = (io: IOServer) => {
  io.on("connection", (socket) => {
    socket.on("room:join", (raw, ack) => {
      const parsed = JoinRoomPayload.safeParse(raw);
      if (!parsed.success) return ack?.({ ok: false, error: "Invalid join payload" });

      const auth = parseAuth(parsed.data.token);
      if (!auth) return ack?.({ ok: false, error: "Invalid auth token" });

      const roomId = `room-${parsed.data.roomCode}`;
      const room = getOrCreateRoom(roomId, parsed.data.roomCode);

      socket.data.auth = auth;
      socket.data.roomId = roomId;
      socket.join(roomId);

      room.sessions.set(socket.id, {
        socketId: socket.id,
        roomId,
        ...auth,
        displayName: parsed.data.displayName
      });

      room.state.members = Array.from(room.sessions.values()).map((s) => ({
        userId: s.userId,
        displayName: s.displayName,
        role: s.role,
        online: true
      }));

      io.to(roomId).emit("presence:update", room.state.members);
      ack?.({ ok: true, snapshot: room.state });
    });

    socket.on("token:move", (raw, ack) => {
      const parsed = TokenMovePayload.safeParse(raw);
      if (!parsed.success) return ack?.({ ok: false, error: "Invalid move payload" });

      const room = getRoom(parsed.data.roomId);
      const auth = socket.data.auth as AuthContext | undefined;
      if (!room || !auth) return ack?.({ ok: false, error: "Room unavailable" });
      if (room.state.movementLocked && auth.role !== "dm") return ack?.({ ok: false, error: "Movement locked" });

      const token = room.state.tokens.find((t) => t.id === parsed.data.tokenId);
      if (!token) return ack?.({ ok: false, error: "Token not found" });
      if (!canControlToken(auth.role as Role, auth.userId, token)) return ack?.({ ok: false, error: "Forbidden" });

      token.x = parsed.data.x;
      token.y = parsed.data.y;

      io.to(room.state.roomId).emit("state:delta", {
        type: "token:moved",
        actorUserId: auth.userId,
        timestamp: new Date().toISOString(),
        payload: { tokenId: token.id, x: token.x, y: token.y }
      });

      ack?.({ ok: true });
    });

    socket.on("dice:roll", (raw, ack) => {
      const parsed = DiceRollPayload.safeParse(raw);
      if (!parsed.success) return ack?.({ ok: false, error: "Invalid dice payload" });

      const room = getRoom(parsed.data.roomId);
      const auth = socket.data.auth as AuthContext | undefined;
      if (!room || !auth) return ack?.({ ok: false, error: "Room unavailable" });

      const result = rollFromFormula(parsed.data.formula);
      if (!result) return ack?.({ ok: false, error: "Unsupported formula" });

      const event = {
        type: "dice:rolled",
        actorUserId: auth.userId,
        timestamp: new Date().toISOString(),
        payload: {
          visibility: parsed.data.visibility,
          formula: parsed.data.formula,
          roller: auth.displayName,
          ...result
        }
      };

      if (parsed.data.visibility === "gm") {
        const gmSession = Array.from(room.sessions.values()).find((s) => s.role === "dm");
        if (gmSession) io.to(gmSession.socketId).emit("state:delta", event);
        socket.emit("state:delta", event);
      } else {
        io.to(room.state.roomId).emit("state:delta", event);
      }

      ack?.({ ok: true, total: result.total });
    });

    socket.on("dm:movement-lock", (locked: boolean, ack) => {
      const auth = socket.data.auth as AuthContext | undefined;
      const roomId = socket.data.roomId as string | undefined;
      const room = roomId ? getRoom(roomId) : undefined;
      if (!room || !auth || auth.role !== "dm") return ack?.({ ok: false, error: "Forbidden" });

      room.state.movementLocked = locked;
      io.to(roomId).emit("state:delta", {
        type: "room:movementLock",
        actorUserId: auth.userId,
        timestamp: new Date().toISOString(),
        payload: { locked }
      });

      ack?.({ ok: true });
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId as string | undefined;
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room) return;
      room.sessions.delete(socket.id);
      room.state.members = Array.from(room.sessions.values()).map((s) => ({
        userId: s.userId,
        displayName: s.displayName,
        role: s.role,
        online: true
      }));
      io.to(roomId).emit("presence:update", room.state.members);
    });
  });
};
