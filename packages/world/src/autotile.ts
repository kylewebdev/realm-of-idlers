import type { GameMapV2 } from "./types.js";

/**
 * 4-bit bitmask autotile system.
 * Checks N/E/S/W neighbors for same tile type to produce a mask 0-15.
 * Each mask maps to a sprite variant for terrain transitions.
 *
 * Bit layout:
 *   bit 0 (1)  = North same
 *   bit 1 (2)  = East same
 *   bit 2 (4)  = South same
 *   bit 3 (8)  = West same
 */

/** Compute the 4-bit autotile mask for a ground cell. */
export function computeAutotileMask(map: GameMapV2, col: number, row: number): number {
  const cell = map.ground[row]?.[col];
  if (!cell) return 0;
  const tileId = cell.tileId;

  let mask = 0;

  // North
  if (row > 0 && map.ground[row - 1]?.[col]?.tileId === tileId) mask |= 1;
  // East
  if (col < map.meta.width - 1 && map.ground[row]?.[col + 1]?.tileId === tileId) mask |= 2;
  // South
  if (row < map.meta.height - 1 && map.ground[row + 1]?.[col]?.tileId === tileId) mask |= 4;
  // West
  if (col > 0 && map.ground[row]?.[col - 1]?.tileId === tileId) mask |= 8;

  return mask;
}

/** Get the autotile sprite variant name for a base sprite and mask. */
export function getAutotileSprite(baseSprite: string, mask: number): string {
  return `${baseSprite}_${mask}`;
}
