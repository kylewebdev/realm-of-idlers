import { describe, expect, it } from "vite-plus/test";
import { rollLoot } from "../src/loot.js";
import { MONSTERS } from "../src/monsters.js";

describe("rollLoot", () => {
  it("always includes alwaysDrops", () => {
    const chicken = MONSTERS.chicken!;
    // Deterministic rng
    const loot = rollLoot(chicken, () => 0.5);

    expect(loot.some((l) => l.itemId === "feathers")).toBe(true);
    expect(loot.some((l) => l.itemId === "bones")).toBe(true);
  });

  it("rolls one item from loot table", () => {
    const rat = MONSTERS.rat!;
    const loot = rollLoot(rat, () => 0);

    // rat always drops bones + rat-tail from loot table
    expect(loot.some((l) => l.itemId === "bones")).toBe(true);
    expect(loot.some((l) => l.itemId === "rat-tail")).toBe(true);
  });

  it("weighted selection picks correct item", () => {
    const goblin = MONSTERS.goblin!;
    // goblin loot: gold (weight 3), bronze-dagger (weight 1), total weight 4
    // rng=0 should pick gold (cumulative 3 > 0*4=0)
    const lootGold = rollLoot(goblin, () => 0);
    expect(lootGold.some((l) => l.itemId === "gold")).toBe(true);

    // rng=0.99 should pick bronze-dagger (cumulative needs to reach 4, 0.99*4=3.96 > 3)
    const lootDagger = rollLoot(goblin, () => 0.99);
    expect(lootDagger.some((l) => l.itemId === "bronze-dagger")).toBe(true);
  });

  it("returns only alwaysDrops when loot table is empty", () => {
    const emptyLootMonster = {
      ...MONSTERS.chicken!,
      loot: [],
      alwaysDrops: [{ itemId: "bones", quantity: 1 }],
    };
    const loot = rollLoot(emptyLootMonster);
    expect(loot).toEqual([{ itemId: "bones", quantity: 1 }]);
  });

  it("produces consistent results with deterministic rng", () => {
    const wolf = MONSTERS.wolf!;
    const loot1 = rollLoot(wolf, () => 0.3);
    const loot2 = rollLoot(wolf, () => 0.3);
    expect(loot1).toEqual(loot2);
  });
});
