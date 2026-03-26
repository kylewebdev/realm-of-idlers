import type { GameState, ItemStack, SkillType } from "@realm-of-idlers/shared";
import { MAX_OFFLINE_TICKS } from "@realm-of-idlers/shared";
import { applyTickResultMut } from "./apply.js";
import { tick } from "./tick.js";
import type { OfflineSummary, TickContext } from "./types.js";

/**
 * Simulate offline progression by running tick() in a tight loop.
 *
 * Clones state once and mutates in-place for performance (avoids
 * 48,000 structuredClone calls at max offline duration).
 */
export function simulateOffline(
  state: GameState,
  ticksElapsed: number,
  ctx: TickContext,
): { newState: GameState; summary: OfflineSummary } {
  const tickCount = Math.min(ticksElapsed, MAX_OFFLINE_TICKS);

  // Clone once, mutate in the loop
  const newState = structuredClone(state);
  newState.world.exploredTiles = new Set(state.world.exploredTiles);

  const summary: OfflineSummary = {
    ticksProcessed: tickCount,
    xpGained: {},
    itemsGained: [],
    levelsGained: {},
  };

  // Snapshot skill levels before simulation to compute levels gained
  const levelsBefore: Record<string, number> = {};
  for (const [skill, entry] of Object.entries(newState.skills)) {
    levelsBefore[skill] = entry.level;
  }

  for (let i = 0; i < tickCount; i++) {
    const result = tick(newState, ctx);

    // Aggregate XP
    for (const [skill, xp] of Object.entries(result.skillXp) as [SkillType, number][]) {
      if (xp <= 0) continue;
      summary.xpGained[skill] = (summary.xpGained[skill] ?? 0) + xp;
    }

    // Aggregate items gained
    for (const item of result.itemsGained) {
      aggregateItem(summary.itemsGained, item);
    }

    // Apply result to state (mutating)
    applyTickResultMut(newState, result);
  }

  // Compute levels gained
  for (const [skill, entry] of Object.entries(newState.skills) as [
    SkillType,
    { level: number; xp: number },
  ][]) {
    const gained = entry.level - (levelsBefore[skill] ?? entry.level);
    if (gained > 0) {
      summary.levelsGained[skill] = gained;
    }
  }

  return { newState, summary };
}

function aggregateItem(list: ItemStack[], item: ItemStack): void {
  const existing = list.find((i) => i.itemId === item.itemId);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    list.push({ itemId: item.itemId, quantity: item.quantity });
  }
}
