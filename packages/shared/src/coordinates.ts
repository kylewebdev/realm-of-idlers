import type { TileCoord, WorldPosition } from "./types";
import { TILE_SIZE } from "./constants";

/**
 * Convert tile grid coordinates to isometric world position.
 * Uses 2:1 isometric projection (classic RPG style).
 */
export function tileToWorld(col: number, row: number, elevation = 0): WorldPosition {
  const x = (col - row) * (TILE_SIZE / 2);
  const y = (col + row) * (TILE_SIZE / 4) - elevation * (TILE_SIZE / 2);
  const z = elevation;
  return { x, y, z };
}

/**
 * Convert isometric world position back to tile grid coordinates.
 * Pass the same elevation used in tileToWorld for a correct round-trip.
 */
export function worldToTile(pos: WorldPosition, elevation = 0): TileCoord {
  const adjustedY = pos.y + elevation * (TILE_SIZE / 2);
  const col = Math.round((pos.x / (TILE_SIZE / 2) + adjustedY / (TILE_SIZE / 4)) / 2);
  const row = Math.round((adjustedY / (TILE_SIZE / 4) - pos.x / (TILE_SIZE / 2)) / 2);
  return { col, row };
}
