import type { EquipSlot, ItemCategory, ItemId } from "@realm-of-idlers/shared";

export interface ItemDef {
  id: ItemId;
  name: string;
  icon: string;
  category: ItemCategory;
  stackable: boolean;
  sellValue: number;
  equipSlot?: EquipSlot;
  equipStats?: { attack: number; strength: number; defence: number };
  healAmount?: number;
  toolPower?: number;
}

export interface ShopDef {
  id: string;
  name: string;
  stock: { itemId: ItemId; basePrice: number }[];
}
