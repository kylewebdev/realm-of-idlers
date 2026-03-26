import { describe, expect, it } from "vite-plus/test";
import { GATHER_ACTIVITIES, CRAFT_ACTIVITIES } from "../src/activities.js";

const VALID_SKILLS = [
  "woodcutting",
  "mining",
  "fishing",
  "smithing",
  "cooking",
  "attack",
  "strength",
  "hitpoints",
];

describe("gather activities", () => {
  it("defines 7 gathering activities", () => {
    expect(Object.keys(GATHER_ACTIVITIES)).toHaveLength(7);
  });

  it("all have valid skill types", () => {
    for (const def of Object.values(GATHER_ACTIVITIES)) {
      expect(VALID_SKILLS).toContain(def.skill);
    }
  });

  it("all have positive XP rewards", () => {
    for (const def of Object.values(GATHER_ACTIVITIES)) {
      expect(def.xpReward).toBeGreaterThan(0);
    }
  });

  it("all have positive tick durations", () => {
    for (const def of Object.values(GATHER_ACTIVITIES)) {
      expect(def.baseTickDuration).toBeGreaterThan(0);
    }
  });

  it("all have at least one output", () => {
    for (const def of Object.values(GATHER_ACTIVITIES)) {
      expect(def.outputs.length).toBeGreaterThan(0);
    }
  });

  it("id matches the registry key", () => {
    for (const [key, def] of Object.entries(GATHER_ACTIVITIES)) {
      expect(def.id).toBe(key);
    }
  });

  it("chop-normal-tree matches plan values", () => {
    const def = GATHER_ACTIVITIES["chop-normal-tree"]!;
    expect(def.skill).toBe("woodcutting");
    expect(def.baseTickDuration).toBe(7);
    expect(def.levelRequired).toBe(1);
    expect(def.xpReward).toBe(25);
    expect(def.outputs).toEqual([{ itemId: "normal-log", quantity: 1 }]);
  });
});

describe("craft activities", () => {
  it("defines 6 crafting activities", () => {
    expect(Object.keys(CRAFT_ACTIVITIES)).toHaveLength(6);
  });

  it("all have valid skill types", () => {
    for (const def of Object.values(CRAFT_ACTIVITIES)) {
      expect(VALID_SKILLS).toContain(def.skill);
    }
  });

  it("all have inputs and outputs", () => {
    for (const def of Object.values(CRAFT_ACTIVITIES)) {
      expect(def.inputs.length).toBeGreaterThan(0);
      expect(def.outputs.length).toBeGreaterThan(0);
    }
  });

  it("all have positive XP rewards", () => {
    for (const def of Object.values(CRAFT_ACTIVITIES)) {
      expect(def.xpReward).toBeGreaterThan(0);
    }
  });

  it("smelt-bronze matches plan values", () => {
    const def = CRAFT_ACTIVITIES["smelt-bronze"]!;
    expect(def.skill).toBe("smithing");
    expect(def.baseTickDuration).toBe(5);
    expect(def.levelRequired).toBe(1);
    expect(def.xpReward).toBe(6);
    expect(def.inputs).toEqual([
      { itemId: "copper-ore", quantity: 1 },
      { itemId: "tin-ore", quantity: 1 },
    ]);
    expect(def.outputs).toEqual([{ itemId: "bronze-bar", quantity: 1 }]);
  });
});

describe("activity uniqueness", () => {
  it("no duplicate IDs across gather and craft", () => {
    const gatherIds = Object.keys(GATHER_ACTIVITIES);
    const craftIds = Object.keys(CRAFT_ACTIVITIES);
    const allIds = [...gatherIds, ...craftIds];
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
