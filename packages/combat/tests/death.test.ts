import { describe, expect, it } from "vite-plus/test";
import type { GameState } from "@realm-of-idlers/shared";
import { handleDeath } from "../src/death.js";

function makeState(gold: number): GameState {
  return {
    version: 1,
    player: { name: "Test", position: { col: 10, row: 10 }, gold },
    skills: {} as GameState["skills"],
    inventory: { slots: [] },
    equipment: { equipped: {} },
    bank: { slots: [] },
    actionQueue: [],
    quests: {},
    world: { resourceNodes: {}, exploredTiles: new Set() },
    settings: { autoEatThreshold: 0.5, uiScale: 1 },
    timestamps: { lastSave: 0, lastTick: 0, created: 0 },
  };
}

describe("handleDeath", () => {
  it("deducts 10% gold (floored)", () => {
    const result = handleDeath(makeState(155));
    expect(result.goldPenalty).toBe(15);
  });

  it("respawns at town center", () => {
    const result = handleDeath(makeState(100));
    expect(result.respawnPosition).toEqual({ col: 32, row: 32 });
  });

  it("generates death notification", () => {
    const result = handleDeath(makeState(100));
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0]!.type).toBe("death");
    expect(result.notifications[0]!.message).toContain("10 gold");
  });

  it("handles zero gold", () => {
    const result = handleDeath(makeState(0));
    expect(result.goldPenalty).toBe(0);
  });
});
