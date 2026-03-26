import { describe, expect, test } from "vite-plus/test";
import { BANK_SLOTS, INVENTORY_SLOTS } from "@realm-of-idlers/shared";
import { createNewGameState, CURRENT_SAVE_VERSION } from "../src/factory.js";

describe("createNewGameState", () => {
  const state = createNewGameState("TestPlayer");

  test("sets player name", () => {
    expect(state.player.name).toBe("TestPlayer");
  });

  test("sets version to current", () => {
    expect(state.version).toBe(CURRENT_SAVE_VERSION);
  });

  test("starts with 0 gold", () => {
    expect(state.player.gold).toBe(0);
  });

  test("spawns at town center", () => {
    expect(state.player.position).toEqual({ col: 32, row: 32 });
  });

  test("all gathering/production skills start at level 1 with 0 XP", () => {
    for (const skill of [
      "woodcutting",
      "mining",
      "fishing",
      "smithing",
      "cooking",
      "attack",
      "strength",
    ] as const) {
      expect(state.skills[skill]).toEqual({ level: 1, xp: 0 });
    }
  });

  test("hitpoints starts at level 10", () => {
    expect(state.skills.hitpoints.level).toBe(10);
    expect(state.skills.hitpoints.xp).toBe(1154);
  });

  test("inventory has correct number of empty slots", () => {
    expect(state.inventory.slots).toHaveLength(INVENTORY_SLOTS);
    expect(state.inventory.slots.every((s) => s === null)).toBe(true);
  });

  test("equipment is empty", () => {
    expect(state.equipment.equipped).toEqual({});
  });

  test("bank has correct number of empty slots", () => {
    expect(state.bank.slots).toHaveLength(BANK_SLOTS);
    expect(state.bank.slots.every((s) => s === null)).toBe(true);
  });

  test("action queue starts with idle", () => {
    expect(state.actionQueue).toEqual([{ type: "idle" }]);
  });

  test("quests are empty", () => {
    expect(state.quests).toEqual({});
  });

  test("world explored tiles is empty Set", () => {
    expect(state.world.exploredTiles).toBeInstanceOf(Set);
    expect(state.world.exploredTiles.size).toBe(0);
  });

  test("settings have defaults", () => {
    expect(state.settings.autoEatThreshold).toBe(0.5);
    expect(state.settings.uiScale).toBe(1.0);
  });

  test("timestamps are set", () => {
    expect(state.timestamps.created).toBeGreaterThan(0);
    expect(state.timestamps.lastSave).toBe(state.timestamps.created);
    expect(state.timestamps.lastTick).toBe(state.timestamps.created);
  });
});
