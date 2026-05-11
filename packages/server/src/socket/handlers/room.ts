import type { Server, Socket } from 'socket.io';
import { prisma } from '../../db/client';
import { verifyToken } from '../../middleware/auth';
import { roomManager } from '../roomManager';
import type { GameState, RoomUser } from '@dnd/shared';
import { PLAYER_COLORS } from '@dnd/shared';

const DEFAULT_GAME_STATE: Omit<GameState, 'sessionId'> = {
  mapId: '',
  tokens: {},
  encounter: { active: false, round: 0, currentIndex: 0, entries: [] },
  fog: { revealed: {} },
  lockedMovement: false,
  activeMapId: '',
};

export function registerRoomHandlers(io: Server, socket: Socket): void {
  // ── room:join ─────────────────────────────────────────────────────────────
  socket.on('room:join', async ({ sessionId }: { sessionId: string }) => {
    // Auth: token from socket handshake
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      socket.emit('error', { message: 'Authentication required', code: 'AUTH_REQUIRED' });
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      socket.emit('error', { message: 'Invalid token', code: 'INVALID_TOKEN' });
      return;
    }

    // Load session from DB
    const dbSession = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: { select: { ownerId: true } },
        users: {
          where: { userId: payload.userId },
          include: { user: { select: { avatarColor: true } } },
        },
      },
    });

    if (!dbSession) {
      socket.emit('error', { message: 'Session not found', code: 'SESSION_NOT_FOUND' });
      return;
    }

    // Auto-join if not yet a member
    let sessionUser = dbSession.users[0];
    if (!sessionUser) {
      const isDM = dbSession.campaign.ownerId === payload.userId;
      const dbUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { avatarColor: true },
      });
      await prisma.sessionUser.create({
        data: {
          sessionId,
          userId: payload.userId,
          role: isDM ? 'dm' : 'player',
        },
      });
      sessionUser = {
        userId: payload.userId,
        role: isDM ? 'dm' : 'player',
        characterId: null,
        user: { avatarColor: dbUser?.avatarColor ?? PLAYER_COLORS[0] },
      } as typeof sessionUser;
    }

    const isDM = dbSession.campaign.ownerId === payload.userId;

    // Load or create in-memory room
    const savedState = dbSession.state as GameState | null;
    const initialState: GameState = savedState ?? {
      ...DEFAULT_GAME_STATE,
      sessionId,
    };
    initialState.sessionId = sessionId;

    const room = roomManager.getOrCreateRoom(sessionId, dbSession.campaign.ownerId, initialState);

    const userColor =
      (sessionUser as { user?: { avatarColor?: string } }).user?.avatarColor ??
      PLAYER_COLORS[room.users.size % PLAYER_COLORS.length];

    const roomUser: RoomUser & { socketId: string } = {
      id: payload.userId,
      name: payload.name,
      role: isDM ? 'dm' : ((sessionUser.role as 'player' | 'observer') ?? 'player'),
      characterId: sessionUser.characterId ?? undefined,
      color: userColor,
      isOnline: true,
      socketId: socket.id,
    };

    roomManager.addUser(sessionId, roomUser);
    await socket.join(sessionId);

    // Send full state to the joining user
    const recentMessages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Load active map data if one is set
    let activeMap = null;
    if (room.gameState.activeMapId) {
      activeMap = await prisma.map.findUnique({ where: { id: room.gameState.activeMapId } });
    }

    socket.emit('room:joined', {
      state: room.gameState,
      campaignId: dbSession.campaignId,
      activeMap,
      users: roomManager.getRoomUsers(sessionId).map(({ socketId: _s, ...u }) => u),
      messages: recentMessages.reverse().map((m) => ({
        id: m.id,
        sessionId: m.sessionId,
        userId: m.userId,
        userName: m.userName,
        userColor: m.userColor,
        content: m.content,
        type: m.type,
        timestamp: m.createdAt.getTime(),
        roll: m.rollData ? (m.rollData as object) : undefined,
        isPrivate: m.isPrivate,
        targetUserId: m.targetUserId ?? undefined,
      })),
    });

    // Notify others
    socket.to(sessionId).emit('room:userJoined', { ...roomUser, socketId: undefined });

    // System message
    const sysMsg = {
      id: `sys-${Date.now()}`,
      sessionId,
      userId: 'system',
      userName: 'System',
      userColor: '#94a3b8',
      content: `${payload.name} joined the session`,
      type: 'system' as const,
      timestamp: Date.now(),
    };
    io.to(sessionId).emit('chat:message', sysMsg);
  });

  // ── room:leave / disconnect ───────────────────────────────────────────────
  const handleLeave = async () => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;

    const { sessionId, userId } = found;
    roomManager.removeUser(sessionId, userId);

    const userName = socket.handshake.auth?.name ?? 'Someone';
    io.to(sessionId).emit('room:userLeft', { userId });
    io.to(sessionId).emit('chat:message', {
      id: `sys-${Date.now()}`,
      sessionId,
      userId: 'system',
      userName: 'System',
      userColor: '#94a3b8',
      content: `${userName} left the session`,
      type: 'system',
      timestamp: Date.now(),
    });
  };

  socket.on('room:leave', handleLeave);
  socket.on('disconnect', handleLeave);

  // ── room:ping ─────────────────────────────────────────────────────────────
  socket.on('room:ping', ({ position, label }: { position: { x: number; y: number }; label?: string }) => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;
    const user = roomManager.getRoomUsers(sessionId).find((u) => u.id === userId);
    socket.to(sessionId).emit('room:ping', {
      userId,
      userName: user?.name ?? 'Unknown',
      position,
      label,
    });
  });

  // ── session:lockMovement ──────────────────────────────────────────────────
  socket.on('session:lockMovement', ({ locked }: { locked: boolean }) => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;
    if (!roomManager.isDM(sessionId, userId)) return;

    roomManager.updateGameState(sessionId, (s) => ({ ...s, lockedMovement: locked }));
    io.to(sessionId).emit('session:movementLocked', { locked });
  });

  // ── session:saveState ─────────────────────────────────────────────────────
  socket.on('session:saveState', async () => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;
    if (!roomManager.isDM(sessionId, userId)) return;

    const room = roomManager.getRoom(sessionId);
    if (!room) return;

    await prisma.session.update({
      where: { id: sessionId },
      data: { state: room.gameState as object },
    });

    socket.emit('session:stateSaved');
    io.to(sessionId).emit('chat:message', {
      id: `sys-${Date.now()}`,
      sessionId,
      userId: 'system',
      userName: 'System',
      userColor: '#94a3b8',
      content: 'Session state saved.',
      type: 'system',
      timestamp: Date.now(),
    });
  });

  // ── session:setMap ────────────────────────────────────────────────────────
  socket.on('session:setMap', async ({ mapId }: { mapId: string }) => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;
    if (!roomManager.isDM(sessionId, userId)) return;

    const map = await prisma.map.findUnique({ where: { id: mapId } });
    if (!map) {
      socket.emit('error', { message: 'Map not found' });
      return;
    }

    roomManager.updateGameState(sessionId, (s) => ({
      ...s,
      activeMapId: mapId,
      // Clear token positions and fog when switching maps
      tokens: {},
      fog: { revealed: {} },
    }));

    io.to(sessionId).emit('session:mapChanged', { map });
    io.to(sessionId).emit('chat:message', {
      id: `sys-${Date.now()}`,
      sessionId,
      userId: 'system',
      userName: 'System',
      userColor: '#94a3b8',
      content: `Map switched to "${map.name}"`,
      type: 'system',
      timestamp: Date.now(),
    });
  });
}
