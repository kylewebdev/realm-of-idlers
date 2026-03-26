import type { ObjectTypeId } from "./types.js";

export interface ObjectTypeDef {
  typeId: ObjectTypeId;
  label: string;
  category: "tree" | "rock" | "structure" | "decoration" | "fishing";
  sprite: string | null;
  width: number;
  height: number;
  fallbackColor: number;
  defaultBlocking: boolean;
}

export const OBJECT_TYPES: Record<ObjectTypeId, ObjectTypeDef> = {
  // Trees
  "normal-tree": {
    typeId: "normal-tree",
    label: "Tree",
    category: "tree",
    sprite: "normal-tree",
    width: 1.0,
    height: 1.4,
    fallbackColor: 0x2d8a4e,
    defaultBlocking: true,
  },
  "oak-tree": {
    typeId: "oak-tree",
    label: "Oak Tree",
    category: "tree",
    sprite: "oak-tree",
    width: 1.2,
    height: 1.6,
    fallbackColor: 0x1b5e30,
    defaultBlocking: true,
  },

  // Ore rocks
  "copper-rock": {
    typeId: "copper-rock",
    label: "Copper Rock",
    category: "rock",
    sprite: "copper-rock",
    width: 0.7,
    height: 0.7,
    fallbackColor: 0xc87533,
    defaultBlocking: true,
  },
  "tin-rock": {
    typeId: "tin-rock",
    label: "Tin Rock",
    category: "rock",
    sprite: "tin-rock",
    width: 0.7,
    height: 0.7,
    fallbackColor: 0xb0b0b0,
    defaultBlocking: true,
  },
  "iron-rock": {
    typeId: "iron-rock",
    label: "Iron Rock",
    category: "rock",
    sprite: "iron-rock",
    width: 0.7,
    height: 0.7,
    fallbackColor: 0x6b3a2a,
    defaultBlocking: true,
  },

  // Structures
  shop: {
    typeId: "shop",
    label: "General Store",
    category: "structure",
    sprite: "shop",
    width: 1.0,
    height: 1.2,
    fallbackColor: 0xcccc33,
    defaultBlocking: true,
  },
  bank: {
    typeId: "bank",
    label: "Bank",
    category: "structure",
    sprite: "bank",
    width: 1.0,
    height: 1.2,
    fallbackColor: 0xdaa520,
    defaultBlocking: true,
  },
  forge: {
    typeId: "forge",
    label: "Forge",
    category: "structure",
    sprite: "forge",
    width: 1.0,
    height: 1.2,
    fallbackColor: 0xff6633,
    defaultBlocking: true,
  },
  "cooking-range": {
    typeId: "cooking-range",
    label: "Cooking Range",
    category: "structure",
    sprite: "cooking-range",
    width: 1.0,
    height: 1.2,
    fallbackColor: 0xcc6644,
    defaultBlocking: true,
  },

  // Fishing spots
  "fishing-spot-shrimp": {
    typeId: "fishing-spot-shrimp",
    label: "Fishing Spot",
    category: "fishing",
    sprite: "fishing-spot-shrimp",
    width: 0.6,
    height: 0.5,
    fallbackColor: 0x5599cc,
    defaultBlocking: true,
  },
  "fishing-spot-trout": {
    typeId: "fishing-spot-trout",
    label: "Fishing Spot (Trout)",
    category: "fishing",
    sprite: "fishing-spot-trout",
    width: 0.7,
    height: 0.6,
    fallbackColor: 0x3377aa,
    defaultBlocking: true,
  },
};

export function getObjectType(typeId: ObjectTypeId): ObjectTypeDef | undefined {
  return OBJECT_TYPES[typeId];
}
