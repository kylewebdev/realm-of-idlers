import { MAP_SIZE } from "@realm-of-idlers/shared";
import type { BriarwoodMap, TileData, TileMap } from "./types.js";

/**
 * Create the Briarwood map — a 64×64 tile world.
 *
 * Layout:
 * - Water border (1-tile ring)
 * - Town center (~10×10 at col/row 27-36)
 * - NW forest: normal trees (col 3-25, row 3-25)
 * - NE forest: oak trees (col 38-60, row 3-25)
 * - East mining: ore nodes (col 45-60, row 28-45), elevation 1-2
 * - South river/lake: water (row 48-52), fishing spots on edges
 * - Dirt paths connecting zones
 * - Monster spawn zones graduated by distance from town
 */
export function createBriarwoodMap(): BriarwoodMap {
  const tiles = createBaseTerrain();
  carveWaterBorder(tiles);
  carveTown(tiles);
  carveForests(tiles);
  carveMiningArea(tiles);
  carveRiver(tiles);
  carvePaths(tiles);

  const spawnZones = createSpawnZones();

  return { tiles, spawnZones };
}

/** Get a tile with bounds checking. */
export function getTile(tiles: TileMap, col: number, row: number): TileData | undefined {
  if (row < 0 || row >= tiles.length) return undefined;
  const rowData = tiles[row];
  if (!rowData || col < 0 || col >= rowData.length) return undefined;
  return rowData[col];
}

/** Check if a tile is walkable. */
export function isWalkable(tiles: TileMap, col: number, row: number): boolean {
  const tile = getTile(tiles, col, row);
  return tile?.walkable ?? false;
}

// ---------------------------------------------------------------------------
// Internal map generation helpers
// ---------------------------------------------------------------------------

function createBaseTerrain(): TileMap {
  const tiles: TileMap = [];
  for (let row = 0; row < MAP_SIZE; row++) {
    const rowData: TileData[] = [];
    for (let col = 0; col < MAP_SIZE; col++) {
      rowData.push({ terrain: "grass", elevation: 0, walkable: true });
    }
    tiles.push(rowData);
  }
  return tiles;
}

function carveWaterBorder(tiles: TileMap): void {
  for (let row = 0; row < MAP_SIZE; row++) {
    for (let col = 0; col < MAP_SIZE; col++) {
      if (row < 2 || row >= MAP_SIZE - 2 || col < 2 || col >= MAP_SIZE - 2) {
        setTile(tiles, col, row, { terrain: "water", elevation: 0, walkable: false });
      }
    }
  }
}

function carveTown(tiles: TileMap): void {
  // Town center: col 27-36, row 27-36 (10×10 area)
  for (let row = 27; row <= 36; row++) {
    for (let col = 27; col <= 36; col++) {
      setTile(tiles, col, row, { terrain: "stone", elevation: 0, walkable: true });
    }
  }

  // Structures
  setTile(tiles, col(29), row(28), {
    terrain: "stone",
    elevation: 0,
    walkable: false,
    structure: "shop",
  });
  setTile(tiles, col(34), row(28), {
    terrain: "stone",
    elevation: 0,
    walkable: false,
    structure: "bank",
  });
  setTile(tiles, col(29), row(35), {
    terrain: "stone",
    elevation: 0,
    walkable: false,
    structure: "forge",
  });
  setTile(tiles, col(34), row(35), {
    terrain: "stone",
    elevation: 0,
    walkable: false,
    structure: "cooking-range",
  });
}

function carveForests(tiles: TileMap): void {
  // NW forest: normal trees (col 4-24, row 4-24)
  let nodeCounter = 0;
  for (let row = 4; row <= 24; row += 3) {
    for (let col = 4; col <= 24; col += 3) {
      setTile(tiles, col, row, {
        terrain: "grass",
        elevation: 0,
        walkable: false,
        resourceNode: { activityId: "chop-normal-tree", nodeId: `tree-normal-${nodeCounter++}` },
      });
    }
  }

  // NE forest: oak trees (col 40-58, row 4-24)
  for (let row = 4; row <= 24; row += 4) {
    for (let col = 40; col <= 58; col += 4) {
      setTile(tiles, col, row, {
        terrain: "grass",
        elevation: 0,
        walkable: false,
        resourceNode: { activityId: "chop-oak-tree", nodeId: `tree-oak-${nodeCounter++}` },
      });
    }
  }
}

