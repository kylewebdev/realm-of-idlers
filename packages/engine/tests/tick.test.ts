import { describe, expect, it } from "vite-plus/test";
import { tick } from "../src/tick.js";
import { createTestState, createTestContext } from "./test-helpers.js";

describe("tick", () => {
  const ctx = createTestContext();

  it("returns empty result for idle action", () => {
    const state = createTestState();
    const result = tick(state, ctx);

    expect(result.skillXp).toEqual({});
    expect(result.itemsGained).toEqual([]);
    expect(result.itemsConsumed).toEqual([]);
    expect(result.updatedAction).toBeNull();
  });

  it("treats empty action queue as idle", () => {
    const state = createTestState({ actionQueue: [] });
    const result = tick(state, ctx);

    expect(result.updatedAction).toBeNull();
    expect(result.notifications).toEqual([]);
  });

  it("dispatches gather action to gather processor", () => {
    const state = createTestState({
      actionQueue: [
        { type: "gather", activityId: "chop-normal-tree", nodeId: "tree-1", ticksRemaining: 2 },
      ],
    });
    const result = tick(state, ctx);

    // Should decrement ticksRemaining
    expect(result.updatedAction).toEqual({
      type: "gather",
      activityId: "chop-normal-tree",
      nodeId: "tree-1",
      ticksRemaining: 1,
    });
  });

  it("dispatches craft action to craft processor", () => {
    const state = createTestState({
      actionQueue: [{ type: "craft", activityId: "cook-shrimp", ticksRemaining: 2 }],
    });
    state.inventory.slots[0] = { itemId: "raw-shrimp", quantity: 1 };
    const result = tick(state, ctx);

    expect(result.updatedAction).toEqual({
      type: "craft",
      activityId: "cook-shrimp",
      ticksRemaining: 1,
    });
  });

  it("dispatches combat action to placeholder", () => {
    const state = createTestState({
      actionQueue: [{ type: "combat", monsterId: "chicken" }],
    });
    const result = tick(state, ctx);

    expect(result.updatedAction).toEqual({ type: "idle" });
    expect(result.notifications[0]?.message).toContain("not yet available");
  });

  it("returns notification for unknown gather activity", () => {
    const state = createTestState({
      actionQueue: [{ type: "gather", activityId: "nonexistent", nodeId: "n", ticksRemaining: 1 }],
    });
    const result = tick(state, ctx);

    expect(result.updatedAction).toEqual({ type: "idle" });
    expect(result.notifications).toHaveLength(1);
  });
});
