import type { CombatAction, GameState } from "@realm-of-idlers/shared";
import { emptyTickResult } from "../helpers.js";
import type { TickContext, TickResult } from "../types.js";

/**
 * Placeholder combat processor. Will be replaced when packages/combat
 * is implemented in Step 6.
 */
export function processCombat(
  _state: GameState,
  _action: CombatAction,
  _ctx: TickContext,
): TickResult {
  const result = emptyTickResult();
  result.notifications.push({
    type: "milestone",
    message: "Combat is not yet available.",
  });
  result.updatedAction = { type: "idle" };
  return result;
}