function carveMiningArea(tiles: TileMap): void {
  // East mining area: col 46-58, row 28-44, elevation 1-2
  let nodeCounter = 0;
  for (let row = 28; row <= 44; row++) {
    for (let col = 46; col <= 58; col++) {
      const elev = row < 36 ? 1 : 2;
      setTile(tiles, col, row, {
        terrain: "stone",
        elevation: elev as 0 | 1 | 2 | 3,
        walkable: true,
      });
    }
  }

  // Copper nodes
  for (const [c, r] of [
    [48, 30],
    [52, 30],
    [56, 30],
    [48, 34],
    [52, 34],
  ] as const) {
    setTile(tiles, c, r, {
      terrain: "stone",
      elevation: 1,
      walkable: false,
      resourceNode: { activityId: "mine-copper", nodeId: `rock-copper-${nodeCounter++}` },
    });
  }

  // Tin nodes
  for (const [c, r] of [
    [50, 31],
    [54, 31],
    [50, 35],
  ] as const) {
    setTile(tiles, c, r, {
      terrain: "stone",
      elevation: 1,
      walkable: false,
      resourceNode: { activityId: "mine-tin", nodeId: `rock-tin-${nodeCounter++}` },
    });
  }

  // Iron nodes (deeper in)
  for (const [c, r] of [
    [48, 40],
    [52, 40],
    [56, 40],
    [50, 42],
  ] as const) {
    setTile(tiles, c, r, {
      terrain: "stone",
      elevation: 2,
      walkable: false,
      resourceNode: { activityId: "mine-iron", nodeId: `rock-iron-${nodeCounter++}` },
    });
  }
}

function carveRiver(tiles: TileMap): void {
  // South river: row 48-51, col 8-55 (water, non-walkable)
  for (let row = 48; row <= 51; row++) {
    for (let col = 8; col <= 55; col++) {
      setTile(tiles, col, row, { terrain: "water", elevation: 0, walkable: false });
    }
  }

  // Fishing spots on river edges (non-walkable entities adjacent to water)
  let nodeCounter = 0;
  for (const [c, r] of [
    [15, 47],
    [25, 47],
    [35, 47],
    [45, 47],
    [20, 52],
    [30, 52],
    [40, 52],
  ] as const) {
    setTile(tiles, c, r, {
      terrain: "grass",
      elevation: 0,
      walkable: false,
      resourceNode: { activityId: "fish-shrimp", nodeId: `fishing-${nodeCounter++}` },
    });
  }

  // Trout spots (further from town)
  for (const [c, r] of [
    [50, 47],
    [10, 52],
  ] as const) {
    setTile(tiles, c, r, {
      terrain: "grass",
      elevation: 0,
      walkable: false,
      resourceNode: { activityId: "fish-trout", nodeId: `fishing-trout-${nodeCounter++}` },
    });
  }
}

function carvePaths(tiles: TileMap): void {
  // Main east-west path through town (row 32)
  for (let col = 3; col < MAP_SIZE - 2; col++) {
    const tile = getTile(tiles, col, 32);
    if (tile && tile.terrain !== "water" && !tile.structure) {
      setTile(tiles, col, 32, { ...tile, terrain: "dirt", walkable: true });
    }
  }

  // North-south path through town (col 32)
  for (let row = 3; row < MAP_SIZE - 2; row++) {
    const tile = getTile(tiles, 32, row);
    if (tile && tile.terrain !== "water" && !tile.structure) {
      setTile(tiles, 32, row, { ...tile, terrain: "dirt", walkable: true });
    }
  }

  // Path to mining area (row 36, col 37-45)
  for (let col = 37; col <= 45; col++) {
    const tile = getTile(tiles, col, 36);
    if (tile && tile.terrain !== "water") {
      setTile(tiles, col, 36, { ...tile, terrain: "dirt", walkable: true });
    }
  }

  // Bridge crossing the river at col 31-33 (3-wide), rows 48-51
  for (let row = 48; row <= 51; row++) {
    for (let col = 31; col <= 33; col++) {
      setTile(tiles, col, row, { terrain: "dirt", elevation: 0, walkable: true });
    }
  }
}

function createSpawnZones() {
  return [
    // Near town: chickens and rats
    { monsterId: "chicken", tiles: coordRange(22, 22, 26, 26) },
    { monsterId: "rat", tiles: coordRange(37, 22, 42, 26) },
    // Mid-range: spiders, goblins
    { monsterId: "spider", tiles: coordRange(8, 8, 16, 16) },
    { monsterId: "goblin", tiles: coordRange(18, 8, 24, 14) },
    // Forest: skeletons, wolves
    { monsterId: "skeleton", tiles: coordRange(6, 16, 14, 22) },
    { monsterId: "wolf", tiles: coordRange(42, 8, 50, 16) },
    // Deep zones: bandits, dark mage, troll, guardian
    { monsterId: "bandit", tiles: coordRange(52, 8, 58, 16) },
    { monsterId: "dark-mage", tiles: coordRange(4, 4, 10, 8) },
    { monsterId: "troll", tiles: coordRange(54, 18, 60, 26) },
    { monsterId: "briarwood-guardian", tiles: coordRange(4, 38, 10, 44) },
  ];
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function setTile(tiles: TileMap, c: number, r: number, data: TileData): void {
  if (r >= 0 && r < tiles.length && c >= 0 && c < tiles[r]!.length) {
    tiles[r]![c] = data;
  }
}

/** Identity — makes town structure placements more readable. */
function col(c: number): number {
  return c;
}
function row(r: number): number {
  return r;
}

/** Generate an array of TileCoords for a rectangular region. */
function coordRange(colStart: number, rowStart: number, colEnd: number, rowEnd: number) {
  const coords = [];
  for (let r = rowStart; r <= rowEnd; r++) {
    for (let c = colStart; c <= colEnd; c++) {
      coords.push({ col: c, row: r });
    }
  }
  return coords;
}
