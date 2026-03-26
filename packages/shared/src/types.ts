// ---------------------------------------------------------------------------
// Skill system
// ---------------------------------------------------------------------------

export type SkillType =
  | "woodcutting"
  | "mining"
  | "fishing"
  | "smithing"
  | "cooking"
  | "attack"
  | "strength"
  | "hitpoints";

// ---------------------------------------------------------------------------
// Item system
// ---------------------------------------------------------------------------

export type ItemId = string;
export type ItemCategory = "resource" | "equipment" | "food" | "tool" | "quest";
export type EquipSlot = "weapon" | "head" | "body" | "legs" | "shield";

export interface ItemStack {
  itemId: ItemId;
  quantity: number;
}

// ---------------------------------------------------------------------------
// World system
// ---------------------------------------------------------------------------

export type NodeId = string;
export type StructureId = string;
export type DecorationId = string;
export type TerrainType = "grass" | "dirt" | "stone" | "water";

export interface TileCoord {
  col: number;
  row: number;
}

export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

// ---------------------------------------------------------------------------
// Quest system
// ---------------------------------------------------------------------------

export type QuestId = string;
export type QuestObjectiveId = string;

// ---------------------------------------------------------------------------
// Action system
// ---------------------------------------------------------------------------

export interface GatherAction {
  type: "gather";
  activityId: string;
  nodeId: NodeId;
  ticksRemaining: number;
}

export interface CraftAction {
  type: "craft";
  activityId: string;
  ticksRemaining: number;
}

export interface CombatAction {
  type: "combat";
  monsterId: string;
  monsterCurrentHp?: number;
  tickCounter?: number;
}

export interface IdleAction {
  type: "idle";
}

export type ActionEntry = GatherAction | CraftAction | CombatAction | IdleAction;

// ---------------------------------------------------------------------------
// Events & notifications
// ---------------------------------------------------------------------------

export interface CombatEvent {
  type: "hit" | "miss" | "death" | "loot";
  damage?: number;
  source: "player" | "monster";
  itemsDropped?: ItemStack[];
}

export interface GameNotification {
  type: "level_up" | "quest_complete" | "rare_drop" | "death" | "milestone";
  message: string;
  skill?: SkillType;
  level?: number;
  itemId?: ItemId;
}

// ---------------------------------------------------------------------------
// State interfaces (shared so engine can consume without circular dep)
// ---------------------------------------------------------------------------

export interface InventoryState {
  slots: (ItemStack | null)[];
}

export interface EquipmentState {
  equipped: Partial<Record<EquipSlot, ItemId>>;
}

export interface BankState {
  slots: (ItemStack | null)[];
}

export type QuestStatus = "available" | "active" | "complete";

export interface PlayerSettings {
  autoEatThreshold: number;
  uiScale: number;
}

export interface GameState {
  version: number;
  player: {
    name: string;
    position: TileCoord;
    gold: number;
  };
  skills: Record<SkillType, { level: number; xp: number }>;
  inventory: InventoryState;
  equipment: EquipmentState;
  bank: BankState;
  actionQueue: ActionEntry[];
  quests: Record<QuestId, QuestStatus>;
  world: {
    resourceNodes: Record<NodeId, { depleted: boolean; respawnAt: number }>;
    exploredTiles: Set<string>;
  };
  settings: PlayerSettings;
  timestamps: {
    lastSave: number;
    lastTick: number;
    created: number;
  };
}
