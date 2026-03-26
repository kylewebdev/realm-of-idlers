import type { EquipmentState, ItemId } from "@realm-of-idlers/shared";
import type { ItemDef } from "@realm-of-idlers/items";

/** Calculate hit chance: accuracy / (accuracy + enemyDefence). */
export function calculateHitChance(
  attackLevel: number,
  equipAttackBonus: number,
  enemyDefence: number,
): number {
  const accuracy = attackLevel + equipAttackBonus;
  if (accuracy + enemyDefence <= 0) return 0;
  return accuracy / (accuracy + enemyDefence);
}

/** Calculate max hit from strength level and equipment bonus. */
export function calculateMaxHit(strengthLevel: number, equipStrengthBonus: number): number {
  return strengthLevel + equipStrengthBonus;
}

/** Sum equipment bonuses from all equipped items. */
export function getEquipmentBonuses(
  equipment: EquipmentState,
  itemRegistry: Record<string, ItemDef>,
): { attack: number; strength: number; defence: number } {
  let attack = 0;
  let strength = 0;
  let defence = 0;

  for (const itemId of Object.values(equipment.equipped)) {
    if (!itemId) continue;
    const item = itemRegistry[itemId as ItemId];
    if (item?.equipStats) {
      attack += item.equipStats.attack;
      strength += item.equipStats.strength;
      defence += item.equipStats.defence;
    }
  }

  return { attack, strength, defence };
}
