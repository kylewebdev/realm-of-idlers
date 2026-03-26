import type { TileCoord } from "@realm-of-idlers/shared";
import type { TileMap } from "./types.js";
import { isWalkable } from "./briarwood.js";

const DEFAULT_MAX_LENGTH = 50;

/**
 * A* pathfinding over a tile map.
 *
 * Returns an array of tile coords from `from` to `to` (inclusive),
 * or null if no path exists or exceeds maxLength.
 */
export function findPath(
  tiles: TileMap,
  from: TileCoord,
  to: TileCoord,
  maxLength: number = DEFAULT_MAX_LENGTH,
): TileCoord[] | null {
  if (!isWalkable(tiles, from.col, from.row)) return null;
  if (!isWalkable(tiles, to.col, to.row)) return null;
  if (from.col === to.col && from.row === to.row) return [from];

  const openSet = new Map<string, Node>();
  const closedSet = new Set<string>();

  const startKey = key(from.col, from.row);
  const startNode: Node = {
    col: from.col,
    row: from.row,
    g: 0,
    h: manhattan(from.col, from.row, to.col, to.row),
    f: manhattan(from.col, from.row, to.col, to.row),
    parent: null,
  };
  openSet.set(startKey, startNode);

  while (openSet.size > 0) {
    // Find node with lowest f score
    let current: Node | null = null;
    for (const node of openSet.values()) {
      if (!current || node.f < current.f) {
        current = node;
      }
    }
    if (!current) break;

    // Reached target
    if (current.col === to.col && current.row === to.row) {
      const path = reconstructPath(current);
      if (path.length > maxLength) return null;
      return path;
    }

    const currentKey = key(current.col, current.row);
    openSet.delete(currentKey);
    closedSet.add(currentKey);

    // Explore 4 neighbors
    for (const [dc, dr] of DIRECTIONS) {
      const nc = current.col + dc;
      const nr = current.row + dr;
      const nKey = key(nc, nr);

      if (closedSet.has(nKey)) continue;
      if (!isWalkable(tiles, nc, nr)) continue;

      const g = current.g + 1;
      const existing = openSet.get(nKey);

      if (!existing || g < existing.g) {
        const h = manhattan(nc, nr, to.col, to.row);
        const node: Node = { col: nc, row: nr, g, h, f: g + h, parent: current };
        openSet.set(nKey, node);
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface Node {
  col: number;
  row: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

const DIRECTIONS: [number, number][] = [
  [0, -1], // north
  [0, 1], // south
  [-1, 0], // west
  [1, 0], // east
];

function key(col: number, row: number): string {
  return `${col},${row}`;
}

function manhattan(c1: number, r1: number, c2: number, r2: number): number {
  return Math.abs(c1 - c2) + Math.abs(r1 - r2);
}

function reconstructPath(node: Node): TileCoord[] {
  const path: TileCoord[] = [];
  let current: Node | null = node;
  while (current) {
    path.push({ col: current.col, row: current.row });
    current = current.parent;
  }
  path.reverse();
  return path;
}
