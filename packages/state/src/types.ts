import type {
  ActionEntry,
  EquipSlot,
  ItemId,
  ItemStack,
  NodeId,
  QuestId,
  SkillType,
  TileCoord,
} from "@realm-of-idlers/shared";

// ---------------------------------------------------------------------------
// Sub-state interfaces
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

// ---------------------------------------------------------------------------
// Root game state
// ---------------------------------------------------------------------------

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
