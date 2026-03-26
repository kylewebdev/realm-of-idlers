// Types
export type {
  TickResult,
  TickContext,
  GatherActivityDef,
  CraftActivityDef,
  OfflineSummary,
} from "./types.js";

// Core
export { tick } from "./tick.js";
export { applyTickResult, applyTickResultMut } from "./apply.js";
export { simulateOffline } from "./offline.js";
export { GameLoop } from "./loop.js";
export type { GameLoopCallbacks } from "./loop.js";

// Helpers
export { emptyTickResult, countFreeSlots, hasItems } from "./helpers.js";
