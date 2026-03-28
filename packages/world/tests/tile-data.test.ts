import { describe, expect, it } from "vite-plus/test";
import {
  TileFlag,
  hasFlag,
  getLandTile,
  LAND_TILES,
  TERRAIN_TO_TILE_ID,
  TILE_ID_TO_TERRAIN,
} from "../src/tile-data.js";
import { STATIC_TILES } from "../src/static-registry.js";

describe("hasFlag", () => {
  it("returns true when flag is set", () => {
    expect(hasFlag(TileFlag.Impassable | TileFlag.Wet, TileFlag.Impassable)).toBe(true);
    expect(hasFlag(TileFlag.Impassable | TileFlag.Wet, TileFlag.Wet)).toBe(true);
  });

  it("returns false when flag is not set", () => {
    expect(hasFlag(TileFlag.Impassable, TileFlag.Wet)).toBe(false);
    expect(hasFlag(TileFlag.None, TileFlag.Impassable)).toBe(false);
  });

  it("works with all flag values", () => {
    const allFlags =
      TileFlag.Impassable |
      TileFlag.Wet |
      TileFlag.Surface |
      TileFlag.Wall |
      TileFlag.Bridge |
      TileFlag.Roof |
      TileFlag.Foliage |
      TileFlag.Door |
      TileFlag.Background |
      TileFlag.Interactable;

    for (const [, value] of Object.entries(TileFlag)) {
      if (value === 0) continue;
      expect(hasFlag(allFlags, value)).toBe(true);
    }
  });
});

describe("getLandTile", () => {
  it("returns land tile for valid id", () => {
    const grass = getLandTile(0);
    expect(grass).toBeDefined();
    expect(grass!.name).toBe("Grass");
    expect(grass!.legacyTerrain).toBe("grass");
  });

  it("returns undefined for invalid id", () => {
    expect(getLandTile(999)).toBeUndefined();
  });
});

describe("TERRAIN_TO_TILE_ID round-trips", () => {
  it("maps every terrain to a tile ID and back", () => {
    for (const [terrain, tileId] of Object.entries(TERRAIN_TO_TILE_ID)) {
      expect(TILE_ID_TO_TERRAIN[tileId]).toBe(terrain);
      const landTile = getLandTile(tileId);
      expect(landTile).toBeDefined();
      expect(landTile!.legacyTerrain).toBe(terrain);
    }
  });

  it("covers all 18 terrains", () => {
    expect(Object.keys(TERRAIN_TO_TILE_ID)).toHaveLength(18);
  });
});

describe("LAND_TILES", () => {
  it("water has Impassable and Wet flags", () => {
    const water = LAND_TILES[3];
    expect(water).toBeDefined();
    expect(hasFlag(water!.flags, TileFlag.Impassable)).toBe(true);
    expect(hasFlag(water!.flags, TileFlag.Wet)).toBe(true);
  });

  it("grass/dirt/stone have no Impassable flag", () => {
    for (const id of [0, 1, 2]) {
      expect(hasFlag(LAND_TILES[id]!.flags, TileFlag.Impassable)).toBe(false);
    }
  });
});

describe("STATIC_TILES coverage", () => {
  it("has entries for known object types", () => {
    const knownObjects = [
      "normal-tree",
      "oak-tree",
      "willow-tree",
      "rock",
      "boulder",
      "anvil",
      "furnace",
      "bank-chest",
      "fishing-spot",
    ];
    for (const typeId of knownObjects) {
      expect(STATIC_TILES[typeId]).toBeDefined();
    }
  });

  it("has entries for known wall types", () => {
    const knownWalls = [
      "stone-wall",
      "wooden-wall",
      "stone-fence",
      "wooden-fence",
      "iron-fence",
      "hedge",
    ];
    for (const wallTypeId of knownWalls) {
      expect(STATIC_TILES[wallTypeId]).toBeDefined();
    }
  });

  it("trees and rocks have Impassable | Interactable flags", () => {
    for (const def of Object.values(STATIC_TILES)) {
      if (def.category === "tree" || def.category === "rock") {
        expect(hasFlag(def.flags, TileFlag.Impassable)).toBe(true);
        expect(hasFlag(def.flags, TileFlag.Interactable)).toBe(true);
      }
    }
  });

  it("walls have Impassable | Wall flags", () => {
    for (const def of Object.values(STATIC_TILES)) {
      if (def.category === "wall" || def.category === "fence") {
        expect(hasFlag(def.flags, TileFlag.Impassable)).toBe(true);
        expect(hasFlag(def.flags, TileFlag.Wall)).toBe(true);
      }
    }
  });

  it("fishing spots are Interactable but not Impassable", () => {
    for (const def of Object.values(STATIC_TILES)) {
      if (def.category === "fishing") {
        expect(hasFlag(def.flags, TileFlag.Interactable)).toBe(true);
        expect(hasFlag(def.flags, TileFlag.Impassable)).toBe(false);
      }
    }
  });

  it("structures have Impassable | Interactable | Surface flags", () => {
    for (const def of Object.values(STATIC_TILES)) {
      if (def.category === "structure") {
        expect(hasFlag(def.flags, TileFlag.Impassable)).toBe(true);
        expect(hasFlag(def.flags, TileFlag.Interactable)).toBe(true);
        expect(hasFlag(def.flags, TileFlag.Surface)).toBe(true);
      }
    }
  });
});
