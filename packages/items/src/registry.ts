import type { ItemId } from "@realm-of-idlers/shared";
import type { ItemDef } from "./types.js";

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

const RESOURCES: ItemDef[] = [
  {
    id: "normal-log",
    name: "Normal Log",
    icon: "normal-log",
    category: "resource",
    stackable: true,
    sellValue: 1,
  },
  {
    id: "oak-log",
    name: "Oak Log",
    icon: "oak-log",
    category: "resource",
    stackable: true,
    sellValue: 4,
  },
  {
    id: "copper-ore",
    name: "Copper Ore",
    icon: "copper-ore",
    category: "resource",
    stackable: true,
    sellValue: 1,
  },
  {
    id: "tin-ore",
    name: "Tin Ore",
    icon: "tin-ore",
    category: "resource",
    stackable: true,
    sellValue: 1,
  },
  {
    id: "iron-ore",
    name: "Iron Ore",
    icon: "iron-ore",
    category: "resource",
    stackable: true,
    sellValue: 8,
  },
  { id: "coal", name: "Coal", icon: "coal", category: "resource", stackable: true, sellValue: 15 },
  {
    id: "bronze-bar",
    name: "Bronze Bar",
    icon: "bronze-bar",
    category: "resource",
    stackable: true,
    sellValue: 4,
  },
  {
    id: "iron-bar",
    name: "Iron Bar",
    icon: "iron-bar",
    category: "resource",
    stackable: true,
    sellValue: 18,
  },
  {
    id: "raw-shrimp",
    name: "Raw Shrimp",
    icon: "raw-shrimp",
    category: "resource",
    stackable: true,
    sellValue: 1,
  },
  {
    id: "raw-trout",
    name: "Raw Trout",
    icon: "raw-trout",
    category: "resource",
    stackable: true,
    sellValue: 10,
  },
];

// ---------------------------------------------------------------------------
// Food
// ---------------------------------------------------------------------------

const FOOD: ItemDef[] = [
  {
    id: "cooked-shrimp",
    name: "Cooked Shrimp",
    icon: "cooked-shrimp",
    category: "food",
    stackable: true,
    sellValue: 3,
    healAmount: 3,
  },
  {
    id: "cooked-trout",
    name: "Cooked Trout",
    icon: "cooked-trout",
    category: "food",
    stackable: true,
    sellValue: 15,
    healAmount: 7,
  },
  {
    id: "burnt-fish",
    name: "Burnt Fish",
    icon: "burnt-fish",
    category: "food",
    stackable: true,
    sellValue: 0,
  },
];

// ---------------------------------------------------------------------------
// Tools (non-stackable)
// ---------------------------------------------------------------------------

const TOOLS: ItemDef[] = [
  {
    id: "bronze-axe",
    name: "Bronze Axe",
    icon: "bronze-axe",
    category: "tool",
    stackable: false,
    sellValue: 6,
    toolPower: 1,
  },
  {
    id: "iron-axe",
    name: "Iron Axe",
    icon: "iron-axe",
    category: "tool",
    stackable: false,
    sellValue: 28,
    toolPower: 2,
  },
  {
    id: "bronze-pickaxe",
    name: "Bronze Pickaxe",
    icon: "bronze-pickaxe",
    category: "tool",
    stackable: false,
    sellValue: 6,
    toolPower: 1,
  },
  {
    id: "iron-pickaxe",
    name: "Iron Pickaxe",
    icon: "iron-pickaxe",
    category: "tool",
    stackable: false,
    sellValue: 28,
    toolPower: 2,
  },
  {
    id: "fishing-rod",
    name: "Fishing Rod",
    icon: "fishing-rod",
    category: "tool",
    stackable: false,
    sellValue: 5,
    toolPower: 1,
  },
];

// ---------------------------------------------------------------------------
// Equipment — Bronze tier
// ---------------------------------------------------------------------------

const BRONZE_EQUIPMENT: ItemDef[] = [
  {
    id: "bronze-sword",
    name: "Bronze Sword",
    icon: "bronze-sword",
    category: "equipment",
    stackable: false,
    sellValue: 10,
    equipSlot: "weapon",
    equipStats: { attack: 4, strength: 3, defence: 0 },
  },
  {
    id: "bronze-dagger",
    name: "Bronze Dagger",
    icon: "bronze-dagger",
    category: "equipment",
    stackable: false,
    sellValue: 6,
    equipSlot: "weapon",
    equipStats: { attack: 2, strength: 2, defence: 0 },
  },
  {
    id: "bronze-helm",
    name: "Bronze Helm",
    icon: "bronze-helm",
    category: "equipment",
    stackable: false,
    sellValue: 8,
    equipSlot: "head",
    equipStats: { attack: 0, strength: 0, defence: 3 },
  },
  {
    id: "bronze-platebody",
    name: "Bronze Platebody",
    icon: "bronze-platebody",
    category: "equipment",
    stackable: false,
    sellValue: 20,
    equipSlot: "body",
    equipStats: { attack: 0, strength: 0, defence: 7 },
  },
  {
    id: "bronze-platelegs",
    name: "Bronze Platelegs",
    icon: "bronze-platelegs",
    category: "equipment",
    stackable: false,
    sellValue: 16,
    equipSlot: "legs",
    equipStats: { attack: 0, strength: 0, defence: 5 },
  },
  {
    id: "bronze-shield",
    name: "Bronze Shield",
    icon: "bronze-shield",
    category: "equipment",
    stackable: false,
    sellValue: 12,
    equipSlot: "shield",
    equipStats: { attack: 0, strength: 0, defence: 4 },
  },
];

