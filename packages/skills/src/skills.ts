import type { SkillType } from "@realm-of-idlers/shared";
import type { SkillDef } from "./types.js";

export const SKILLS: Record<SkillType, SkillDef> = {
  woodcutting: {
    type: "woodcutting",
    name: "Woodcutting",
    category: "gathering",
    milestones: [
      { level: 1, description: "Chop normal trees" },
      { level: 5, description: "Woodcutting milestone: level 5" },
      { level: 10, description: "Woodcutting milestone: level 10" },
      { level: 15, description: "Chop oak trees" },
      { level: 20, description: "Woodcutting milestone: level 20" },
    ],
  },
  mining: {
    type: "mining",
    name: "Mining",
    category: "gathering",
    milestones: [
      { level: 1, description: "Mine copper and tin ore" },
      { level: 5, description: "Mining milestone: level 5" },
      { level: 10, description: "Mining milestone: level 10" },
      { level: 15, description: "Mine iron ore" },
      { level: 20, description: "Mining milestone: level 20" },
    ],
  },
  fishing: {
    type: "fishing",
    name: "Fishing",
    category: "gathering",
    milestones: [
      { level: 1, description: "Fish shrimp" },
      { level: 5, description: "Fishing milestone: level 5" },
      { level: 10, description: "Fishing milestone: level 10" },
      { level: 15, description: "Fishing milestone: level 15" },
      { level: 20, description: "Fish trout" },
    ],
  },
  smithing: {
    type: "smithing",
    name: "Smithing",
    category: "production",
    milestones: [
      { level: 1, description: "Smelt bronze bars and smith bronze daggers" },
      { level: 5, description: "Smithing milestone: level 5" },
      { level: 10, description: "Smithing milestone: level 10" },
      { level: 15, description: "Smelt iron bars and smith iron daggers" },
      { level: 20, description: "Smithing milestone: level 20" },
    ],
  },
  cooking: {
    type: "cooking",
    name: "Cooking",
    category: "production",
    milestones: [
      { level: 1, description: "Cook shrimp" },
      { level: 5, description: "Cooking milestone: level 5" },
      { level: 10, description: "Cooking milestone: level 10" },
      { level: 15, description: "Cook trout" },
      { level: 20, description: "Cooking milestone: level 20" },
    ],
  },
  attack: {
    type: "attack",
    name: "Attack",
    category: "combat",
    milestones: [
      { level: 1, description: "Use bronze weapons" },
      { level: 5, description: "Attack milestone: level 5" },
      { level: 10, description: "Use iron weapons" },
      { level: 15, description: "Attack milestone: level 15" },
      { level: 20, description: "Attack milestone: level 20" },
    ],
  },
  strength: {
    type: "strength",
    name: "Strength",
    category: "combat",
    milestones: [
      { level: 1, description: "Base strength" },
      { level: 5, description: "Strength milestone: level 5" },
      { level: 10, description: "Strength milestone: level 10" },
      { level: 15, description: "Strength milestone: level 15" },
      { level: 20, description: "Strength milestone: level 20" },
    ],
  },
  hitpoints: {
    type: "hitpoints",
    name: "Hitpoints",
    category: "combat",
    milestones: [
      { level: 10, description: "Starting hitpoints level" },
      { level: 15, description: "Hitpoints milestone: level 15" },
      { level: 20, description: "Hitpoints milestone: level 20" },
    ],
  },
};

/** Look up a skill definition by type. */
export function getSkill(type: SkillType): SkillDef {
  return SKILLS[type];
}
