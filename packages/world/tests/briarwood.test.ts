import { describe, expect, it } from "vite-plus/test";
import { MAP_SIZE } from "@realm-of-idlers/shared";
import { createBriarwoodMap, getTile } from "../src/briarwood.js";

const VALID_TERRAINS = ["grass", "dirt", "stone", "water"];

describe("Briarwood map", () => {
  const { tiles, spawnZones } = createBriarwoodMap();

  it("is MAP_SIZE × MAP_SIZE (64×64)", () => {
    expect(tiles.length).toBe(MAP_SIZE);
    for (const row of tiles) {
      expect(row.length).toBe(MAP_SIZE);
    }
  });

  it("all tiles have valid terrain types", () => {
    for (let row = 0; row < MAP_SIZE; row++) {
      for (let col = 0; col < MAP_SIZE; col++) {
        const tile = getTile(tiles, col, row);
        expect(tile).toBeDefined();
        expect(VALID_TERRAINS).toContain(tile!.terrain);
      }
    }
  });

  it("all tiles have valid elevation (0-3)", () => {
    for (let row = 0; row < MAP_SIZE; row++) {
      for (let col = 0; col < MAP_SIZE; col++) {
        const tile = getTile(tiles, col, row)!;
        expect(tile.elevation).toBeGreaterThanOrEqual(0);
        expect(tile.elevation).toBeLessThanOrEqual(3);
      }
    }
  });

  it("has water border on edges", () => {
    for (let i = 0; i < MAP_SIZE; i++) {
      expect(getTile(tiles, i, 0)!.terrain).toBe("water");
      expect(getTile(tiles, i, MAP_SIZE - 1)!.terrain).toBe("water");
      expect(getTile(tiles, 0, i)!.terrain).toBe("water");
      expect(getTile(tiles, MAP_SIZE - 1, i)!.terrain).toBe("water");
    }
  });

  it("town center has required structures", () => {
    const structures: string[] = [];
    for (let row = 27; row <= 36; row++) {
      for (let col = 27; col <= 36; col++) {
        const tile = getTile(tiles, col, row)!;
        if (tile.structure) structures.push(tile.structure);
      }
    }
    expect(structures).toContain("forge");
    expect(structures).toContain("shop");
    expect(structures).toContain("bank");
    expect(structures).toContain("cooking-range");
  });

  it("has resource nodes (trees, ore, fishing)", () => {
    const activityIds: string[] = [];
    for (let row = 0; row < MAP_SIZE; row++) {
      for (let col = 0; col < MAP_SIZE; col++) {
        const tile = getTile(tiles, col, row)!;
        if (tile.resourceNode) activityIds.push(tile.resourceNode.activityId);
      }
    }
    expect(activityIds).toContain("chop-normal-tree");
    expect(activityIds).toContain("chop-oak-tree");
    expect(activityIds).toContain("mine-copper");
    expect(activityIds).toContain("mine-tin");
    expect(activityIds).toContain("mine-iron");
    expect(activityIds).toContain("fish-shrimp");
    expect(activityIds).toContain("fish-trout");
  });

  it("water tiles are not walkable", () => {
    for (let row = 0; row < MAP_SIZE; row++) {
      for (let col = 0; col < MAP_SIZE; col++) {
        const tile = getTile(tiles, col, row)!;
        if (tile.terrain === "water") {
          expect(tile.walkable).toBe(false);
        }
      }
    }
  });

  it("spawn zones reference known monster IDs", () => {
    const knownMonsters = [
      "chicken",
      "rat",
      "spider",
      "goblin",
      "skeleton",
      "wolf",
      "bandit",
      "dark-mage",
      "troll",
      "briarwood-guardian",
    ];
    expect(spawnZones.length).toBe(10);
    for (const zone of spawnZones) {
      expect(knownMonsters).toContain(zone.monsterId);
      expect(zone.tiles.length).toBeGreaterThan(0);
    }
  });

  it("getTile returns undefined for out-of-bounds", () => {
    expect(getTile(tiles, -1, 0)).toBeUndefined();
    expect(getTile(tiles, 0, -1)).toBeUndefined();
    expect(getTile(tiles, MAP_SIZE, 0)).toBeUndefined();
    expect(getTile(tiles, 0, MAP_SIZE)).toBeUndefined();
  });
});