// ---------------------------------------------------------------------------
// Equipment — Iron tier
// ---------------------------------------------------------------------------

const IRON_EQUIPMENT: ItemDef[] = [
  {
    id: "iron-sword",
    name: "Iron Sword",
    icon: "iron-sword",
    category: "equipment",
    stackable: false,
    sellValue: 28,
    equipSlot: "weapon",
    equipStats: { attack: 8, strength: 6, defence: 0 },
  },
  {
    id: "iron-dagger",
    name: "Iron Dagger",
    icon: "iron-dagger",
    category: "equipment",
    stackable: false,
    sellValue: 18,
    equipSlot: "weapon",
    equipStats: { attack: 5, strength: 4, defence: 0 },
  },
  {
    id: "iron-helm",
    name: "Iron Helm",
    icon: "iron-helm",
    category: "equipment",
    stackable: false,
    sellValue: 22,
    equipSlot: "head",
    equipStats: { attack: 0, strength: 0, defence: 6 },
  },
  {
    id: "iron-platebody",
    name: "Iron Platebody",
    icon: "iron-platebody",
    category: "equipment",
    stackable: false,
    sellValue: 56,
    equipSlot: "body",
    equipStats: { attack: 0, strength: 0, defence: 14 },
  },
  {
    id: "iron-platelegs",
    name: "Iron Platelegs",
    icon: "iron-platelegs",
    category: "equipment",
    stackable: false,
    sellValue: 42,
    equipSlot: "legs",
    equipStats: { attack: 0, strength: 0, defence: 10 },
  },
  {
    id: "iron-shield",
    name: "Iron Shield",
    icon: "iron-shield",
    category: "equipment",
    stackable: false,
    sellValue: 32,
    equipSlot: "shield",
    equipStats: { attack: 0, strength: 0, defence: 8 },
  },
];

// ---------------------------------------------------------------------------
// Miscellaneous (combat drops, quest items)
// ---------------------------------------------------------------------------

const MISC: ItemDef[] = [
  {
    id: "bones",
    name: "Bones",
    icon: "bones",
    category: "resource",
    stackable: true,
    sellValue: 1,
  },
  {
    id: "feathers",
    name: "Feathers",
    icon: "feathers",
    category: "resource",
    stackable: true,
    sellValue: 1,
  },
  {
    id: "rat-tail",
    name: "Rat Tail",
    icon: "rat-tail",
    category: "quest",
    stackable: true,
    sellValue: 0,
  },
  {
    id: "spider-silk",
    name: "Spider Silk",
    icon: "spider-silk",
    category: "resource",
    stackable: true,
    sellValue: 3,
  },
  {
    id: "wolf-pelt",
    name: "Wolf Pelt",
    icon: "wolf-pelt",
    category: "resource",
    stackable: true,
    sellValue: 12,
  },
  {
    id: "troll-hide",
    name: "Troll Hide",
    icon: "troll-hide",
    category: "resource",
    stackable: true,
    sellValue: 25,
  },
  {
    id: "guardian-crest",
    name: "Guardian's Crest",
    icon: "guardian-crest",
    category: "quest",
    stackable: false,
    sellValue: 0,
  },
  {
    id: "raw-meat",
    name: "Raw Meat",
    icon: "raw-meat",
    category: "resource",
    stackable: true,
    sellValue: 2,
  },
];

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const ALL_ITEMS: ItemDef[] = [
  ...RESOURCES,
  ...FOOD,
  ...TOOLS,
  ...BRONZE_EQUIPMENT,
  ...IRON_EQUIPMENT,
  ...MISC,
];

/** Master item registry keyed by item ID. */
export const ITEMS: Record<ItemId, ItemDef> = Object.fromEntries(
  ALL_ITEMS.map((item) => [item.id, item]),
);

/** Look up an item definition by ID. Returns undefined if not found. */
export function getItem(id: ItemId): ItemDef | undefined {
  return ITEMS[id];
}
