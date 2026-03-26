import type { CombatAction, GameState } from "@realm-of-idlers/shared";
import { emptyTickResult } from "../helpers.js";
import type { TickContext, TickResult } from "../types.js";

/**
 * Combat processor — delegates to the injected `processCombatTick` function
 * if available. Falls back to idle with a notification if combat is not wired up.
 */
export function processCombat(
  state: GameState,
  action: CombatAction,
  ctx: TickContext,
): TickResult {
  if (ctx.processCombatTick) {
    return ctx.processCombatTick(state, action);
  }

  const result = emptyTickResult();
  result.notifications.push({
    type: "milestone",
    message: "Combat is not yet available.",
  });
  result.updatedAction = { type: "idle" };
  return result;
}
