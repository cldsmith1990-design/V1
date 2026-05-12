import { Role, RoomState } from "@vtt/shared";

export interface AuthContext {
  userId: string;
  displayName: string;
  role: Role;
}

export interface SocketSession extends AuthContext {
  socketId: string;
  roomId: string;
}

export interface InMemoryRoom {
  state: RoomState;
  sessions: Map<string, SocketSession>;
}
