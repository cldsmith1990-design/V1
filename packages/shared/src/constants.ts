export const GRID_CELL_SIZE = 40; // base px per grid square
export const DEFAULT_GRID_WIDTH = 30;
export const DEFAULT_GRID_HEIGHT = 20;
export const MAX_ROOM_USERS = 10;
export const RECONNECT_TIMEOUT_MS = 30_000;

export const PLAYER_COLORS = [
  '#60a5fa', // blue
  '#34d399', // green
  '#f472b6', // pink
  '#fb923c', // orange
  '#a78bfa', // purple
  '#facc15', // yellow
  '#f87171', // red
  '#22d3ee', // cyan
];

export const CONDITION_ICONS: Record<string, string> = {
  blinded: '👁️',
  charmed: '💜',
  deafened: '🔇',
  exhaustion: '😴',
  frightened: '😨',
  grappled: '🤝',
  incapacitated: '⚡',
  invisible: '👻',
  paralyzed: '⚡',
  petrified: '🪨',
  poisoned: '☠️',
  prone: '⬇️',
  restrained: '⛓️',
  stunned: '💫',
  unconscious: '💤',
  dead: '💀',
};

export const DICE_SIDES: Record<string, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
  d100: 100,
};
