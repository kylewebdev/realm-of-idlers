// Types
export type { ItemDef, ShopDef } from "./types.js";

// Registry
export { ITEMS, getItem } from "./registry.js";

// Inventory
export { addItem, removeItem, hasItem, countItem, countFreeSlots } from "./inventory.js";
export type { InventoryResult } from "./inventory.js";

// Equipment
export { equipItem, unequipItem } from "./equipment.js";
export type { EquipResult } from "./equipment.js";

// Bank
export { deposit, withdraw } from "./bank.js";
export type { BankResult } from "./bank.js";

// Shop
export { buyItem, sellItem } from "./shop.js";
export type { ShopResult } from "./shop.js";
