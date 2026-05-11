import type { Server } from 'socket.io';
import { registerRoomHandlers } from './handlers/room';
import { registerTokenHandlers } from './handlers/tokens';
import { registerDiceHandlers } from './handlers/dice';
import { registerChatHandlers } from './handlers/chat';
import { registerInitiativeHandlers } from './handlers/initiative';
import { registerFogHandlers } from './handlers/fog';

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket) => {
    registerRoomHandlers(io, socket);
    registerTokenHandlers(io, socket);
    registerDiceHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerInitiativeHandlers(io, socket);
    registerFogHandlers(io, socket);
  });
}
