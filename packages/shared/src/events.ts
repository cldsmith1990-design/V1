import type {
  Token,
  Vec2,
  ChatMessage,
  DiceType,
  InitiativeEntry,
  EncounterState,
  GameState,
  RoomUser,
  MapData,
  FogState,
  Condition,
} from './types';

// ─── Socket Event Definitions ─────────────────────────────────────────────────
// Convention: C2S = client-to-server, S2C = server-to-client

export interface C2SEvents {
  // Room lifecycle
  'room:join': (payload: { sessionId: string }) => void;
  'room:leave': () => void;
  'room:ping': (payload: { position: Vec2; label?: string }) => void;

  // Token management (DM only for create/delete, players for move own token)
  'token:move': (payload: { tokenId: string; position: Vec2 }) => void;
  'token:create': (payload: Omit<Token, 'id'>) => void;
  'token:update': (payload: Partial<Token> & { id: string }) => void;
  'token:delete': (payload: { tokenId: string }) => void;

  // Dice rolling
  'dice:roll': (payload: {
    dice: DiceType;
    count: number;
    modifier: number;
    advantage?: boolean;
    disadvantage?: boolean;
    isPrivate?: boolean;
    label?: string;
  }) => void;

  // Chat
  'chat:send': (payload: { content: string; isPrivate?: boolean }) => void;

  // Initiative / encounter
  'encounter:start': (payload: { entries: InitiativeEntry[] }) => void;
  'encounter:end': () => void;
  'encounter:nextTurn': () => void;
  'encounter:reorder': (payload: { entries: InitiativeEntry[] }) => void;
  'encounter:updateEntry': (payload: Partial<InitiativeEntry> & { tokenId: string }) => void;

  // Fog of war (DM only)
  'fog:reveal': (payload: { cells: Vec2[] }) => void;
  'fog:hide': (payload: { cells: Vec2[] }) => void;
  'fog:revealAll': () => void;
  'fog:hideAll': () => void;

  // Session controls (DM only)
  'session:setMap': (payload: { mapId: string }) => void;
  'session:lockMovement': (payload: { locked: boolean }) => void;
  'session:saveState': () => void;
}

export interface S2CEvents {
  // Room events
  'room:joined': (payload: { state: GameState; users: RoomUser[]; messages: ChatMessage[] }) => void;
  'room:userJoined': (payload: RoomUser) => void;
  'room:userLeft': (payload: { userId: string }) => void;
  'room:ping': (payload: { userId: string; userName: string; position: Vec2; label?: string }) => void;

  // Token events
  'token:moved': (payload: { tokenId: string; position: Vec2; movedBy: string }) => void;
  'token:created': (payload: Token) => void;
  'token:updated': (payload: Partial<Token> & { id: string }) => void;
  'token:deleted': (payload: { tokenId: string }) => void;

  // Dice
  'dice:result': (payload: ChatMessage) => void;

  // Chat
  'chat:message': (payload: ChatMessage) => void;

  // Encounter
  'encounter:updated': (payload: EncounterState) => void;

  // Fog
  'fog:updated': (payload: { cells: Vec2[]; revealed: boolean }) => void;
  'fog:reset': (payload: { revealed: boolean }) => void;

  // Session
  'session:mapChanged': (payload: { map: MapData }) => void;
  'session:movementLocked': (payload: { locked: boolean }) => void;
  'session:stateSaved': () => void;

  // Errors
  'error': (payload: { message: string; code?: string }) => void;
}

// Unified type for socket.io typed usage
export type SocketEvents = C2SEvents & S2CEvents;
