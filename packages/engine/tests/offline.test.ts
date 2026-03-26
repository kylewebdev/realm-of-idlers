import { describe, expect, it } from "vite-plus/test";
import { MAX_OFFLINE_TICKS } from "@realm-of-idlers/shared";
import { simulateOffline } from "../src/offline.js";
import { tick } from "../src/tick.js";
import { applyTickResult } from "../src/apply.js";
import { createTestState, createTestContext } from "./test-helpers.js";

describe("simulateOffline", () => {
  const ctx = createTestContext();

  it("processes the correct number of ticks", () => {
    const state = createTestState({
      actionQueue: [
        { type: "gather", activityId: "chop-normal-tree", nodeId: "t", ticksRemaining: 7 },
      ],
    });

    const { summary } = simulateOffline(state, 20, ctx);

    expect(summary.ticksProcessed).toBe(20);
  });

  it("caps at MAX_OFFLINE_TICKS", () => {
    const state = createTestState();
    const { summary } = simulateOffline(state, MAX_OFFLINE_TICKS + 1000, ctx);

    expect(summary.ticksProcessed).toBe(MAX_OFFLINE_TICKS);
  });

  it("aggregates XP from gathering", () => {
    const state = createTestState({
      actionQueue: [
        { type: "gather", activityId: "chop-normal-tree", nodeId: "t", ticksRemaining: 1 },
      ],
    });

    // 14 ticks: completes at tick 1, restarts with 7 ticks, completes at tick 8 = 2 completions
    const { summary } = simulateOffline(state, 14, ctx);

    expect(summary.xpGained.woodcutting).toBe(50); // 2 * 25 XP
  });

  it("aggregates items from gathering", () => {
    const state = createTestState({
      actionQueue: [
        { type: "gather", activityId: "chop-normal-tree", nodeId: "t", ticksRemaining: 1 },
      ],
    });

    const { summary } = simulateOffline(state, 14, ctx);

    expect(summary.itemsGained).toContainEqual({ itemId: "normal-log", quantity: 2 });
  });

  it("matches sequential tick+apply for gathering", () => {
    const ticks = 21;
    const state = createTestState({
      actionQueue: [
        { type: "gather", activityId: "chop-normal-tree", nodeId: "t", ticksRemaining: 7 },
      ],
    });

    // Sequential approach
    let seqState = structuredClone(state);
    seqState.world.exploredTiles = new Set(state.world.exploredTiles);
    for (let i = 0; i < ticks; i++) {
      const result = tick(seqState, ctx);
      const { newState } = applyTickResult(seqState, result);
      seqState = newState;
    }

    // Offline approach
    const { newState: offlineState } = simulateOffline(state, ticks, ctx);

    // Compare skill XP
    expect(offlineState.skills.woodcutting.xp).toBe(seqState.skills.woodcutting.xp);
    // Compare inventory
    expect(offlineState.inventory.slots[0]).toEqual(seqState.inventory.slots[0]);
  });

  it("tracks levels gained", () => {
    const state = createTestState({
      actionQueue: [
        { type: "gather", activityId: "chop-normal-tree", nodeId: "t", ticksRemaining: 1 },
      ],
    });

    // Run enough ticks for at least one woodcutting level-up (83 XP for level 2, 25 XP per 7-tick cycle)
    // Need 4 completions = 100 XP. First at tick 1, then every 7: ticks 1, 8, 15, 22 = 4 completions in 22 ticks
    const { summary } = simulateOffline(state, 22, ctx);

    expect(summary.xpGained.woodcutting).toBe(100); // 4 * 25
    expect(summary.levelsGained.woodcutting).toBe(1); // level 1 → 2 at 83 XP
  });

  it("does not mutate original state", () => {
    const state = createTestState({
      actionQueue: [
        { type: "gather", activityId: "chop-normal-tree", nodeId: "t", ticksRemaining: 1 },
      ],
    });
    const originalXp = state.skills.woodcutting.xp;

    simulateOffline(state, 100, ctx);

    expect(state.skills.woodcutting.xp).toBe(originalXp);
  });
});
