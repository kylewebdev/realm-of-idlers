import type {
  CombatEvent,
  GameNotification,
  ActionEntry,
  ItemStack,
  ItemId,
  QuestObjectiveId,
  SkillType,
} from "@realm-of-idlers/shared";

// ---------------------------------------------------------------------------
// Tick result — pure delta returned by tick()
// ---------------------------------------------------------------------------

export interface TickResult {
  skillXp: Partial<Record<SkillType, number>>;
  itemsGained: ItemStack[];
  itemsConsumed: ItemStack[];
  combatEvents: CombatEvent[];
  completedObjectives: QuestObjectiveId[];
  notifications: GameNotification[];
  /** Updated action to write back (decremented ticksRemaining, or idle). null = no change. */
  updatedAction: ActionEntry | null;
}

// ---------------------------------------------------------------------------
// Activity registries — injected into tick() so engine stays decoupled
// ---------------------------------------------------------------------------

export interface GatherActivityDef {
  id: string;
  skill: SkillType;
  baseTickDuration: number;
  levelRequired: number;
  toolRequired?: ItemId;
  outputs: ItemStack[];
  xpReward: number;
}

export interface CraftActivityDef {
  id: string;
  skill: SkillType;
  baseTickDuration: number;
  levelRequired: number;
  inputs: ItemStack[];
  outputs: ItemStack[];
  xpReward: number;
}

export interface TickContext {
  activities: {
    gather: Record<string, GatherActivityDef>;
    craft: Record<string, CraftActivityDef>;
  };
}

// ---------------------------------------------------------------------------
// Offline simulation summary
// ---------------------------------------------------------------------------

export interface OfflineSummary {
  ticksProcessed: number;
  xpGained: Partial<Record<SkillType, number>>;
  itemsGained: ItemStack[];
  levelsGained: Partial<Record<SkillType, number>>;
}
