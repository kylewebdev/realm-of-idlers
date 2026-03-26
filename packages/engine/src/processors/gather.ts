import type { GameState, GatherAction } from "@realm-of-idlers/shared";
import { emptyTickResult, countFreeSlots } from "../helpers.js";
import type { TickContext, TickResult } from "../types.js";

export function processGather(
  state: GameState,
  action: GatherAction,
  ctx: TickContext,
): TickResult {
  const result = emptyTickResult();
  const def = ctx.activities.gather[action.activityId];

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
    // Still in progress — just update the countdown
    result.updatedAction = { ...action, ticksRemaining: newTicksRemaining };
    return result;
  }

  // Cycle complete — produce outputs
  if (countFreeSlots(state.inventory) < def.outputs.length) {
    result.notifications.push({
      type: "milestone",
      message: "Your inventory is full.",
    });
    result.updatedAction = { type: "idle" };
    return result;
  }

  // Grant XP and items
  result.skillXp[def.skill] = def.xpReward;
  result.itemsGained.push(...def.outputs);

  // Auto-restart: reset tick countdown
  result.updatedAction = {
    ...action,
    ticksRemaining: def.baseTickDuration,
  };

  return result;
}
