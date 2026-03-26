import type { InventoryState, ItemId } from "@realm-of-idlers/shared";
import type { ItemDef } from "@realm-of-idlers/items";

export interface AutoEatResult {
  ateFood?: ItemId;
  hpHealed: number;
}

/**
 * Check if auto-eat should trigger and find the best food to consume.
 *
 * Triggers when currentHp < maxHp * threshold (default 50%).
 * Selects the food with the highest healAmount from inventory.
 */
export function autoEat(
  inventory: InventoryState,
  currentHp: number,
  maxHp: number,
  threshold: number,
  itemRegistry: Record<string, ItemDef>,
): AutoEatResult {
  if (currentHp >= maxHp * threshold) {
    return { hpHealed: 0 };
  }

  let bestFood: { itemId: ItemId; healAmount: number } | null = null;

  for (const slot of inventory.slots) {
    if (!slot) continue;
    const item = itemRegistry[slot.itemId];
    if (!item?.healAmount) continue;
    if (!bestFood || item.healAmount > bestFood.healAmount) {
      bestFood = { itemId: slot.itemId, healAmount: item.healAmount };
    }
  }

  if (!bestFood) {
    return { hpHealed: 0 };
  }

  const healed = Math.min(bestFood.healAmount, maxHp - currentHp);
  return { ateFood: bestFood.itemId, hpHealed: healed };
}
