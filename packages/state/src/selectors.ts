import type { SkillType } from "@realm-of-idlers/shared";
import type { GameState } from "./types.js";
import { xpToNextLevel as xpRemaining } from "./xp-table.js";

/** Sum of all skill levels. */
export function totalLevel(state: GameState): number {
  let sum = 0;
  for (const skill of Object.values(state.skills)) {
    sum += skill.level;
  }
  return sum;
}

/**
 * Combat level formula (simplified RS-style):
 *   base = (attack + strength) / 2
 *   combat = floor(base + hitpoints / 4)
 */
export function combatLevel(state: GameState): number {
  const { attack, strength, hitpoints } = state.skills;
  const base = (attack.level + strength.level) / 2;
  return Math.floor(base + hitpoints.level / 4);
}

/** XP remaining until the next level for a given skill. */
export function xpToNextLevel(state: GameState, skill: SkillType): number {
  return xpRemaining(state.skills[skill]);
}

/** Whether all inventory slots are occupied. */
export function isInventoryFull(state: GameState): boolean {
  return state.inventory.slots.every((slot) => slot !== null);
}

/** Number of empty inventory slots. */
export function freeInventorySlots(state: GameState): number {
  return state.inventory.slots.filter((slot) => slot === null).length;
}
