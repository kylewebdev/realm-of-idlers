import { describe, expect, it } from "vite-plus/test";
import { applyTickResult } from "../src/apply.js";
import { emptyTickResult } from "../src/helpers.js";
import { createTestState } from "./test-helpers.js";

describe("applyTickResult", () => {
  it("applies XP correctly", () => {
    const state = createTestState();
    const result = emptyTickResult();
    result.skillXp = { woodcutting: 50 };

    const { newState } = applyTickResult(state, result);

    expect(newState.skills.woodcutting.xp).toBe(50);
    expect(state.skills.woodcutting.xp).toBe(0); // original unchanged
  });

  it("detects level-ups and generates notifications", () => {
    const state = createTestState();
    const result = emptyTickResult();
    // 83 XP gets you to level 2
    result.skillXp = { woodcutting: 83 };

    const { newState, notifications } = applyTickResult(state, result);

    expect(newState.skills.woodcutting.level).toBe(2);
    expect(notifications).toContainEqual(
      expect.objectContaining({ type: "level_up", skill: "woodcutting", level: 2 }),
    );
  });

  it("handles multi-level jumps", () => {
    const state = createTestState();
    const result = emptyTickResult();
    // 1154 XP = level 10 (same as hitpoints start)
    result.skillXp = { woodcutting: 1200 };

    const { newState, notifications } = applyTickResult(state, result);

    expect(newState.skills.woodcutting.level).toBeGreaterThan(2);
    // Should have notifications for each level gained
    const levelUps = notifications.filter(
      (n) => n.type === "level_up" && n.skill === "woodcutting",
    );
    expect(levelUps.length).toBe(newState.skills.woodcutting.level - 1);
  });

  it("adds gained items to inventory", () => {
    const state = createTestState();
    const result = emptyTickResult();
    result.itemsGained = [{ itemId: "normal-log", quantity: 1 }];

    const { newState } = applyTickResult(state, result);

    expect(newState.inventory.slots[0]).toEqual({ itemId: "normal-log", quantity: 1 });
  });

  it("stacks gained items with existing", () => {
    const state = createTestState();
    state.inventory.slots[0] = { itemId: "normal-log", quantity: 5 };
    const result = emptyTickResult();
    result.itemsGained = [{ itemId: "normal-log", quantity: 1 }];

    const { newState } = applyTickResult(state, result);

    expect(newState.inventory.slots[0]).toEqual({ itemId: "normal-log", quantity: 6 });
  });

  it("removes consumed items from inventory", () => {
    const state = createTestState();
    state.inventory.slots[0] = { itemId: "raw-shrimp", quantity: 3 };
    const result = emptyTickResult();
    result.itemsConsumed = [{ itemId: "raw-shrimp", quantity: 1 }];

    const { newState } = applyTickResult(state, result);

    expect(newState.inventory.slots[0]).toEqual({ itemId: "raw-shrimp", quantity: 2 });
  });

  it("clears slot when item fully consumed", () => {
    const state = createTestState();
    state.inventory.slots[0] = { itemId: "raw-shrimp", quantity: 1 };
    const result = emptyTickResult();
    result.itemsConsumed = [{ itemId: "raw-shrimp", quantity: 1 }];

    const { newState } = applyTickResult(state, result);

    expect(newState.inventory.slots[0]).toBeNull();
  });

  it("updates action queue", () => {
    const state = createTestState();
    const result = emptyTickResult();
    result.updatedAction = {
      type: "gather",
      activityId: "chop-normal-tree",
      nodeId: "t",
      ticksRemaining: 5,
    };

    const { newState } = applyTickResult(state, result);

    expect(newState.actionQueue).toEqual([result.updatedAction]);
  });

  it("preserves action queue when updatedAction is null", () => {
    const state = createTestState({ actionQueue: [{ type: "idle" }] });
    const result = emptyTickResult();

    const { newState } = applyTickResult(state, result);

    expect(newState.actionQueue).toEqual([{ type: "idle" }]);
  });

  it("includes result notifications in output", () => {
    const state = createTestState();
    const result = emptyTickResult();
    result.notifications = [{ type: "milestone", message: "Test notification" }];

    const { notifications } = applyTickResult(state, result);

    expect(notifications).toContainEqual({ type: "milestone", message: "Test notification" });
  });
});
