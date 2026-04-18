// ─── Core Primitives ─────────────────────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

// ─── Auth & Users ────────────────────────────────────────────────────────────

export type UserRole = 'dm' | 'player' | 'observer';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface RoomUser {
  id: string;
  name: string;
  role: UserRole;
  characterId?: string;
  color: string;       // assigned display color
  isOnline: boolean;
  lastSeen?: number;
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

export type TokenType = 'player' | 'npc' | 'monster' | 'object';

export type TokenSize = 1 | 2 | 3 | 4; // grid cells (tiny=0.5, sm=1, med=2, lg=3, huge=4)

export type Condition =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'exhaustion'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious'
  | 'dead';

export interface Token {
  id: string;
  name: string;
  type: TokenType;
  position: Vec2;   // grid cell coordinates (col, row)
  size: TokenSize;
  hp: number;
  maxHp: number;
  ac: number;
  speed: number;    // feet per turn
  initiative: number;
  conditions: Condition[];
  imageUrl?: string;
  color: string;    // fallback token color
  ownerId?: string; // userId who controls this token (null = DM only)
  visible: boolean; // false = hidden from players
  gmOnly: boolean;  // true = only DM can see
  notes?: string;
}

// ─── Character Sheets ────────────────────────────────────────────────────────

export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface Character {
  id: string;
  userId: string;
  campaignId: string;
  name: string;
  class?: string;
  race?: string;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  speed: number;
  initiativeBonus: number;
  abilities: AbilityScores;
  notes?: string;
  spells?: SpellEntry[];
  inventory?: InventoryItem[];
  imageUrl?: string;
}

export interface SpellEntry {
  name: string;
  level: number;
  description?: string;
  prepared: boolean;
}

export interface InventoryItem {
  name: string;
  quantity: number;
  weight?: number;
  description?: string;
}

// ─── Maps ────────────────────────────────────────────────────────────────────

export type TerrainType = 'normal' | 'difficult' | 'impassable' | 'water' | 'wall';

export interface TerrainCell {
  col: number;
  row: number;
  type: TerrainType;
}

export interface MapData {
  id: string;
  campaignId: string;
  name: string;
  gridWidth: number;   // number of columns
  gridHeight: number;  // number of rows
  cellSize: number;    // pixels per cell (display hint)
  imageUrl?: string;
  terrain?: TerrainCell[];
  metadata?: Record<string, unknown>;
}

// ─── Fog of War ──────────────────────────────────────────────────────────────

export interface FogState {
  // sparse set: keys are "col,row" strings; true = revealed, absent = hidden
  revealed: Record<string, boolean>;
}

// ─── Initiative & Encounters ─────────────────────────────────────────────────

export interface InitiativeEntry {
  tokenId: string;
  name: string;
  initiative: number;
  hp: number;
  maxHp: number;
  conditions: Condition[];
  isPlayer: boolean;
}

export interface EncounterState {
  active: boolean;
  round: number;
  currentIndex: number; // index into initiative array
  entries: InitiativeEntry[];
}

// ─── Chat & Dice ─────────────────────────────────────────────────────────────

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export type MessageType = 'chat' | 'roll' | 'system' | 'emote' | 'whisper';

export interface DiceRollResult {
  dice: DiceType;
  count: number;
  modifier: number;
  rolls: number[];
  total: number;
  advantage?: boolean;
  disadvantage?: boolean;
  label?: string; // "Stealth Check", "Attack Roll", etc.
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userColor: string;
  content: string;
  type: MessageType;
  timestamp: number;
  roll?: DiceRollResult;
  isPrivate?: boolean;  // whisper to DM
  targetUserId?: string;
}

// ─── Session / Game State ────────────────────────────────────────────────────

export interface SessionMeta {
  id: string;
  campaignId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface CampaignMeta {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
}

export interface GameState {
  sessionId: string;
  mapId: string;
  tokens: Record<string, Token>;
  encounter: EncounterState;
  fog: FogState;
  lockedMovement: boolean; // DM can lock all player movement
  activeMapId: string;
}
