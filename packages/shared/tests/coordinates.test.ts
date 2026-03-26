import { describe, expect, it } from "vite-plus/test";
import { tileToWorld, worldToTile } from "../src/coordinates";

describe("coordinate round-trips", () => {
  it("worldToTile(tileToWorld(c, r)) returns original coordinates", () => {
    const cases = [
      { col: 0, row: 0 },
      { col: 5, row: 3 },
      { col: 63, row: 63 },
      { col: 0, row: 63 },
      { col: 32, row: 16 },
    ];
    for (const { col, row } of cases) {
      const world = tileToWorld(col, row);
      const tile = worldToTile(world);
      expect(tile.col).toBe(col);
      expect(tile.row).toBe(row);
    }
  });

  it("round-trips work with elevation", () => {
    for (const elevation of [0, 1, 2, 3]) {
      const world = tileToWorld(10, 20, elevation);
      const tile = worldToTile(world, elevation);
      expect(tile.col).toBe(10);
      expect(tile.row).toBe(20);
    }
  });

  it("tileToWorld produces expected isometric offsets", () => {
    const origin = tileToWorld(0, 0);
    expect(origin.x).toBe(0);
    expect(origin.y).toBe(0);
    expect(origin.z).toBe(0);

    const right = tileToWorld(1, 0);
    expect(right.x).toBe(32);
    expect(right.y).toBe(16);

    const down = tileToWorld(0, 1);
    expect(down.x).toBe(-32);
    expect(down.y).toBe(16);
  });
});
