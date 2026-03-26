import type { DecorationId, NodeId, TerrainType, TileCoord } from "@realm-of-idlers/shared";

// ---------------------------------------------------------------------------
// Legacy types (used during migration, removed in Phase 2)
// ---------------------------------------------------------------------------

export type StructureType = "forge" | "shop" | "bank" | "cooking-range";

export interface ResourceNodeDef {
  activityId: string;
  nodeId: NodeId;
}

/** @deprecated Use GameMap.spawnZones instead */
export interface SpawnZone {
  monsterId: string;
  tiles: TileCoord[];
}

/** @deprecated Use GroundCell + MapObject instead */
export interface TileData {
  terrain: TerrainType;
  elevation: 0 | 1 | 2 | 3;
  walkable: boolean;
  resourceNode?: ResourceNodeDef;
  decoration?: DecorationId;
  structure?: StructureType;
}

/** @deprecated Use GameMap instead */
export type TileMap = TileData[][];

/** @deprecated Use GameMap instead */
export interface BriarwoodMap {
  tiles: TileMap;
  spawnZones: SpawnZone[];
}

// ---------------------------------------------------------------------------
// New two-layer map types
// ---------------------------------------------------------------------------

/** Ground layer cell — terrain and elevation. Always present for every cell. */
export interface GroundCell {
  terrain: TerrainType;
  elevation: 0 | 1 | 2 | 3;
}

/** Object type identifier — references the object registry. */
export type ObjectTypeId = string;

/** Interaction attached to a placed map object. */
export type ObjectInteraction =
  | { kind: "resource"; activityId: string; nodeId: string }
  | { kind: "structure"; structureType: string };

/** A placed object on the map (tree, ore, structure, decoration). */
export interface MapObject {
  col: number;
  row: number;
  typeId: ObjectTypeId;
  blocking: boolean;
  interaction?: ObjectInteraction;
}

/** Which edge of a tile a wall sits on. */
export type WallEdge = "north" | "south" | "east" | "west";

/** Wall type identifier — references the wall registry. */
export type WallTypeId = string;

/** A wall placed on a tile edge. */
export interface EdgeWall {
  col: number;
  row: number;
  edge: WallEdge;
  wallTypeId: WallTypeId;
}

/** Spawn zone defined as a bounding rectangle. */
export interface MapSpawnZone {
  monsterId: string;
  rect: { colStart: number; rowStart: number; colEnd: number; rowEnd: number };
}

/** Root map file format. */
export interface GameMap {
  meta: {
    name: string;
    version: number;
    width: number;
    height: number;
  };
  ground: GroundCell[][];
  objects: MapObject[];
  walls: EdgeWall[];
  spawnZones: MapSpawnZone[];
}

/** Runtime index built from a GameMap for O(1) lookups. */
export interface MapIndex {
  map: GameMap;
  objectGrid: (MapObject | null)[][];
  wallSet: Set<string>;
}

export interface ChunkCoord {
  chunkCol: number;
  chunkRow: number;
}
