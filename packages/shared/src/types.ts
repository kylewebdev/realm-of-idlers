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
