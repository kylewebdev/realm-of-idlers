import { describe, expect, it } from "vite-plus/test";
import { expandMulti, MULTI_DEFS } from "../src/multi.js";
import { TileFlag, hasFlag } from "../src/tile-data.js";

describe("expandMulti", () => {
  it("returns empty array for unknown multiId", () => {
    expect(expandMulti("nonexistent", 0, 0)).toEqual([]);
  });

  it("expands small-house to correct world-space statics", () => {
    const statics = expandMulti("small-house", 5, 10);
    const def = MULTI_DEFS["small-house"]!;
    expect(statics).toHaveLength(def.components.length);

    // All statics should be offset from (5, 10)
    for (const s of statics) {
      expect(s.col).toBeGreaterThanOrEqual(5);
      expect(s.col).toBeLessThan(5 + def.foundationWidth);
      expect(s.row).toBeGreaterThanOrEqual(10);
      expect(s.row).toBeLessThan(10 + def.foundationHeight);
    }
  });

  it("preserves component flags (door)", () => {
    const statics = expandMulti("small-house", 0, 0);
    const door = statics.find((s) => hasFlag(s.flags, TileFlag.Door));
    expect(door).toBeDefined();
    expect(door!.col).toBe(1);
    expect(door!.row).toBe(2);
  });

  it("applies z offset", () => {
    const statics = expandMulti("watchtower", 0, 0, 3);
    for (const s of statics) {
      expect(s.z).toBe(3);
    }
  });
});
