import { describe, expect, test } from "vite-plus/test";
import { createNewGameState } from "../src/factory.js";
import {
  combatLevel,
  freeInventorySlots,
  isInventoryFull,
  totalLevel,
  xpToNextLevel,
} from "../src/selectors.js";
import type { GameState } from "../src/types.js";

function makeState(overrides?: Partial<GameState>): GameState {
  return { ...createNewGameState("Test"), ...overrides };
}

describe("totalLevel", () => {
  test("sums all skill levels", () => {
    const state = makeState();
    // 7 skills at level 1 + hitpoints at level 10 = 17
    expect(totalLevel(state)).toBe(17);
  });
});

describe("combatLevel", () => {
  test("computes from attack, strength, hitpoints", () => {
    const state = makeState();
    // attack=1, strength=1, hitpoints=10
    // base = (1+1)/2 = 1, combat = floor(1 + 10/4) = floor(3.5) = 3
    expect(combatLevel(state)).toBe(3);
  });
});

describe("xpToNextLevel", () => {
  test("returns XP remaining for a skill", () => {
    const state = makeState();
    // Woodcutting is level 1, 0 XP → needs 83
    expect(xpToNextLevel(state, "woodcutting")).toBe(83);
  });
});

describe("isInventoryFull", () => {
  test("empty inventory is not full", () => {
    expect(isInventoryFull(makeState())).toBe(false);
  });

  test("full inventory returns true", () => {
    const state = makeState();
    state.inventory.slots = state.inventory.slots.map(() => ({
      itemId: "log",
      quantity: 1,
    }));
    expect(isInventoryFull(state)).toBe(true);
  });
});

describe("freeInventorySlots", () => {
  test("new game has 28 free slots", () => {
    expect(freeInventorySlots(makeState())).toBe(28);
  });

  test("one item → 27 free", () => {
    const state = makeState();
    state.inventory.slots[0] = { itemId: "log", quantity: 1 };
    expect(freeInventorySlots(state)).toBe(27);
  });
});
