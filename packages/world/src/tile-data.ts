import type { TerrainType } from "@realm-of-idlers/shared";

export const TileFlag = {
  None: 0,
  Impassable: 1 << 0,
  Wet: 1 << 1,
  Surface: 1 << 2,
  Wall: 1 << 3,
  Bridge: 1 << 4,
  Roof: 1 << 5,
  Foliage: 1 << 6,
  Door: 1 << 7,
  Background: 1 << 8,
  Interactable: 1 << 9,
} as const;

export type TileFlags = number;

export interface LandTileDef {
  tileId: number;
  name: string;
  legacyTerrain: TerrainType;
  flags: TileFlags;
  sprite: string;
  fallbackColor: number;
  cliffColor: number;
}

export const LAND_TILES: Record<number, LandTileDef> = {
  0: {
    tileId: 0,
    name: "Grass",
    legacyTerrain: "grass",
    flags: TileFlag.None,
    sprite: "grass",
    fallbackColor: 0x4a7c3f,
    cliffColor: 0x3a6230,
  },
  1: {
    tileId: 1,
    name: "Dirt",
    legacyTerrain: "dirt",
    flags: TileFlag.None,
    sprite: "dirt",
    fallbackColor: 0x8b7355,
    cliffColor: 0x6b5640,
  },
  2: {
    tileId: 2,
    name: "Stone",
    legacyTerrain: "stone",
    flags: TileFlag.None,
    sprite: "stone",
    fallbackColor: 0x888888,
    cliffColor: 0x666666,
  },
  3: {
    tileId: 3,
    name: "Water",
    legacyTerrain: "water",
    flags: TileFlag.Impassable | TileFlag.Wet,
    sprite: "water",
    fallbackColor: 0x3a6ea5,
    cliffColor: 0x2a5580,
  },
  4: {
    tileId: 4,
    name: "Sand",
    legacyTerrain: "sand",
    flags: TileFlag.None,
    sprite: "sand",
    fallbackColor: 0xc2b280,
    cliffColor: 0x9a8e60,
  },
  5: {
    tileId: 5,
    name: "Forest",
    legacyTerrain: "forest",
    flags: TileFlag.None,
    sprite: "forest",
    fallbackColor: 0x2d5a1e,
    cliffColor: 0x1e3d14,
  },
  6: {
    tileId: 6,
    name: "Jungle",
    legacyTerrain: "jungle",
    flags: TileFlag.None,
    sprite: "jungle",
    fallbackColor: 0x1a5c2a,
    cliffColor: 0x12401e,
  },
  7: {
    tileId: 7,
    name: "Snow",
    legacyTerrain: "snow",
    flags: TileFlag.None,
    sprite: "snow",
    fallbackColor: 0xe8e8e8,
    cliffColor: 0xc0c0c0,
  },
  8: {
    tileId: 8,
    name: "Cave",
    legacyTerrain: "cave",
    flags: TileFlag.None,
    sprite: "cave",
    fallbackColor: 0x4a4a4a,
    cliffColor: 0x333333,
  },
  9: {
    tileId: 9,
    name: "Brick",
    legacyTerrain: "brick",
    flags: TileFlag.None,
    sprite: "brick",
    fallbackColor: 0x8b4513,
    cliffColor: 0x6b3410,
  },
  10: {
    tileId: 10,
    name: "Sandstone",
    legacyTerrain: "sandstone",
    flags: TileFlag.None,
    sprite: "sandstone",
    fallbackColor: 0xd2a679,
    cliffColor: 0xb08860,
  },
  11: {
    tileId: 11,
    name: "Wood",
    legacyTerrain: "wood",
    flags: TileFlag.None,
    sprite: "wood",
    fallbackColor: 0x8b6914,
    cliffColor: 0x6b5010,
  },
  12: {
    tileId: 12,
    name: "Tile",
    legacyTerrain: "tile",
    flags: TileFlag.None,
    sprite: "tile",
    fallbackColor: 0xa0856c,
    cliffColor: 0x806a55,
  },
  13: {
    tileId: 13,
    name: "Farmland",
    legacyTerrain: "farmland",
    flags: TileFlag.None,
    sprite: "farmland",
    fallbackColor: 0x6b4226,
    cliffColor: 0x4d301c,
  },
  14: {
    tileId: 14,
    name: "Lava",
    legacyTerrain: "lava",
    flags: TileFlag.Impassable,
    sprite: "lava",
    fallbackColor: 0xcc3300,
    cliffColor: 0x992200,
  },
  15: {
    tileId: 15,
    name: "Cobblestones",
    legacyTerrain: "cobblestones",
    flags: TileFlag.None,
    sprite: "cobblestones",
    fallbackColor: 0x5a5550,
    cliffColor: 0x444040,
  },
  16: {
    tileId: 16,
    name: "Marble",
    legacyTerrain: "marble",
    flags: TileFlag.None,
    sprite: "marble",
    fallbackColor: 0xc0b8b0,
    cliffColor: 0x908880,
  },
  17: {
    tileId: 17,
    name: "Flagstone",
    legacyTerrain: "flagstone",
    flags: TileFlag.None,
    sprite: "flagstone",
    fallbackColor: 0x908070,
    cliffColor: 0x706050,
  },
};

export const TERRAIN_TO_TILE_ID: Record<TerrainType, number> = {
  grass: 0,
  dirt: 1,
  stone: 2,
  water: 3,
  sand: 4,
  forest: 5,
  jungle: 6,
  snow: 7,
  cave: 8,
  brick: 9,
  cobblestones: 15,
  sandstone: 10,
  wood: 11,
  tile: 12,
  farmland: 13,
  lava: 14,
  marble: 16,
  flagstone: 17,
};

export const TILE_ID_TO_TERRAIN: Record<number, TerrainType> = {
  0: "grass",
  1: "dirt",
  2: "stone",
  3: "water",
  4: "sand",
  5: "forest",
  6: "jungle",
  7: "snow",
  8: "cave",
  9: "brick",
  10: "sandstone",
  11: "wood",
  12: "tile",
  13: "farmland",
  14: "lava",
  15: "cobblestones",
  16: "marble",
  17: "flagstone",
};

export function hasFlag(flags: TileFlags, flag: number): boolean {
  return (flags & flag) !== 0;
}

export function getLandTile(tileId: number): LandTileDef | undefined {
  return LAND_TILES[tileId];
}
