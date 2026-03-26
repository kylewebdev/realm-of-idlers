// Legacy types (used during migration)
export type {
  TileData,
  TileMap,
  BriarwoodMap,
  ResourceNodeDef,
  SpawnZone,
  StructureType,
  ChunkCoord,
} from "./types.js";

// New two-layer types
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
} from "./types.js";

// Legacy map (used during migration)
export { createBriarwoodMap, getTile } from "./briarwood.js";
export { isWalkable as isWalkableLegacy } from "./briarwood.js";

// New map loader
export {
  loadMap,
  indexMap,
  getGround,
  getObject,
  isWalkable,
  hasWall,
  isWallBlocked,
} from "./map-loader.js";

// Object & wall registries
export { OBJECT_TYPES, getObjectType } from "./object-registry.js";
export type { ObjectTypeDef } from "./object-registry.js";
export { WALL_TYPES, getWallType } from "./wall-registry.js";
export type { WallTypeDef } from "./wall-registry.js";

// Pathfinding
export { findPath, findPathToAdjacent } from "./pathfinding.js";

// Chunks
export { tileToChunk, getChunkTiles, getVisibleChunks } from "./chunks.js";

// Renderer (Three.js)
export { ChunkRenderer } from "./renderer.js";

// Screen picking (Three.js)
export { screenToTile } from "./screen-pick.js";
