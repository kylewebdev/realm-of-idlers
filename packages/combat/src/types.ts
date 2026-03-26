import type { ItemId, ItemStack } from "@realm-of-idlers/shared";

export interface MonsterDef {
  id: string;
  name: string;
  combatLevel: number;
  hp: number;
  attack: number;
  strength: number;
  defence: number;
  loot: LootEntry[];
  alwaysDrops: ItemStack[];
}

export interface LootEntry {
  itemId: ItemId;
  weight: number;
  minQty: number;
  maxQty: number;
}

export interface CombatRoundResult {
  playerHit: boolean;
  playerDamage: number;
  monsterHit: boolean;
  monsterDamage: number;
  playerHpAfter: number;
  monsterHpAfter: number;
  monsterDied: boolean;
  loot: ItemStack[];
  xpGained: { attack: number; strength: number; hitpoints: number };
  playerDied: boolean;
  ateFood?: ItemId;
  hpHealed?: number;
}
