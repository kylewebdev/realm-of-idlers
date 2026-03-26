import type { DecorationId, NodeId, TerrainType, TileCoord } from "@realm-of-idlers/shared";

export type StructureType = "forge" | "shop" | "bank" | "cooking-range";

export interface ResourceNodeDef {
  activityId: string;
  nodeId: NodeId;
}

export interface SpawnZone {
  monsterId: string;
  tiles: TileCoord[];
}

export interface TileData {
  terrain: TerrainType;
  elevation: 0 | 1 | 2 | 3;
  walkable: boolean;
  resourceNode?: ResourceNodeDef;
  decoration?: DecorationId;
  structure?: StructureType;
}

export type TileMap = TileData[][];

export interface ChunkCoord {
  chunkCol: number;
  chunkRow: number;
}

export interface BriarwoodMap {
  tiles: TileMap;
  spawnZones: SpawnZone[];
}
