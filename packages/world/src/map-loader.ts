import type { GameMap, MapIndex, MapObject, GroundCell, WallEdge } from "./types.js";

const CURRENT_MAP_VERSION = 1;

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/** Load a GameMap from a URL (fetches JSON). */
export async function loadMap(url: string): Promise<GameMap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load map: ${res.status} ${res.statusText}`);
  const raw = await res.json();
  return migrateMap(raw);
}

/** Migrate a raw JSON object to the current map version. */
function migrateMap(raw: Record<string, unknown>): GameMap {
  const meta = raw.meta as GameMap["meta"];
  if (!meta || typeof meta.version !== "number") {
    throw new Error("Invalid map file: missing meta.version");
  }
  // Future migrations go here
  if (meta.version > CURRENT_MAP_VERSION) {
    throw new Error(`Map version ${meta.version} is newer than supported (${CURRENT_MAP_VERSION})`);
  }
  return raw as unknown as GameMap;
}

// ---------------------------------------------------------------------------
// Indexing — build fast lookup structures
// ---------------------------------------------------------------------------

/** Build runtime index from a loaded GameMap. */
export function indexMap(map: GameMap): MapIndex {
  const { width, height } = map.meta;

  // Build sparse object grid
  const objectGrid: (MapObject | null)[][] = [];
  for (let row = 0; row < height; row++) {
    objectGrid[row] = new Array(width).fill(null);
  }
  for (const obj of map.objects) {
    if (obj.row >= 0 && obj.row < height && obj.col >= 0 && obj.col < width) {
      objectGrid[obj.row]![obj.col] = obj;
    }
  }

  // Build wall set for O(1) lookups
  const wallSet = new Set<string>();
  for (const wall of map.walls) {
    wallSet.add(wallKey(wall.col, wall.row, wall.edge));
  }

  return { map, objectGrid, wallSet };
}

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

/** Get the ground cell at (col, row). Returns undefined if out of bounds. */
export function getGround(map: GameMap, col: number, row: number): GroundCell | undefined {
  if (row < 0 || row >= map.meta.height) return undefined;
  const rowData = map.ground[row];
  if (!rowData || col < 0 || col >= map.meta.width) return undefined;
  return rowData[col];
}

/** Get the object at (col, row), or null. */
export function getObject(index: MapIndex, col: number, row: number): MapObject | null {
  if (row < 0 || row >= index.map.meta.height) return null;
  if (col < 0 || col >= index.map.meta.width) return null;
  return index.objectGrid[row]?.[col] ?? null;
}

/** Check if a tile is walkable (considers ground terrain + blocking objects). */
export function isWalkable(index: MapIndex, col: number, row: number): boolean {
  const ground = getGround(index.map, col, row);
  if (!ground) return false;
  // Water terrain is never walkable
  if (ground.terrain === "water") return false;
  // Check for blocking object
  const obj = getObject(index, col, row);
  if (obj?.blocking) return false;
  return true;
}

/** Check if a wall exists on a specific tile edge. */
export function hasWall(index: MapIndex, col: number, row: number, edge: WallEdge): boolean {
  return index.wallSet.has(wallKey(col, row, edge));
}

/**
 * Check if movement from (col, row) in a direction is blocked by a wall.
 * Checks both sides of the edge (wall on source tile or destination tile).
 */
export function isWallBlocked(
  index: MapIndex,
  col: number,
  row: number,
  dc: number,
  dr: number,
): boolean {
  if (dc === 0 && dr === -1) {
    // Moving north
    return hasWall(index, col, row, "north") || hasWall(index, col, row - 1, "south");
  }
  if (dc === 0 && dr === 1) {
    // Moving south
    return hasWall(index, col, row, "south") || hasWall(index, col, row + 1, "north");
  }
  if (dc === 1 && dr === 0) {
    // Moving east
    return hasWall(index, col, row, "east") || hasWall(index, col + 1, row, "west");
  }
  if (dc === -1 && dr === 0) {
    // Moving west
    return hasWall(index, col, row, "west") || hasWall(index, col - 1, row, "east");
  }
  return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wallKey(col: number, row: number, edge: WallEdge): string {
  return `${col},${row},${edge}`;
}
