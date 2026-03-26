import type { WallTypeId } from "./types.js";

export interface WallTypeDef {
  wallTypeId: WallTypeId;
  label: string;
  sprite: string | null;
  height: number;
  fallbackColor: number;
}

export const WALL_TYPES: Record<WallTypeId, WallTypeDef> = {
  "stone-wall": {
    wallTypeId: "stone-wall",
    label: "Stone Wall",
    sprite: null,
    height: 1.0,
    fallbackColor: 0x888888,
  },
  "wooden-wall": {
    wallTypeId: "wooden-wall",
    label: "Wooden Wall",
    sprite: null,
    height: 1.0,
    fallbackColor: 0x8b7355,
  },
  fence: {
    wallTypeId: "fence",
    label: "Fence",
    sprite: null,
    height: 0.5,
    fallbackColor: 0x6b5640,
  },
};

export function getWallType(wallTypeId: WallTypeId): WallTypeDef | undefined {
  return WALL_TYPES[wallTypeId];
}
