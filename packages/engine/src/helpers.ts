import type { InventoryState, ItemStack } from "@realm-of-idlers/shared";
import type { TickResult } from "./types.js";

/** Create a zero-valued TickResult. */
export function emptyTickResult(): TickResult {
  return {
    skillXp: {},
    itemsGained: [],
    itemsConsumed: [],
    combatEvents: [],
    completedObjectives: [],
    notifications: [],
    updatedAction: null,
  };
}

/** Count empty (null) slots in inventory. */
export function countFreeSlots(inventory: InventoryState): number {
  let count = 0;
  for (const slot of inventory.slots) {
    if (slot === null) count++;
  }
  return count;
}

/** Check if inventory contains at least the given quantities of each item. */
export function hasItems(inventory: InventoryState, required: ItemStack[]): boolean {
  for (const req of required) {
    let found = 0;
    for (const slot of inventory.slots) {
      if (slot !== null && slot.itemId === req.itemId) {
        found += slot.quantity;
      }
    }
    if (found < req.quantity) return false;
  }
  return true;
}

/**
 * Add an item to inventory (mutates in place). Returns false if no space.
 * Stackable: merges into existing matching slot, or uses first empty slot.
 * For simplicity all items are treated as stackable in this helper.
 */
export function addItemToInventory(inventory: InventoryState, item: ItemStack): boolean {
  // Try to stack into existing slot
  for (const slot of inventory.slots) {
    if (slot !== null && slot.itemId === item.itemId) {
      slot.quantity += item.quantity;
      return true;
    }
  }
  // Find first empty slot
  for (let i = 0; i < inventory.slots.length; i++) {
    if (inventory.slots[i] === null) {
      inventory.slots[i] = { itemId: item.itemId, quantity: item.quantity };
      return true;
    }
  }
  return false;
}

/**
 * Remove quantity of an item from inventory (mutates in place). Returns false if insufficient.
 */
export function removeItemFromInventory(inventory: InventoryState, item: ItemStack): boolean {
  let remaining = item.quantity;
  for (let i = 0; i < inventory.slots.length && remaining > 0; i++) {
    const slot = inventory.slots[i];
    if (slot !== null && slot.itemId === item.itemId) {
      const take = Math.min(slot.quantity, remaining);
      slot.quantity -= take;
      remaining -= take;
      if (slot.quantity <= 0) {
        inventory.slots[i] = null;
      }
    }
  }
  return remaining <= 0;
}
