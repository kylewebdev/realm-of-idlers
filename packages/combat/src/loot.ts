import type { ItemStack } from "@realm-of-idlers/shared";
import type { MonsterDef } from "./types.js";

/**
 * Roll loot from a monster's loot table.
 *
 * Always includes `alwaysDrops`. Then rolls one item from the weighted
 * loot table. `rng` returns values in [0, 1) for deterministic testing.
 */
export function rollLoot(monster: MonsterDef, rng: () => number = Math.random): ItemStack[] {
  const drops: ItemStack[] = monster.alwaysDrops.map((d) => ({ ...d }));

  if (monster.loot.length === 0) return drops;

  const totalWeight = monster.loot.reduce((sum, entry) => sum + entry.weight, 0);
  const roll = rng() * totalWeight;

  let cumulative = 0;
  for (const entry of monster.loot) {
    cumulative += entry.weight;
    if (roll < cumulative) {
      const qty =
        entry.minQty === entry.maxQty
          ? entry.minQty
          : entry.minQty + Math.floor(rng() * (entry.maxQty - entry.minQty + 1));
      drops.push({ itemId: entry.itemId, quantity: qty });
      break;
    }
  }

  return drops;
}
