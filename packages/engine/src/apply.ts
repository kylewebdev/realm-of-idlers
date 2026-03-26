import type { GameNotification, GameState, SkillType } from "@realm-of-idlers/shared";
import { levelForXp } from "@realm-of-idlers/shared";
import { addItemToInventory, removeItemFromInventory } from "./helpers.js";
import type { TickResult } from "./types.js";

/**
 * Apply a TickResult to a GameState, returning a new state and any
 * generated notifications (e.g. level-ups).
 *
 * This is the immutable variant — clones state first.
 */
export function applyTickResult(
  state: GameState,
  result: TickResult,
): { newState: GameState; notifications: GameNotification[] } {
  const newState = cloneState(state);
  const notifications = applyTickResultMut(newState, result);
  return { newState, notifications };
}

/**
 * Apply a TickResult to a GameState **in place** (mutating).
 * Returns generated notifications. Used by offline sim for performance.
 */
export function applyTickResultMut(state: GameState, result: TickResult): GameNotification[] {
  const notifications: GameNotification[] = [...result.notifications];

  // Apply XP deltas and detect level-ups
  for (const [skill, xp] of Object.entries(result.skillXp) as [SkillType, number][]) {
    if (xp <= 0) continue;
    const entry = state.skills[skill];
    entry.xp += xp;
    const newLevel = levelForXp(entry.xp);
    if (newLevel > entry.level) {
      const oldLevel = entry.level;
      entry.level = newLevel;
      for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        notifications.push({
          type: "level_up",
          message: `${skill} leveled up to ${lvl}!`,
          skill,
          level: lvl,
        });
      }
    }
  }

  // Remove consumed items
  for (const item of result.itemsConsumed) {
    removeItemFromInventory(state.inventory, item);
  }

  // Add gained items
  for (const item of result.itemsGained) {
    addItemToInventory(state.inventory, item);
  }

  // Update action queue
  if (result.updatedAction !== null) {
    state.actionQueue = [result.updatedAction];
  }

  // Update timestamp
  state.timestamps.lastTick = Date.now();

  return notifications;
}

/** Deep-clone a GameState, preserving Set instances. */
function cloneState(state: GameState): GameState {
  const cloned = structuredClone(state);
  // structuredClone handles Set natively, but let's be explicit
  cloned.world.exploredTiles = new Set(state.world.exploredTiles);
  return cloned;
}
