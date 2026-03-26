import type { GatherActivityDef, CraftActivityDef } from "@realm-of-idlers/engine";

// ---------------------------------------------------------------------------
// Gathering activities
// ---------------------------------------------------------------------------

export const GATHER_ACTIVITIES: Record<string, GatherActivityDef> = {
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
  "mine-tin": {
    id: "mine-tin",
    skill: "mining",
    baseTickDuration: 7,
    levelRequired: 1,
    outputs: [{ itemId: "tin-ore", quantity: 1 }],
    xpReward: 17,
  },
  "mine-iron": {
    id: "mine-iron",
    skill: "mining",
    baseTickDuration: 10,
    levelRequired: 15,
    outputs: [{ itemId: "iron-ore", quantity: 1 }],
    xpReward: 35,
  },
  "fish-shrimp": {
    id: "fish-shrimp",
    skill: "fishing",
    baseTickDuration: 7,
    levelRequired: 1,
    outputs: [{ itemId: "raw-shrimp", quantity: 1 }],
    xpReward: 10,
  },
  "fish-trout": {
    id: "fish-trout",
    skill: "fishing",
    baseTickDuration: 10,
    levelRequired: 20,
    outputs: [{ itemId: "raw-trout", quantity: 1 }],
    xpReward: 50,
  },
};

// ---------------------------------------------------------------------------
// Crafting activities
// ---------------------------------------------------------------------------

export const CRAFT_ACTIVITIES: Record<string, CraftActivityDef> = {
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
  "smelt-iron": {
    id: "smelt-iron",
    skill: "smithing",
    baseTickDuration: 5,
    levelRequired: 15,
    inputs: [{ itemId: "iron-ore", quantity: 1 }],
    outputs: [{ itemId: "iron-bar", quantity: 1 }],
    xpReward: 12,
  },
  "smith-bronze-dagger": {
    id: "smith-bronze-dagger",
    skill: "smithing",
    baseTickDuration: 5,
    levelRequired: 1,
    inputs: [{ itemId: "bronze-bar", quantity: 1 }],
    outputs: [{ itemId: "bronze-dagger", quantity: 1 }],
    xpReward: 12,
  },
  "smith-iron-dagger": {
    id: "smith-iron-dagger",
    skill: "smithing",
    baseTickDuration: 5,
    levelRequired: 15,
    inputs: [{ itemId: "iron-bar", quantity: 1 }],
    outputs: [{ itemId: "iron-dagger", quantity: 1 }],
    xpReward: 25,
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
  "cook-trout": {
    id: "cook-trout",
    skill: "cooking",
    baseTickDuration: 5,
    levelRequired: 15,
    inputs: [{ itemId: "raw-trout", quantity: 1 }],
    outputs: [{ itemId: "cooked-trout", quantity: 1 }],
    xpReward: 70,
  },
};
