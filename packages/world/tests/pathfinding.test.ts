import { describe, expect, it } from "vite-plus/test";
import { findPath } from "../src/pathfinding.js";
import { migrateV1toV2, indexMapV2, getStaticsAt } from "../src/map-loader.js";
import { createBriarwoodMap } from "../src/briarwood.js";
import { TileFlag, hasFlag } from "../src/tile-data.js";
import type {
  GameMap,
  GameMapV2,
  GroundCell,
  MapObject,
  MapStatic,
  EdgeWall,
  MapSpawnZone,
} from "../src/types.js";

/** Helper: build a simple V1 GameMap, migrate to V2, then index it. */
function makeV2Index(
  width: number,
  height: number,
  ground: GroundCell[][],
  objects: MapObject[] = [],
  walls: EdgeWall[] = [],
  spawnZones: MapSpawnZone[] = [],
) {
  const v1: GameMap = {
    meta: { name: "test", version: 1, width, height },
    ground,
    objects,
    walls,
    spawnZones,
  };
  return indexMapV2(migrateV1toV2(v1));
}

/** Build a flat grass grid. */
function grassGrid(width: number, height: number): GroundCell[][] {
  const grid: GroundCell[][] = [];
  for (let r = 0; r < height; r++) {
    const row: GroundCell[] = [];
    for (let c = 0; c < width; c++) {
      row.push({ terrain: "grass", elevation: 0 });
    }
    grid.push(row);
  }
  return grid;
}

describe("findPath (V2)", () => {
  it("finds path between two walkable tiles on Briarwood", () => {
    // Build from legacy Briarwood, migrate to V2
    const briarwood = createBriarwoodMap();
    const ground: GroundCell[][] = briarwood.tiles.map((row) =>
      row.map((t) => ({ terrain: t.terrain, elevation: t.elevation })),
    );
    const v1: GameMap = {
      meta: { name: "Briarwood", version: 1, width: ground[0]!.length, height: ground.length },
      ground,
      objects: [],
      walls: [],
      spawnZones: [],
    };
    const index = indexMapV2(migrateV1toV2(v1));

    // Town center tiles — definitely walkable
    const path = findPath(index, { col: 30, row: 30 }, { col: 34, row: 30 });
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(1);
    expect(path![0]).toEqual({ col: 30, row: 30 });
    expect(path![path!.length - 1]).toEqual({ col: 34, row: 30 });
  });

  it("returns single-tile path for same start and end", () => {
    const index = makeV2Index(5, 5, grassGrid(5, 5));
    const path = findPath(index, { col: 2, row: 2 }, { col: 2, row: 2 });
    expect(path).toEqual([{ col: 2, row: 2 }]);
  });

  it("returns path for adjacent tiles", () => {
    const index = makeV2Index(5, 5, grassGrid(5, 5));
    const path = findPath(index, { col: 2, row: 2 }, { col: 3, row: 2 });
    expect(path).toEqual([
      { col: 2, row: 2 },
      { col: 3, row: 2 },
    ]);
  });

  it("returns null for unreachable tile (water)", () => {
    const grid = grassGrid(5, 5);
    grid[0]![0] = { terrain: "water", elevation: 0 };
    const index = makeV2Index(5, 5, grid);
    const path = findPath(index, { col: 2, row: 2 }, { col: 0, row: 0 });
    expect(path).toBeNull();
  });

  it("returns null when start is not walkable", () => {
    const grid = grassGrid(5, 5);
    grid[0]![0] = { terrain: "water", elevation: 0 };
    const index = makeV2Index(5, 5, grid);
    const path = findPath(index, { col: 0, row: 0 }, { col: 2, row: 2 });
    expect(path).toBeNull();
  });

  it("respects max length cap", () => {
    const index = makeV2Index(10, 10, grassGrid(10, 10));
    const path = findPath(index, { col: 0, row: 0 }, { col: 5, row: 5 }, 3);
    expect(path).toBeNull();
  });

  it("works on a map with blocking objects", () => {
    const grid = grassGrid(5, 5);
    // Wall of blocking objects at col=2, rows 0-3 (leaves gap at row 4)
    const objects: MapObject[] = [];
    for (let r = 0; r < 4; r++) {
      objects.push({
        col: 2,
        row: r,
        typeId: "normal-tree",
        blocking: true,
      });
    }
    const index = makeV2Index(5, 5, grid, objects);
    const path = findPath(index, { col: 0, row: 0 }, { col: 4, row: 0 });
    expect(path).not.toBeNull();
    // Path must go around the wall via row 4
    expect(path!.some((p) => p.row === 4)).toBe(true);
  });
});

describe("indexMapV2 stacking sort", () => {
  it("sorts Background statics before normal statics at same z", () => {
    const map: GameMapV2 = {
      meta: { name: "test", version: 2, width: 5, height: 5 },
      ground: grassGrid(5, 5).map((row) => row.map((c) => ({ tileId: 0, elevation: 0 }))),
      statics: [
        { col: 2, row: 2, z: 0, staticId: "normal-tree", flags: TileFlag.Impassable },
        { col: 2, row: 2, z: 0, staticId: "bg-item", flags: TileFlag.Background },
      ],
      spawnZones: [],
    };
    const index = indexMapV2(map);
    const statics = getStaticsAt(index, 2, 2);
    expect(statics).toHaveLength(2);
    // Background item should sort first (lower priority)
    expect(hasFlag(statics[0]!.flags, TileFlag.Background)).toBe(true);
    expect(statics[1]!.staticId).toBe("normal-tree");
  });

  it("sorts by z ascending", () => {
    const map: GameMapV2 = {
      meta: { name: "test", version: 2, width: 5, height: 5 },
      ground: grassGrid(5, 5).map((row) => row.map((c) => ({ tileId: 0, elevation: 0 }))),
      statics: [
        { col: 1, row: 1, z: 5, staticId: "high", flags: TileFlag.None },
        { col: 1, row: 1, z: 0, staticId: "low", flags: TileFlag.None },
      ],
      spawnZones: [],
    };
    const index = indexMapV2(map);
    const statics = getStaticsAt(index, 1, 1);
    expect(statics[0]!.staticId).toBe("low");
    expect(statics[1]!.staticId).toBe("high");
  });
});
