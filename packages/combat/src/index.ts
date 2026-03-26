// Types
export type { MonsterDef, LootEntry, CombatRoundResult } from "./types.js";

// Monsters
export { MONSTERS, getMonster } from "./monsters.js";

// Loot
export { rollLoot } from "./loot.js";

// Damage
export { calculateHitChance, calculateMaxHit, getEquipmentBonuses } from "./damage.js";

// Auto-eat
export { autoEat } from "./auto-eat.js";
export type { AutoEatResult } from "./auto-eat.js";

// Death
export { handleDeath } from "./death.js";
export type { DeathResult } from "./death.js";

// Processor
export { createCombatProcessor } from "./processor.js";
