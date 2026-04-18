import { create } from "zustand";
import { DeltaEvent, RoomMember, RoomState } from "@vtt/shared";

interface SessionState {
  userId: string;
  displayName: string;
  role: "dm" | "player" | "observer";
  token: string;
}

interface ClientState extends Partial<SessionState> {
  room?: RoomState;
  feed: DeltaEvent[];
  setSession: (session: SessionState) => void;
  setRoom: (room: RoomState) => void;
  pushFeed: (event: DeltaEvent) => void;
  setPresence: (members: RoomMember[]) => void;
  patchToken: (tokenId: string, x: number, y: number) => void;
  setMovementLock: (locked: boolean) => void;
}

export const useSessionStore = create<ClientState>((set) => ({
  feed: [],
  setSession: (session) => set(session),
  setRoom: (room) => set({ room }),
  pushFeed: (event) => set((s) => ({ feed: [event, ...s.feed].slice(0, 150) })),
  setPresence: (members) => set((s) => (s.room ? { room: { ...s.room, members } } : s)),
  patchToken: (tokenId, x, y) =>
    set((s) => {
      if (!s.room) return s;
      return {
        room: {
          ...s.room,
          tokens: s.room.tokens.map((t) => (t.id === tokenId ? { ...t, x, y } : t))
        }
      };
    }),
  setMovementLock: (locked) => set((s) => (s.room ? { room: { ...s.room, movementLocked: locked } } : s))
}));
