import type { Server, Socket } from 'socket.io';
import { prisma } from '../../db/client';
import { roomManager } from '../roomManager';
import type { ChatMessage } from '@dnd/shared';
import { nanoid } from './utils';

export function registerChatHandlers(io: Server, socket: Socket): void {
  socket.on('chat:send', async ({ content, isPrivate }: { content: string; isPrivate?: boolean }) => {
    if (!content?.trim() || content.length > 2000) return;

    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;

    const room = roomManager.getRoom(sessionId);
    if (!room) return;
    const user = room.users.get(userId);
    if (!user) return;

    const isDM = roomManager.isDM(sessionId, userId);

    const message: ChatMessage = {
      id: nanoid(),
      sessionId,
      userId,
      userName: user.name,
      userColor: user.color,
      content: content.trim(),
      type: isPrivate && isDM ? 'whisper' : 'chat',
      timestamp: Date.now(),
      isPrivate: isPrivate && isDM,
    };

    await prisma.chatMessage.create({
      data: {
        id: message.id,
        sessionId,
        userId,
        userName: user.name,
        userColor: user.color,
        content: message.content,
        type: message.type,
        isPrivate: message.isPrivate ?? false,
      },
    });

    if (message.isPrivate) {
      // DM broadcast to everyone but only DM sees it in their own UI (handled client-side)
      io.to(sessionId).emit('chat:message', message);
    } else {
      io.to(sessionId).emit('chat:message', message);
    }
  });
}
