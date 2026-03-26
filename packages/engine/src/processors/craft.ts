import type { CraftAction, GameState } from "@realm-of-idlers/shared";
import { emptyTickResult, countFreeSlots, hasItems } from "../helpers.js";
import type { TickContext, TickResult } from "../types.js";

export function processCraft(state: GameState, action: CraftAction, ctx: TickContext): TickResult {
  const result = emptyTickResult();
  const def = ctx.activities.craft[action.activityId];

  if (!def) {
    result.notifications.push({
      type: "milestone",
      message: `Unknown activity: ${action.activityId}`,
    });
    result.updatedAction = { type: "idle" };
    return result;
  }

  // Level check
  const skill = state.skills[def.skill];
  if (skill.level < def.levelRequired) {
    result.notifications.push({
      type: "milestone",
      message: `You need ${def.skill} level ${def.levelRequired} for this activity.`,
      skill: def.skill,
    });
    result.updatedAction = { type: "idle" };
    return result;
  }

  // Decrement tick countdown
  const newTicksRemaining = action.ticksRemaining - 1;

  if (newTicksRemaining > 0) {
    result.updatedAction = { ...action, ticksRemaining: newTicksRemaining };
    return result;
  }

  // Cycle complete — check inputs
  if (!hasItems(state.inventory, def.inputs)) {
    result.notifications.push({
      type: "milestone",
      message: "You don't have the required materials.",
    });
    result.updatedAction = { type: "idle" };
    return result;
  }

  // Check inventory space for outputs (account for consumed inputs freeing slots)
  const freeSlots = countFreeSlots(state.inventory);
  // Worst case: outputs need new slots. Consumed items may free some.
  if (freeSlots < def.outputs.length) {
    result.notifications.push({
      type: "milestone",
      message: "Your inventory is full.",
    });
    result.updatedAction = { type: "idle" };
    return result;
  }

  // Consume inputs, produce outputs, grant XP
  result.itemsConsumed.push(...def.inputs);
  result.itemsGained.push(...def.outputs);
  result.skillXp[def.skill] = def.xpReward;

  // Auto-restart if inputs still available after this craft
  // We check against current state — the apply step will handle the actual mutation.
  // For simplicity, always restart; the next tick will catch missing inputs.
  result.updatedAction = {
    ...action,
    ticksRemaining: def.baseTickDuration,
  };

  return result;
}
