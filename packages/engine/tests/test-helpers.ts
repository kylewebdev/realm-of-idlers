import type { GameState, SkillType } from "@realm-of-idlers/shared";
import { INVENTORY_SLOTS, BANK_SLOTS } from "@realm-of-idlers/shared";
import type { TickContext } from "../src/types.js";

const SKILL_TYPES: SkillType[] = [
  "woodcutting",
  "mining",
  "fishing",
  "smithing",
  "cooking",
  "attack",
  "strength",
  "hitpoints",
];

/** Create a minimal GameState for testing. */
export function createTestState(overrides?: Partial<GameState>): GameState {
  const skills = {} as GameState["skills"];
  for (const skill of SKILL_TYPES) {
    skills[skill] = { level: 1, xp: 0 };
  }
  // Hitpoints starts at 10
  skills.hitpoints = { level: 10, xp: 1154 };

  return {
    version: 1,
    player: { name: "Tester", position: { col: 32, row: 32 }, gold: 100 },
    skills,
    inventory: { slots: new Array(INVENTORY_SLOTS).fill(null) },
    equipment: { equipped: {} },
    bank: { slots: new Array(BANK_SLOTS).fill(null) },
    actionQueue: [{ type: "idle" }],
    quests: {},
    world: { resourceNodes: {}, exploredTiles: new Set() },
    settings: { autoEatThreshold: 0.5, uiScale: 1 },
    timestamps: { lastSave: Date.now(), lastTick: Date.now(), created: Date.now() },
    ...overrides,
  };
}

/** Create a TickContext with a basic woodcutting and smelting activity. */
export function createTestContext(): TickContext {
  return {
    activities: {
      gather: {
        "chop-normal-tree": {
          id: "chop-normal-tree",
          skill: "woodcutting",
          baseTickDuration: 7,
          levelRequired: 1,
          outputs: [{ itemId: "normal-log", quantity: 1 }],
          xpReward: 25,
        },
        "chop-oak-tree": {
          id: "chop-oak-tree",
          skill: "woodcutting",
          baseTickDuration: 10,
          levelRequired: 15,
          outputs: [{ itemId: "oak-log", quantity: 1 }],
          xpReward: 37,
        },
        "mine-copper": {
          id: "mine-copper",
          skill: "mining",
          baseTickDuration: 7,
          levelRequired: 1,
          outputs: [{ itemId: "copper-ore", quantity: 1 }],
          xpReward: 17,
        },
      },
      craft: {
        "smelt-bronze": {
          id: "smelt-bronze",
          skill: "smithing",
          baseTickDuration: 5,
          levelRequired: 1,
          inputs: [
            { itemId: "copper-ore", quantity: 1 },
            { itemId: "tin-ore", quantity: 1 },
          ],
          outputs: [{ itemId: "bronze-bar", quantity: 1 }],
          xpReward: 6,
        },
        "cook-shrimp": {
          id: "cook-shrimp",
          skill: "cooking",
          baseTickDuration: 5,
          levelRequired: 1,
          inputs: [{ itemId: "raw-shrimp", quantity: 1 }],
          outputs: [{ itemId: "cooked-shrimp", quantity: 1 }],
          xpReward: 30,
        },
      },
    },
  };
}
