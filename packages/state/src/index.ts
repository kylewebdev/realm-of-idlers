// Types
export type {
  BankState,
  EquipmentState,
  GameState,
  InventoryState,
  PlayerSettings,
  QuestStatus,
} from "./types.js";

// XP table
export { levelForXp, xpForLevel, xpToNextLevel } from "./xp-table.js";

// Factory
export { createNewGameState, CURRENT_SAVE_VERSION } from "./factory.js";

// Selectors
export {
  combatLevel,
  freeInventorySlots,
  isInventoryFull,
  totalLevel,
  xpToNextLevel as xpToNextLevelForSkill,
} from "./selectors.js";

// Migrations
export { migrate } from "./migrations.js";

// Persistence
export {
  deleteSave,
  hasSave,
  loadGame,
  registerExitSave,
  saveGame,
  startAutoSave,
} from "./persistence.js";

// Store
export { createGameStore, gameStore } from "./store.js";
export type { GameActions, GameStore } from "./store.js";
