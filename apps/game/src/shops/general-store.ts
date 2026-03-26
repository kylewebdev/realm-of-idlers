import type { ShopDef } from "@realm-of-idlers/items";

export const GENERAL_STORE: ShopDef = {
  id: "general-store",
  name: "General Store",
  stock: [
    { itemId: "bronze-axe", basePrice: 50 },
    { itemId: "bronze-pickaxe", basePrice: 50 },
    { itemId: "bronze-harpoon", basePrice: 50 },
    { itemId: "bronze-sword", basePrice: 80 },
    { itemId: "bronze-shield", basePrice: 60 },
    { itemId: "bronze-helm", basePrice: 40 },
    { itemId: "bronze-platebody", basePrice: 120 },
    { itemId: "bronze-platelegs", basePrice: 100 },
    { itemId: "iron-axe", basePrice: 200 },
    { itemId: "iron-pickaxe", basePrice: 200 },
    { itemId: "iron-harpoon", basePrice: 200 },
    { itemId: "cooked-shrimp", basePrice: 15 },
    { itemId: "cooked-trout", basePrice: 40 },
  ],
};
