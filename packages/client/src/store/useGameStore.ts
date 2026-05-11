import { create } from 'zustand';
import type {
  GameState,
  Token,
  ChatMessage,
  EncounterState,
  RoomUser,
  Vec2,
  FogState,
  MapData,
} from '@dnd/shared';

interface GameStore {
  // Connection state
  connected: boolean;
  sessionId: string | null;
  campaignId: string | null;
  myUserId: string | null;
  myRole: 'dm' | 'player' | 'observer' | null;

  // Room users (presence)
  roomUsers: RoomUser[];

  // Core game state
  gameState: GameState | null;

  // Active map (full data including imageUrl)
  currentMap: MapData | null;

  // Chat
  messages: ChatMessage[];

  // UI ephemeral state
  selectedTokenId: string | null;
  pingMarkers: Array<{ id: string; position: Vec2; userName: string; label?: string }>;

  // Actions — called by socket event handlers and UI
  setConnected: (connected: boolean) => void;
  initSession: (sessionId: string, userId: string, role: 'dm' | 'player' | 'observer') => void;
  setCampaignId: (id: string) => void;
  setCurrentMap: (map: MapData | null) => void;
  setGameState: (state: GameState) => void;

  // User presence
  setRoomUsers: (users: RoomUser[]) => void;
  addRoomUser: (user: RoomUser) => void;
  removeRoomUser: (userId: string) => void;

  // Token operations (called from socket events)
  upsertToken: (token: Token) => void;
  moveToken: (tokenId: string, position: Vec2) => void;
  updateToken: (patch: Partial<Token> & { id: string }) => void;
  deleteToken: (tokenId: string) => void;

  // Chat
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;

  // Encounter
  setEncounter: (enc: EncounterState) => void;

  // Fog
  revealFogCells: (cells: Vec2[]) => void;
  hideFogCells: (cells: Vec2[]) => void;
  resetFog: (revealed: boolean) => void;

  // UI
  selectToken: (id: string | null) => void;
  addPingMarker: (marker: { position: Vec2; userName: string; label?: string }) => void;
  removePingMarker: (id: string) => void;

  // Session
  setMovementLocked: (locked: boolean) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  connected: false,
  sessionId: null,
  campaignId: null,
  myUserId: null,
  myRole: null,
  roomUsers: [],
  gameState: null,
  currentMap: null,
  messages: [],
  selectedTokenId: null,
  pingMarkers: [],

  setConnected: (connected) => set({ connected }),

  initSession: (sessionId, myUserId, myRole) =>
    set({ sessionId, myUserId, myRole }),

  setCampaignId: (id) => set({ campaignId: id }),

  setCurrentMap: (map) => set({ currentMap: map }),

  setGameState: (state) => set({ gameState: state }),

  setRoomUsers: (users) => set({ roomUsers: users }),

  addRoomUser: (user) =>
    set((s) => ({
      roomUsers: s.roomUsers.some((u) => u.id === user.id)
        ? s.roomUsers.map((u) => (u.id === user.id ? { ...u, isOnline: true } : u))
        : [...s.roomUsers, user],
    })),

  removeRoomUser: (userId) =>
    set((s) => ({
      roomUsers: s.roomUsers.map((u) =>
        u.id === userId ? { ...u, isOnline: false } : u
      ),
    })),

  upsertToken: (token) =>
    set((s) => ({
      gameState: s.gameState
        ? { ...s.gameState, tokens: { ...s.gameState.tokens, [token.id]: token } }
        : null,
    })),

  moveToken: (tokenId, position) =>
    set((s) => {
      if (!s.gameState) return {};
      const token = s.gameState.tokens[tokenId];
      if (!token) return {};
      return {
        gameState: {
          ...s.gameState,
          tokens: { ...s.gameState.tokens, [tokenId]: { ...token, position } },
        },
      };
    }),

  updateToken: (patch) =>
    set((s) => {
      if (!s.gameState) return {};
      const token = s.gameState.tokens[patch.id];
      if (!token) return {};
      return {
        gameState: {
          ...s.gameState,
          tokens: { ...s.gameState.tokens, [patch.id]: { ...token, ...patch } },
        },
      };
    }),

  deleteToken: (tokenId) =>
    set((s) => {
      if (!s.gameState) return {};
      const tokens = { ...s.gameState.tokens };
      delete tokens[tokenId];
      return { gameState: { ...s.gameState, tokens } };
    }),

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages.slice(-199), msg] })),

  setMessages: (msgs) => set({ messages: msgs }),

  setEncounter: (enc) =>
    set((s) => ({
      gameState: s.gameState ? { ...s.gameState, encounter: enc } : null,
    })),

  revealFogCells: (cells) =>
    set((s) => {
      if (!s.gameState) return {};
      const revealed = { ...s.gameState.fog.revealed };
      cells.forEach((c) => { revealed[`${c.x},${c.y}`] = true; });
      return { gameState: { ...s.gameState, fog: { revealed } } };
    }),

  hideFogCells: (cells) =>
    set((s) => {
      if (!s.gameState) return {};
      const revealed = { ...s.gameState.fog.revealed };
      cells.forEach((c) => { delete revealed[`${c.x},${c.y}`]; });
      return { gameState: { ...s.gameState, fog: { revealed } } };
    }),

  resetFog: (revealAll) =>
    set((s) => ({
      gameState: s.gameState
        ? {
            ...s.gameState,
            fog: revealAll
              ? { revealed: {} }
              : { revealed: { __all_hidden__: true } as FogState['revealed'] },
          }
        : null,
    })),

  selectToken: (id) => set({ selectedTokenId: id }),

  addPingMarker: (marker) => {
    const id = `ping-${Date.now()}-${Math.random()}`;
    set((s) => ({ pingMarkers: [...s.pingMarkers, { id, ...marker }] }));
    setTimeout(() => get().removePingMarker(id), 3000);
  },

  removePingMarker: (id) =>
    set((s) => ({ pingMarkers: s.pingMarkers.filter((p) => p.id !== id) })),

  setMovementLocked: (locked) =>
    set((s) => ({
      gameState: s.gameState ? { ...s.gameState, lockedMovement: locked } : null,
    })),
}));

// Convenience selectors
export const selectIsDM = (s: GameStore) => s.myRole === 'dm';
export const selectMyToken = (s: GameStore) =>
  s.gameState
    ? Object.values(s.gameState.tokens).find((t) => t.ownerId === s.myUserId)
    : undefined;
