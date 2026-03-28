import type {
  GameMap,
  MapIndex,
  MapObject,
  GroundCell,
  WallEdge,
  GameMapV2,
  MapIndexV2,
  GroundCellV2,
  MapStatic,
} from "./types.js";
import {
  TERRAIN_TO_TILE_ID,
  TILE_ID_TO_TERRAIN,
  getLandTile,
  hasFlag,
  TileFlag,
} from "./tile-data.js";
import { STATIC_TILES } from "./static-registry.js";

const CURRENT_MAP_VERSION = 2;

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/** Load a GameMapV2 from a URL (fetches JSON, migrates V1 if needed). */
export async function loadMap(url: string): Promise<GameMapV2> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load map: ${res.status} ${res.statusText}`);
  const raw = await res.json();
  return migrateMap(raw);
}

/** Migrate a raw JSON object to V2 format. */
function migrateMap(raw: Record<string, unknown>): GameMapV2 {
  const meta = raw.meta as { name: string; version: number; width: number; height: number };
  if (!meta || typeof meta.version !== "number") {
    throw new Error("Invalid map file: missing meta.version");
  }
  if (meta.version > CURRENT_MAP_VERSION) {
    throw new Error(`Map version ${meta.version} is newer than supported (${CURRENT_MAP_VERSION})`);
  }
  if (meta.version === 1) {
    return migrateV1toV2(raw as unknown as GameMap);
  }
  return raw as unknown as GameMapV2;
}

/** Convert a V1 GameMap to V2 format. */
export function migrateV1toV2(map: GameMap): GameMapV2 {
  const { width, height, name } = map.meta;

  // Convert ground layer: terrain string -> tileId number
  const ground: GroundCellV2[][] = [];
  for (let row = 0; row < height; row++) {
    const rowData: GroundCellV2[] = [];
    for (let col = 0; col < width; col++) {
      const cell = map.ground[row]?.[col];
      const terrain = cell?.terrain ?? "grass";
      const tileId = TERRAIN_TO_TILE_ID[terrain] ?? 0;
      const elevation = cell?.elevation ?? 0;
      rowData.push({ tileId, elevation });
    }
    ground.push(rowData);
  }

  const statics: MapStatic[] = [];

  // Convert objects -> statics
  for (const obj of map.objects) {
    const staticDef = STATIC_TILES[obj.typeId];
    const flags = staticDef?.flags ?? (obj.blocking ? TileFlag.Impassable : TileFlag.None);
    statics.push({
      col: obj.col,
      row: obj.row,
      z: 0,
      staticId: obj.typeId,
      flags,
      interaction: obj.interaction,
    });
  }

  // Convert walls -> statics with edge
  for (const wall of map.walls) {
    const staticDef = STATIC_TILES[wall.wallTypeId];
    const flags = staticDef?.flags ?? TileFlag.Impassable | TileFlag.Wall;
    statics.push({
      col: wall.col,
      row: wall.row,
      z: 0,
      staticId: wall.wallTypeId,
      flags,
      edge: wall.edge,
    });
  }

  return {
    meta: { name, version: 2, width, height },
    ground,
    statics,
    spawnZones: map.spawnZones,
  };
}

// ---------------------------------------------------------------------------
// V2 Indexing
// ---------------------------------------------------------------------------

/** Build runtime index from a GameMapV2. */
export function indexMapV2(map: GameMapV2): MapIndexV2 {
  const staticGrid = new Map<string, MapStatic[]>();

  for (const s of map.statics) {
    const k = staticKey(s.col, s.row);
    let list = staticGrid.get(k);
    if (!list) {
      list = [];
      staticGrid.set(k, list);
    }
    list.push(s);
  }

  // Sort each cell's statics for draw order:
  // 1. Background flag lowers priority (-1)
  // 2. Nonzero height raises priority (+1)
  // 3. z ascending
  for (const list of staticGrid.values()) {
    list.sort((a, b) => {
      let az = a.z;
      let bz = b.z;
      if (hasFlag(a.flags, TileFlag.Background)) az -= 1;
      if (hasFlag(b.flags, TileFlag.Background)) bz -= 1;
      const aDef = STATIC_TILES[a.staticId];
      const bDef = STATIC_TILES[b.staticId];
      if (aDef && aDef.height > 0) az += 1;
      if (bDef && bDef.height > 0) bz += 1;
      return az - bz;
    });
  }

  return { map, staticGrid };
}

// ---------------------------------------------------------------------------
// V2 Accessors
// ---------------------------------------------------------------------------

/** Get the V2 ground cell at (col, row). */
export function getGroundV2(map: GameMapV2, col: number, row: number): GroundCellV2 | undefined {
  if (row < 0 || row >= map.meta.height) return undefined;
  const rowData = map.ground[row];
  if (!rowData || col < 0 || col >= map.meta.width) return undefined;
  const cell = rowData[col];
  if (!cell) return undefined;
  // Minified JSON may omit elevation when 0 — normalize here
  if (cell.elevation === undefined) (cell as any).elevation = 0;
  return cell;
}

/**
 * Get the raw elevation at (col, row), clamped to map bounds.
 * Used for heightmap vertex construction (stretched land corner sampling).
 */
export function getElevationAt(map: GameMapV2, col: number, row: number): number {
  const clampedCol = Math.max(0, Math.min(col, map.meta.width - 1));
  const clampedRow = Math.max(0, Math.min(row, map.meta.height - 1));
  const cell = map.ground[clampedRow]?.[clampedCol];
  if (!cell) return 0;
  return cell.elevation ?? 0;
}

/** Get all statics at (col, row). */
export function getStaticsAt(index: MapIndexV2, col: number, row: number): MapStatic[] {
  return index.staticGrid.get(staticKey(col, row)) ?? [];
}

/** Check if a tile is walkable using V2 flag-based checks. */
export function isWalkableV2(index: MapIndexV2, col: number, row: number): boolean {
  const ground = getGroundV2(index.map, col, row);
  if (!ground) return false;

  // Check land tile flags
  const landTile = getLandTile(ground.tileId);
  if (landTile && hasFlag(landTile.flags, TileFlag.Impassable)) return false;

  // Check statics for Impassable (skip wall statics — they block via edges, not tiles)
  const statics = getStaticsAt(index, col, row);
  for (const s of statics) {
    if (s.edge) continue; // Wall statics block via edge checks, not tile walkability
    if (hasFlag(s.flags, TileFlag.Impassable)) return false;
  }

  return true;
}

/** Check if a wall static exists on a specific tile edge (V2). */
export function hasWallV2(index: MapIndexV2, col: number, row: number, edge: WallEdge): boolean {
  const statics = getStaticsAt(index, col, row);
  for (const s of statics) {
    if (s.edge === edge && hasFlag(s.flags, TileFlag.Wall)) return true;
  }
  return false;
}

/** Check if movement from (col, row) in a direction is blocked by a wall (V2). */
export function isWallBlockedV2(
  index: MapIndexV2,
  col: number,
  row: number,
  dc: number,
  dr: number,
): boolean {
  if (dc === 0 && dr === -1) {
    return hasWallV2(index, col, row, "north") || hasWallV2(index, col, row - 1, "south");
  }
  if (dc === 0 && dr === 1) {
    return hasWallV2(index, col, row, "south") || hasWallV2(index, col, row + 1, "north");
  }
  if (dc === 1 && dr === 0) {
    return hasWallV2(index, col, row, "east") || hasWallV2(index, col + 1, row, "west");
  }
  if (dc === -1 && dr === 0) {
    return hasWallV2(index, col, row, "west") || hasWallV2(index, col - 1, row, "east");
  }
  return false;
}

// ---------------------------------------------------------------------------
// Legacy V1 API (still used by existing consumers, delegates to V2 internally)
// ---------------------------------------------------------------------------

/** @deprecated Use loadMap() which now returns GameMapV2. */
export function indexMap(map: GameMap): MapIndex {
  const { width, height } = map.meta;

  const objectGrid: (MapObject | null)[][] = [];
  for (let row = 0; row < height; row++) {
    objectGrid[row] = Array.from({ length: width }, () => null);
  }
  for (const obj of map.objects) {
    if (obj.row >= 0 && obj.row < height && obj.col >= 0 && obj.col < width) {
      objectGrid[obj.row]![obj.col] = obj;
    }
  }

  const wallSet = new Set<string>();
  for (const wall of map.walls) {
    wallSet.add(wallKey(wall.col, wall.row, wall.edge));
  }

  return { map, objectGrid, wallSet };
}

/** Get the ground cell at (col, row). Returns undefined if out of bounds. */
export function getGround(
  map: GameMap | GameMapV2,
  col: number,
  row: number,
): GroundCell | undefined {
  if (row < 0 || row >= map.meta.height) return undefined;
  const rowData = map.ground[row];
  if (!rowData || col < 0 || col >= map.meta.width) return undefined;
  const cell = rowData[col];
  if (!cell) return undefined;

  // V2 cell — convert tileId back to terrain string
  if ("tileId" in cell) {
    const terrain = TILE_ID_TO_TERRAIN[cell.tileId] ?? "grass";
    return { terrain, elevation: cell.elevation as 0 | 1 | 2 | 3 };
  }

  return cell as GroundCell;
}

/** Get the object at (col, row), or null. */
export function getObject(
  index: MapIndex | MapIndexV2,
  col: number,
  row: number,
): MapObject | null {
  if ("objectGrid" in index) {
    // V1 index
    if (row < 0 || row >= index.map.meta.height) return null;
    if (col < 0 || col >= index.map.meta.width) return null;
    return index.objectGrid[row]?.[col] ?? null;
  }
  // V2 index — find the first non-wall static with an interaction or blocking behavior
  const statics = getStaticsAt(index, col, row);
  for (const s of statics) {
    if (s.edge) continue; // Skip wall statics
    // Convert MapStatic back to MapObject shape
    return {
      col: s.col,
      row: s.row,
      typeId: s.staticId,
      blocking: hasFlag(s.flags, TileFlag.Impassable),
      interaction: s.interaction,
    };
  }
  return null;
}

/** Check if a tile is walkable (considers ground terrain + blocking objects). */
export function isWalkable(index: MapIndex | MapIndexV2, col: number, row: number): boolean {
  if ("staticGrid" in index) {
    return isWalkableV2(index, col, row);
  }

  const ground = getGround(index.map, col, row);
  if (!ground) return false;
  if (ground.terrain === "water") return false;
  const obj = getObject(index, col, row);
  if (obj?.blocking) return false;
  return true;
}

/** Check if a wall exists on a specific tile edge. */
export function hasWall(
  index: MapIndex | MapIndexV2,
  col: number,
  row: number,
  edge: WallEdge,
): boolean {
  if ("staticGrid" in index) {
    return hasWallV2(index, col, row, edge);
  }
  return index.wallSet.has(wallKey(col, row, edge));
}

/** Check if movement from (col, row) in a direction is blocked by a wall. */
export function isWallBlocked(
  index: MapIndex | MapIndexV2,
  col: number,
  row: number,
  dc: number,
  dr: number,
): boolean {
  if ("staticGrid" in index) {
    return isWallBlockedV2(index, col, row, dc, dr);
  }

  if (dc === 0 && dr === -1) {
    return hasWall(index, col, row, "north") || hasWall(index, col, row - 1, "south");
  }
  if (dc === 0 && dr === 1) {
    return hasWall(index, col, row, "south") || hasWall(index, col, row + 1, "north");
  }
  if (dc === 1 && dr === 0) {
    return hasWall(index, col, row, "east") || hasWall(index, col + 1, row, "west");
  }
  if (dc === -1 && dr === 0) {
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

function staticKey(col: number, row: number): string {
  return `${col},${row}`;
}
