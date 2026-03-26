import { describe, expect, it } from "vite-plus/test";
import { processCraft } from "../src/processors/craft.js";
import { createTestState, createTestContext } from "./test-helpers.js";
import type { CraftAction } from "@realm-of-idlers/shared";

describe("processCraft", () => {
  const ctx = createTestContext();

  function makeCookAction(ticksRemaining: number): CraftAction {
    return { type: "craft", activityId: "cook-shrimp", ticksRemaining };
  }

  function makeSmeltAction(ticksRemaining: number): CraftAction {
    return { type: "craft", activityId: "smelt-bronze", ticksRemaining };
  }

  it("decrements ticksRemaining each tick", () => {
    const state = createTestState();
    state.inventory.slots[0] = { itemId: "raw-shrimp", quantity: 1 };
    const result = processCraft(state, makeCookAction(3), ctx);

    expect(result.updatedAction).toMatchObject({ ticksRemaining: 2 });
    expect(result.itemsGained).toEqual([]);
  });

  it("consumes inputs and produces outputs on completion", () => {
    const state = createTestState();
    state.inventory.slots[0] = { itemId: "raw-shrimp", quantity: 5 };
    const result = processCraft(state, makeCookAction(1), ctx);

    expect(result.itemsConsumed).toEqual([{ itemId: "raw-shrimp", quantity: 1 }]);
    expect(result.itemsGained).toEqual([{ itemId: "cooked-shrimp", quantity: 1 }]);
    expect(result.skillXp).toEqual({ cooking: 30 });
  });

  it("handles multi-input recipes (smelt bronze)", () => {
    const state = createTestState();
    state.inventory.slots[0] = { itemId: "copper-ore", quantity: 3 };
    state.inventory.slots[1] = { itemId: "tin-ore", quantity: 3 };
    const result = processCraft(state, makeSmeltAction(1), ctx);

    expect(result.itemsConsumed).toEqual([
      { itemId: "copper-ore", quantity: 1 },
      { itemId: "tin-ore", quantity: 1 },
    ]);
    expect(result.itemsGained).toEqual([{ itemId: "bronze-bar", quantity: 1 }]);
    expect(result.skillXp).toEqual({ smithing: 6 });
  });

  it("goes idle when inputs are missing", () => {
    const state = createTestState(); // empty inventory
    const result = processCraft(state, makeCookAction(1), ctx);

    expect(result.updatedAction).toEqual({ type: "idle" });
    expect(result.notifications[0]?.message).toContain("required materials");
  });

  it("goes idle for unknown activity", () => {
    const state = createTestState();
    const action: CraftAction = { type: "craft", activityId: "unknown", ticksRemaining: 1 };
    const result = processCraft(state, action, ctx);

    expect(result.updatedAction).toEqual({ type: "idle" });
  });

  it("auto-restarts after completion", () => {
    const state = createTestState();
    state.inventory.slots[0] = { itemId: "raw-shrimp", quantity: 5 };
    const result = processCraft(state, makeCookAction(1), ctx);

    expect(result.updatedAction).toMatchObject({
      type: "craft",
      ticksRemaining: 5, // baseTickDuration
    });
  });
});
