import type { CombatAction, CombatEvent, GameState } from "@realm-of-idlers/shared";
import type { TickResult } from "@realm-of-idlers/engine";
import type { ItemDef } from "@realm-of-idlers/items";
import type { MonsterDef } from "./types.js";
import { rollLoot } from "./loot.js";
import { calculateHitChance, calculateMaxHit, getEquipmentBonuses } from "./damage.js";
import { autoEat } from "./auto-eat.js";
import { handleDeath } from "./death.js";

const COMBAT_ROUND_TICKS = 4;

/**
 * Create a combat tick processor to inject into TickContext.
 *
 * Returns a function matching the `processCombatTick` signature.
 */
export function createCombatProcessor(
  monsters: Record<string, MonsterDef>,
  itemRegistry: Record<string, ItemDef>,
  rng: () => number = Math.random,
): (state: GameState, action: CombatAction) => TickResult {
  return (state: GameState, action: CombatAction): TickResult => {
    const result: TickResult = {
      skillXp: {},
      itemsGained: [],
      itemsConsumed: [],
      combatEvents: [],
      completedObjectives: [],
      notifications: [],
      updatedAction: null,
    };

    const monster = monsters[action.monsterId];
    if (!monster) {
      result.notifications.push({
        type: "milestone",
        message: `Unknown monster: ${action.monsterId}`,
      });
      result.updatedAction = { type: "idle" };
      return result;
    }

    // Initialize combat state on first tick
    const monsterHp = action.monsterCurrentHp ?? monster.hp;
    const tickCounter = (action.tickCounter ?? 0) + 1;

    // Not a combat round tick yet — just increment counter
    if (tickCounter < COMBAT_ROUND_TICKS) {
      result.updatedAction = {
        ...action,
        monsterCurrentHp: monsterHp,
        tickCounter,
      };
      return result;
    }

    // Combat round! Reset tick counter
    const equipBonuses = getEquipmentBonuses(state.equipment, itemRegistry);

    // Player's current HP (hitpoints level as max, xp-based)
    const maxHp = state.skills.hitpoints.level;
    // We track "effective HP" through the action cycle. For simplicity,
    // use hitpoints level as current HP (damage is applied via state).
    // Since we can't store player HP in the action, we use hitpoints level.
    let playerHp = maxHp;

    // Auto-eat check before combat round
    const eatResult = autoEat(
      state.inventory,
      playerHp,
      maxHp,
      state.settings.autoEatThreshold,
      itemRegistry,
    );
    if (eatResult.ateFood) {
      playerHp = Math.min(maxHp, playerHp + eatResult.hpHealed);
      result.itemsConsumed.push({ itemId: eatResult.ateFood, quantity: 1 });
      result.notifications.push({
        type: "milestone",
        message: `You eat ${eatResult.ateFood} and heal ${eatResult.hpHealed} HP.`,
      });
    }

    // Player attacks monster
    const playerHitChance = calculateHitChance(
      state.skills.attack.level,
      equipBonuses.attack,
      monster.defence,
    );
    const playerMaxHit = calculateMaxHit(state.skills.strength.level, equipBonuses.strength);
    let currentMonsterHp = monsterHp;

    let playerDamage = 0;
    const playerHits = rng() < playerHitChance;
    if (playerHits) {
      playerDamage = Math.max(1, Math.floor(rng() * playerMaxHit) + 1);
      currentMonsterHp = Math.max(0, currentMonsterHp - playerDamage);
    }

    const playerEvent: CombatEvent = {
      type: playerHits ? "hit" : "miss",
      damage: playerDamage,
      source: "player",
    };
    result.combatEvents.push(playerEvent);

    // Check if monster died
    if (currentMonsterHp <= 0) {
      // Monster killed!
      const loot = rollLoot(monster, rng);
      const goldDrop = loot.find((l) => l.itemId === "gold");
      const itemLoot = loot.filter((l) => l.itemId !== "gold");

      result.itemsGained.push(...itemLoot);

      if (goldDrop) {
        result.notifications.push({
          type: "milestone",
          message: `You received ${goldDrop.quantity} gold.`,
        });
      }

      result.combatEvents.push({
        type: "death",
        source: "monster",
        itemsDropped: loot,
      });

      // Grant XP on kill (at least 1 per skill)
      const attackXp = Math.max(1, Math.floor(monster.hp / 3));
      const strengthXp = Math.max(1, Math.floor(monster.hp / 3));
      const hitpointsXp = Math.max(1, Math.floor(monster.hp / 4));
      result.skillXp = {
        attack: attackXp,
        strength: strengthXp,
        hitpoints: hitpointsXp,
      };

      result.notifications.push({
        type: "milestone",
        message: `You killed the ${monster.name}!`,
      });

      // Auto-restart: fight same monster again
      result.updatedAction = {
        type: "combat",
        monsterId: action.monsterId,
        monsterCurrentHp: monster.hp,
        tickCounter: 0,
      };

      // Handle gold drop as player gold increase (via notification, applied by bridge)
      // For now, gold drops are included in itemsGained for the loot event

      return result;
    }

    // Monster attacks player
    const monsterHitChance = calculateHitChance(monster.attack, 0, equipBonuses.defence);
    const monsterMaxHit = monster.strength;

    let monsterDamage = 0;
    const monsterHits = rng() < monsterHitChance;
    if (monsterHits) {
      monsterDamage = Math.max(1, Math.floor(rng() * monsterMaxHit) + 1);
      playerHp = Math.max(0, playerHp - monsterDamage);
    }

    const monsterEvent: CombatEvent = {
      type: monsterHits ? "hit" : "miss",
      damage: monsterDamage,
      source: "monster",
    };
    result.combatEvents.push(monsterEvent);

    // Check if player died
    if (playerHp <= 0) {
      const deathResult = handleDeath(state);
      result.notifications.push(...deathResult.notifications);
      result.updatedAction = { type: "idle" };
      // Gold penalty applied via notification — bridge should deduct gold
      return result;
    }

    // Continue fighting
    result.updatedAction = {
      type: "combat",
      monsterId: action.monsterId,
      monsterCurrentHp: currentMonsterHp,
      tickCounter: 0,
    };

    return result;
  };
}
