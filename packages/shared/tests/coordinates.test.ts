import { describe, expect, it } from "vite-plus/test";
import { tileToWorld, worldToTile } from "../src/coordinates";
import { ELEV_SCALE } from "../src/constants";

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
      const tile = worldToTile(world);
      expect(tile.col).toBe(10);
      expect(tile.row).toBe(20);
    }
  });

  it("tileToWorld uses X/Z for ground plane, Y for elevation", () => {
    const origin = tileToWorld(0, 0);
    expect(origin.x).toBe(0);
    expect(origin.y).toBe(0);
    expect(origin.z).toBe(0);

    const tile = tileToWorld(5, 10);
    expect(tile.x).toBe(5);
    expect(tile.z).toBe(10);
    expect(tile.y).toBe(0);

    const elevated = tileToWorld(5, 10, 2);
    expect(elevated.x).toBe(5);
    expect(elevated.z).toBe(10);
    expect(elevated.y).toBeCloseTo(2 * ELEV_SCALE);
  });

  it("elevation scales UO Z values to world Y", () => {
    // UO Britain range: roughly -20 to 61
    const low = tileToWorld(0, 0, -20);
    const high = tileToWorld(0, 0, 61);
    expect(low.y).toBeCloseTo(-20 * ELEV_SCALE);
    expect(high.y).toBeCloseTo(61 * ELEV_SCALE);
    expect(high.y).toBeGreaterThan(low.y);
  });
});
