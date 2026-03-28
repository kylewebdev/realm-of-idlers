// Types
export type {
  GroundCell,
  ObjectTypeId,
  ObjectInteraction,
  MapObject,
  WallEdge,
  WallTypeId,
  EdgeWall,
  MapSpawnZone,
  GameMap,
  MapIndex,
  GroundCellV2,
  MapStatic,
  GameMapV2,
  MapIndexV2,
} from "./types.js";

// Map loader
export {
  loadMap,
  getGround,
  getObject,
  isWalkable,
  migrateV1toV2,
  indexMapV2,
  getGroundV2,
  getStaticsAt,
  isWalkableV2,
  hasWallV2,
  isWallBlockedV2,
  getElevationAt,
} from "./map-loader.js";

// Tile data + static registries
export {
  TileFlag,
  LAND_TILES,
  TERRAIN_TO_TILE_ID,
  TILE_ID_TO_TERRAIN,
  hasFlag,
  getLandTile,
} from "./tile-data.js";
export type { TileFlags, LandTileDef } from "./tile-data.js";
export { STATIC_TILES, getStaticTile } from "./static-registry.js";
export type { StaticTileDef } from "./static-registry.js";

// Multi/Prefab
export { MULTI_DEFS, expandMulti } from "./multi.js";
export type { MultiDef, MultiComponent } from "./multi.js";

// Pathfinding
export { findPath, findPathToAdjacent } from "./pathfinding.js";

// Chunks
export { tileToChunk, getChunkTiles, getVisibleChunks } from "./chunks.js";

// Renderer (Three.js)
export { ChunkRenderer } from "./renderer.js";

// Screen picking (Three.js)
export { screenToTile } from "./screen-pick.js";
