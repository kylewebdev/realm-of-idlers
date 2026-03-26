import { describe, expect, it } from "vite-plus/test";
import { processGather } from "../src/processors/gather.js";
import { createTestState, createTestContext } from "./test-helpers.js";
import type { GatherAction } from "@realm-of-idlers/shared";

describe("processGather", () => {
  const ctx = createTestContext();

  function makeAction(ticksRemaining: number): GatherAction {
    return { type: "gather", activityId: "chop-normal-tree", nodeId: "tree-1", ticksRemaining };
  }

  it("decrements ticksRemaining each tick", () => {
    const state = createTestState();
    const result = processGather(state, makeAction(5), ctx);

    expect(result.updatedAction).toEqual({
      type: "gather",
      activityId: "chop-normal-tree",
      nodeId: "tree-1",
      ticksRemaining: 4,
    });
    expect(result.itemsGained).toEqual([]);
    expect(result.skillXp).toEqual({});
  });

  it("grants XP and items when countdown reaches zero", () => {
    const state = createTestState();
    const result = processGather(state, makeAction(1), ctx);

    expect(result.skillXp).toEqual({ woodcutting: 25 });
    expect(result.itemsGained).toEqual([{ itemId: "normal-log", quantity: 1 }]);
  });

  it("auto-restarts by resetting ticksRemaining", () => {
    const state = createTestState();
    const result = processGather(state, makeAction(1), ctx);

    expect(result.updatedAction).toMatchObject({
      type: "gather",
      ticksRemaining: 7, // baseTickDuration
    });
  });

  it("goes idle when level is too low", () => {
    const state = createTestState();
    // Oak requires level 15
    const action: GatherAction = {
      type: "gather",
      activityId: "chop-oak-tree",
      nodeId: "oak-1",
      ticksRemaining: 1,
    };
    const result = processGather(state, action, ctx);

    expect(result.updatedAction).toEqual({ type: "idle" });
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0]?.message).toContain("level 15");
  });

  it("goes idle when inventory is full", () => {
    const state = createTestState();
    // Fill all inventory slots
    for (let i = 0; i < state.inventory.slots.length; i++) {
      state.inventory.slots[i] = { itemId: `junk-${i}`, quantity: 1 };
    }
    const result = processGather(state, makeAction(1), ctx);

    expect(result.updatedAction).toEqual({ type: "idle" });
    expect(result.notifications[0]?.message).toContain("inventory is full");
  });

  it("goes idle for unknown activity", () => {
    const state = createTestState();
    const action: GatherAction = {
      type: "gather",
      activityId: "unknown",
      nodeId: "n",
      ticksRemaining: 1,
    };
    const result = processGather(state, action, ctx);

    expect(result.updatedAction).toEqual({ type: "idle" });
    expect(result.notifications).toHaveLength(1);
  });
});
