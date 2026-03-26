import type { QuestDef } from "./types.js";

export const QUESTS: Record<string, QuestDef> = {
  welcome: {
    id: "welcome",
    name: "Welcome to Briarwood",
    description: "Speak with the guide NPC in the town center to receive your starter tools.",
    objectives: [{ type: "talk", objectiveId: "talk-guide", npcId: "guide" }],
    rewards: [
      { type: "item", itemId: "bronze-axe", qty: 1 },
      { type: "item", itemId: "bronze-pickaxe", qty: 1 },
      { type: "item", itemId: "fishing-rod", qty: 1 },
      { type: "gold", amount: 100 },
    ],
    prerequisites: [],
  },

  timber: {
    id: "timber",
    name: "Timber!",
    description: "Chop 10 normal logs from the trees in the northwest forest.",
    objectives: [{ type: "gather", objectiveId: "gather-logs", itemId: "normal-log", qty: 10 }],
    rewards: [{ type: "xp", skill: "woodcutting", amount: 50 }],
    prerequisites: ["welcome"],
  },

  "strike-the-earth": {
    id: "strike-the-earth",
    name: "Strike the Earth",
    description: "Mine copper and tin ore, then smelt them into bronze bars.",
    objectives: [
      { type: "gather", objectiveId: "gather-copper", itemId: "copper-ore", qty: 10 },
      { type: "gather", objectiveId: "gather-tin", itemId: "tin-ore", qty: 10 },
      { type: "craft", objectiveId: "craft-bronze", itemId: "bronze-bar", qty: 10 },
    ],
    rewards: [
      { type: "xp", skill: "smithing", amount: 100 },
      { type: "item", itemId: "bronze-sword", qty: 1 },
    ],
    prerequisites: ["welcome"],
  },

  "gone-fishing": {
    id: "gone-fishing",
    name: "Gone Fishing",
    description: "Catch shrimp from the river and cook them over the town fire.",
    objectives: [
      { type: "gather", objectiveId: "gather-shrimp", itemId: "raw-shrimp", qty: 15 },
      { type: "craft", objectiveId: "cook-shrimp", itemId: "cooked-shrimp", qty: 15 },
    ],
    rewards: [{ type: "xp", skill: "cooking", amount: 100 }],
    prerequisites: ["welcome"],
  },

  "pest-control": {
    id: "pest-control",
    name: "Pest Control",
    description: "The town is overrun with rats! Defeat 20 of them.",
    objectives: [{ type: "kill", objectiveId: "kill-rats", monsterId: "rat", qty: 20 }],
    rewards: [
      { type: "xp", skill: "attack", amount: 100 },
      { type: "xp", skill: "strength", amount: 100 },
      { type: "item", itemId: "bronze-shield", qty: 1 },
    ],
    prerequisites: ["welcome"],
  },
};
