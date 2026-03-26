import type { GameState } from "@realm-of-idlers/shared";
import type { TickContext, TickResult } from "./types.js";
import { processIdle } from "./processors/idle.js";
import { processGather } from "./processors/gather.js";
import { processCraft } from "./processors/craft.js";
import { processCombat } from "./processors/combat.js";

/**
 * Pure tick function — the heart of the engine.
 *
 * Reads the current action from the queue, delegates to the appropriate
 * processor, and returns a pure delta. No mutations.
 */
export function tick(state: GameState, ctx: TickContext): TickResult {
  const action = state.actionQueue[0] ?? { type: "idle" as const };

  switch (action.type) {
    case "gather":
      return processGather(state, action, ctx);
    case "craft":
      return processCraft(state, action, ctx);
    case "combat":
      return processCombat(state, action, ctx);
    case "idle":
      return processIdle();
  }
}
