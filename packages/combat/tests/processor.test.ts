import { describe, expect, it } from "vite-plus/test";
import type { CombatAction, GameState, SkillType } from "@realm-of-idlers/shared";
import { INVENTORY_SLOTS, BANK_SLOTS } from "@realm-of-idlers/shared";
import { ITEMS } from "@realm-of-idlers/items";
import { MONSTERS } from "../src/monsters.js";
import { createCombatProcessor } from "../src/processor.js";

const SKILL_TYPES: SkillType[] = [
  "woodcutting",
  "mining",
  "fishing",
  "smithing",
  "cooking",
  "attack",
  "strength",
  "hitpoints",
];

function createTestState(overrides?: Partial<GameState>): GameState {
  const skills = {} as GameState["skills"];
  for (const skill of SKILL_TYPES) {
    skills[skill] = { level: 10, xp: 1154 };
  }
  return {
    version: 1,
    player: { name: "Tester", position: { col: 32, row: 32 }, gold: 100 },
    skills,
    inventory: { slots: Array.from({ length: INVENTORY_SLOTS }, () => null) },
    equipment: { equipped: { weapon: "bronze-sword" } },
    bank: { slots: Array.from({ length: BANK_SLOTS }, () => null) },
    actionQueue: [],
    quests: {},
    questProgress: {},
    killCounts: {},
    world: { resourceNodes: {}, exploredTiles: new Set() },
    settings: { autoEatThreshold: 0.5, uiScale: 1 },
    timestamps: { lastSave: Date.now(), lastTick: Date.now(), created: Date.now() },
    ...overrides,
  };
}

describe("createCombatProcessor", () => {
  // Use deterministic rng: always hits, deals max damage
  const alwaysHitRng = () => 0.01;
  const processor = createCombatProcessor(MONSTERS, ITEMS, alwaysHitRng);

  it("initializes monster HP on first tick", () => {
    const state = createTestState();
    const action: CombatAction = { type: "combat", monsterId: "chicken" };

    const result = processor(state, action);

    expect(result.updatedAction).toMatchObject({
      type: "combat",
      monsterId: "chicken",
      monsterCurrentHp: 3, // chicken HP
      tickCounter: 1,
    });
  });

  it("increments tick counter between rounds", () => {
    const state = createTestState();
    const action: CombatAction = {
      type: "combat",
      monsterId: "chicken",
      monsterCurrentHp: 3,
      tickCounter: 0,
    };

    const result = processor(state, action);
    expect(result.updatedAction).toMatchObject({ tickCounter: 1 });
    expect(result.combatEvents).toHaveLength(0);
  });

  it("resolves combat round on 4th tick", () => {
    const state = createTestState();
    const action: CombatAction = {
      type: "combat",
      monsterId: "chicken",
      monsterCurrentHp: 3,
      tickCounter: 3, // will become 4
    };

    const result = processor(state, action);
    expect(result.combatEvents.length).toBeGreaterThan(0);
  });

  it("kills weak monster and grants XP + loot", () => {
    const state = createTestState();
    // Chicken has 3 HP. With attack 10 + bronze sword (4), we should kill it.
    const action: CombatAction = {
      type: "combat",
      monsterId: "chicken",
      monsterCurrentHp: 1, // nearly dead
      tickCounter: 3,
    };

    const result = processor(state, action);

    // Should have killed it
    const deathEvent = result.combatEvents.find(
      (e) => e.type === "death" && e.source === "monster",
    );
    expect(deathEvent).toBeDefined();

    // XP granted
    expect(result.skillXp.attack).toBeGreaterThan(0);
    expect(result.skillXp.strength).toBeGreaterThan(0);
    expect(result.skillXp.hitpoints).toBeGreaterThan(0);

    // Auto-restarts
    expect(result.updatedAction).toMatchObject({
      type: "combat",
      monsterId: "chicken",
      monsterCurrentHp: 3, // reset to full
      tickCounter: 0,
    });
  });

  it("returns idle for unknown monster", () => {
    const state = createTestState();
    const action: CombatAction = { type: "combat", monsterId: "nonexistent" };

    const result = processor(state, action);

    expect(result.updatedAction).toEqual({ type: "idle" });
    expect(result.notifications.length).toBeGreaterThan(0);
  });

  it("full combat sequence kills chicken in multiple rounds", () => {
    const state = createTestState();
    // Deterministic: moderate damage
    const moderateRng = () => 0.3;
    const proc = createCombatProcessor(MONSTERS, ITEMS, moderateRng);

    let action: CombatAction = { type: "combat", monsterId: "chicken" };
    let killed = false;

    for (let i = 0; i < 20; i++) {
      const result = proc(state, action);
      if (result.updatedAction && result.updatedAction.type === "combat") {
        action = result.updatedAction;
        // Check if monster was killed (HP reset to full)
        if (action.monsterCurrentHp === MONSTERS.chicken!.hp && action.tickCounter === 0 && i > 0) {
          killed = true;
          break;
        }
      } else {
        break;
      }
    }

    expect(killed).toBe(true);
  });
});
