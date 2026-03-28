import { BANK_SLOTS, INVENTORY_SLOTS } from "@realm-of-idlers/shared";
import type { ItemStack, SkillType } from "@realm-of-idlers/shared";
import type { GameState } from "./types.js";

export const CURRENT_SAVE_VERSION = 2;

const ALL_SKILLS: SkillType[] = [
  "woodcutting",
  "mining",
  "fishing",
  "smithing",
  "cooking",
  "attack",
  "strength",
  "hitpoints",
  "stamina",
];

function defaultSkills(): GameState["skills"] {
  const skills = {} as GameState["skills"];
  for (const skill of ALL_SKILLS) {
    skills[skill] = { level: 1, xp: 0 };
  }
  // Hitpoints starts at level 10 (matching RuneScape convention)
  skills.hitpoints = { level: 10, xp: 1154 };
  return skills;
}

export function createNewGameState(playerName: string): GameState {
  const now = Date.now();

  return {
    version: CURRENT_SAVE_VERSION,
    player: {
      name: playerName,
      position: { col: 256, row: 232 }, // Britain town center
      gold: 0,
    },
    skills: defaultSkills(),
    inventory: {
      slots: Array.from<ItemStack | null>({ length: INVENTORY_SLOTS }).fill(null),
    },
    equipment: {
      equipped: {},
    },
    bank: {
      slots: Array.from<ItemStack | null>({ length: BANK_SLOTS }).fill(null),
    },
    actionQueue: [{ type: "idle" }],
    quests: {},
    questProgress: {},
    killCounts: {},
    world: {
      resourceNodes: {},
      exploredTiles: new Set<string>(),
    },
    settings: {
      autoEatThreshold: 0.5,
      uiScale: 1.0,
    },
    timestamps: {
      lastSave: now,
      lastTick: now,
      created: now,
    },
  };
}
