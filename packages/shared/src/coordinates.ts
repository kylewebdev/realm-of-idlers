import type { TileCoord, WorldPosition } from "./types";
import { ELEV_SCALE } from "./constants";

/**
 * Convert tile grid coordinates to 3D world position.
 *
 * Uses Three.js conventions: X/Z for the ground plane, Y for elevation.
 * Each tile is 1 world unit. The isometric look comes from the camera angle,
 * not from the coordinate math. Elevation is scaled by ELEV_SCALE to
 * produce the Y offset for terrain height.
 */
export function tileToWorld(col: number, row: number, elevation = 0): WorldPosition {
  return {
    x: col,
    y: elevation * ELEV_SCALE,
    z: row,
  };
}

/**
 * Convert 3D world position back to tile grid coordinates.
 */
export function worldToTile(pos: WorldPosition): TileCoord {
  return {
    col: Math.round(pos.x),
    row: Math.round(pos.z),
  };
}
