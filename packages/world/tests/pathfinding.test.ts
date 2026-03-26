import { describe, expect, it } from "vite-plus/test";
import { createBriarwoodMap } from "../src/briarwood.js";
import { findPath } from "../src/pathfinding.js";
import type { TileMap } from "../src/types.js";

describe("findPath", () => {
  const { tiles } = createBriarwoodMap();

  it("finds path between two walkable tiles", () => {
    // Town center tiles — definitely walkable
    const path = findPath(tiles, { col: 30, row: 30 }, { col: 34, row: 30 });

    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(1);
    expect(path![0]).toEqual({ col: 30, row: 30 });
    expect(path![path!.length - 1]).toEqual({ col: 34, row: 30 });
  });

  it("returns single-tile path for same start and end", () => {
    const path = findPath(tiles, { col: 30, row: 30 }, { col: 30, row: 30 });
    expect(path).toEqual([{ col: 30, row: 30 }]);
  });

  it("returns path for adjacent tiles", () => {
    const path = findPath(tiles, { col: 30, row: 30 }, { col: 31, row: 30 });
    expect(path).toEqual([
      { col: 30, row: 30 },
      { col: 31, row: 30 },
    ]);
  });

  it("returns null for unreachable tile (water border)", () => {
    // Corner is water and non-walkable
    const path = findPath(tiles, { col: 30, row: 30 }, { col: 0, row: 0 });
    expect(path).toBeNull();
  });

  it("returns null when start is not walkable", () => {
    const path = findPath(tiles, { col: 0, row: 0 }, { col: 30, row: 30 });
    expect(path).toBeNull();
  });

  it("returns null when destination is not walkable", () => {
    const path = findPath(tiles, { col: 30, row: 30 }, { col: 0, row: 0 });
    expect(path).toBeNull();
  });

  it("respects max length cap", () => {
    // Long path with cap of 3
    const path = findPath(tiles, { col: 30, row: 30 }, { col: 35, row: 35 }, 3);
    expect(path).toBeNull();
  });

  it("works on a small custom map", () => {
    // 5×5 grid with a wall
    const small: TileMap = [];
    for (let r = 0; r < 5; r++) {
      const row = [];
      for (let c = 0; c < 5; c++) {
        row.push({ terrain: "grass" as const, elevation: 0 as const, walkable: true });
      }
      small.push(row);
    }
    // Wall at col=2, rows 0-3 (leaves gap at row 4)
    for (let r = 0; r < 4; r++) {
      small[r]![2] = { terrain: "stone", elevation: 0, walkable: false };
    }

    const path = findPath(small, { col: 0, row: 0 }, { col: 4, row: 0 });
    expect(path).not.toBeNull();
    // Path must go around the wall via row 4
    expect(path!.some((p) => p.row === 4)).toBe(true);
  });
});
