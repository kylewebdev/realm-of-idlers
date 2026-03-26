import type { InventoryState, ItemId } from "@realm-of-idlers/shared";
import { addItem, removeItem } from "./inventory.js";
import type { ItemDef, ShopDef } from "./types.js";

export type ShopResult =
  | { ok: true; gold: number; inventory: InventoryState }
  | { ok: false; reason: string };

/**
 * Buy an item from a shop.
 *
 * Deducts gold and adds the item to inventory.
 */
export function buyItem(
  gold: number,
  inventory: InventoryState,
  itemId: ItemId,
  qty: number,
  shopDef: ShopDef,
  itemDef: ItemDef,
): ShopResult {
  const shopEntry = shopDef.stock.find((s) => s.itemId === itemId);
  if (!shopEntry) {
    return { ok: false, reason: "Item not available in this shop." };
  }

  const totalCost = shopEntry.basePrice * qty;
  if (gold < totalCost) {
    return { ok: false, reason: "Not enough gold." };
  }

  const result = addItem(inventory, itemId, qty, itemDef);
  if (!result.ok) {
    return { ok: false, reason: "Inventory is full." };
  }

  return {
    ok: true,
    gold: gold - totalCost,
    inventory: result.inventory,
  };
}

/**
 * Sell an item for gold.
 *
 * Removes the item from inventory and adds `sellValue * qty` to gold.
 */
export function sellItem(
  gold: number,
  inventory: InventoryState,
  itemId: ItemId,
  qty: number,
  itemDef: ItemDef,
): ShopResult {
  if (itemDef.sellValue <= 0) {
    return { ok: false, reason: "This item cannot be sold." };
  }

  const result = removeItem(inventory, itemId, qty);
  if (!result.ok) {
    return { ok: false, reason: "Not enough items to sell." };
  }

  return {
    ok: true,
    gold: gold + itemDef.sellValue * qty,
    inventory: result.inventory,
  };
}
