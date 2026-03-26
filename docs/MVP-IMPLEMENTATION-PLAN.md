# MVP Implementation Plan — Realm of Idlers (Phase 1)

_Derived from PRD v1.0 (Section 13) and ARCHITECTURE.md_

---

## MVP Goal

A playable vertical slice: one region (Briarwood), 8 skills, idle progression, combat, and core UI — all running client-side in the browser with localStorage persistence.

---

## Step 0: Project Scaffolding ✅

**Goal:** Transform the current Vite+ monorepo scaffold into the architecture's package structure.

### 0.1 — Rename `apps/website` → `apps/game`

- Update `apps/game/package.json` with name `@realm-of-idlers/game`
- Set up `index.html` with canvas + UI overlay mount points:
  ```html
  <canvas id="game-canvas"></canvas>
  <div id="ui-overlay">...</div>
  ```

### 0.2 — Create Workspace Packages

Scaffold each package with `package.json`, `tsconfig.json`, `src/index.ts`:

| Package           | Purpose                                  | Key Dependency             |
| ----------------- | ---------------------------------------- | -------------------------- |
| `packages/shared` | Types, constants, coordinate utils       | None                       |
| `packages/engine` | Game loop, tick system, offline sim      | `shared`                   |
| `packages/state`  | State schema, Zustand store, persistence | `shared`, `engine`         |
| `packages/world`  | Tile engine, map data, pathfinding       | `shared`, Three.js         |
| `packages/skills` | Skill definitions, XP curves, activities | `shared`, `state`          |
| `packages/combat` | Combat loop, damage calc, loot tables    | `shared`, `state`, `items` |
| `packages/items`  | Item database, inventory, equipment      | `shared`, `state`          |

### 0.3 — Install Shared Dependencies

- `vp add three` in `apps/game` and `packages/world`
- `vp add zustand` in `packages/state`
- `vp add immer` in `packages/state` (for immutable updates)

### 0.4 — Asset Directory Structure

```
apps/game/public/assets/
├── tiles/          # 64x64 terrain PNGs, texture atlases
├── sprites/        # Character/NPC/monster sprite sheets + JSON manifests
├── items/          # 32x32 item icon atlas + JSON manifest
└── ui/             # Parchment frames, button textures
```

### 0.5 — Validate

- `vp install` succeeds
- `vp check` passes (all packages type-check)
- `vp test` passes (placeholder tests)
- `vp dev` serves `apps/game` with the canvas visible

---

## Step 1: `packages/shared` — Types & Constants ✅

**Goal:** Define the cross-cutting types and constants that all packages depend on.

### 1.1 — Core Types

```typescript
// Types used everywhere
type SkillType =
  | "woodcutting"
  | "mining"
  | "fishing"
  | "smithing"
  | "cooking"
  | "attack"
  | "strength"
  | "hitpoints";
type ItemId = string;
type QuestId = string;
type NodeId = string;
type TileCoord = { col: number; row: number };
type TerrainType = "grass" | "dirt" | "stone" | "water";
type ItemCategory = "resource" | "equipment" | "food" | "tool" | "quest";
type EquipSlot = "weapon" | "head" | "body" | "legs" | "shield";
```

### 1.2 — Constants

```typescript
const TICK_DURATION_MS = 600;
const MAX_OFFLINE_TICKS = 48_000; // 8 hours
const MAX_SKILL_LEVEL = 99;
const TILE_SIZE = 64;
const CHUNK_SIZE = 8;
```

### 1.3 — Coordinate Utilities

- `tileToWorld(col, row, elevation) → { x, y, z }` (isometric projection)
- `worldToTile({ x, y, z }) → { col, row }`
- Pure math — no Three.js dependency at this layer

### Tests

- Coordinate conversion round-trips: `worldToTile(tileToWorld(c, r, e))` returns original `(c, r)`
- Constants are valid (tick > 0, max level > 0, etc.)

---

## Step 2: `packages/state` — Game State & Persistence ✅

**Goal:** Define the state schema, Zustand store, and save/load system.

### 2.1 — GameState Schema

Implement the `GameState` interface from the architecture:

```typescript
interface GameState {
  version: number;
  player: { name: string; position: TileCoord; gold: number };
  skills: Record<SkillType, { level: number; xp: number }>;
  inventory: InventoryState;
  equipment: EquipmentState;
  bank: BankState;
  actionQueue: ActionEntry[];
  quests: Record<QuestId, QuestStatus>;
  world: {
    resourceNodes: Record<NodeId, { depleted: boolean; respawnAt: number }>;
    exploredTiles: Set<string>;
  };
  settings: PlayerSettings;
  timestamps: { lastSave: number; lastTick: number; created: number };
}
```

### 2.2 — Zustand Store

- Create store with `GameState` shape
- Immutable updates via Immer
- Selectors: `totalLevel`, `combatLevel`, `xpToNextLevel(skill)`, `isInventoryFull`
- Factory function `createNewGameState(playerName)` for fresh starts

### 2.3 — Persistence Layer

- `saveGame(state) → localStorage` (key: `realm-of-idlers-save`)
- `loadGame() → GameState | null` with version migration
- Auto-save: `setInterval` every 30 seconds
- Event-save: on level up, quest complete
- Exit-save: `beforeunload` listener
- IndexedDB fallback if `localStorage` quota exceeded

### 2.4 — Save Migrations

- Migration registry: `Record<number, (oldState) => newState>`
- Each schema change increments `version`
- `migrate(loadedState)` chains transforms from `loadedState.version` → current

### Tests

- Create new game state → all skills level 1, empty inventory
- Save → load round-trip preserves all fields
- Migration from v1 → v2 applies transforms correctly
- Selectors compute correct derived values

### Implementation Notes

**Key decisions:**

- **Zustand vanilla store** (`zustand/vanilla`'s `createStore`), not `zustand`'s `create` — avoids a React dependency in this package. Future steps that need React hooks should wrap with `useStore(gameStore, selector)` in `apps/game`.
- **`enableMapSet()` from Immer** is called at module load in `store.ts` because `world.exploredTiles` is a `Set<string>`. Any future package that drafts Maps/Sets via Immer must also call this or import `store.ts` first.
- **Manual persistence** (no Zustand `persist` middleware) — `Set<string>` is serialized as `{ __type: "Set", values: [...] }` in JSON. Custom serializer/deserializer in `persistence.ts`.
- **Hitpoints starts at level 10** (1,154 XP) following RuneScape convention. Other skills start at level 1 / 0 XP.
- **Selectors are pure functions** `(state) => value`, not store hooks — usable from both React (`useStore(gameStore, selector)`) and engine code (`selector(gameStore.getState())`).
- **`packages/state/tsconfig.json`** includes `"dom"` in `lib` for `localStorage`, `indexedDB`, and `window` types. Other non-browser packages (engine, shared) do not include DOM types.
- **Event-triggered saves** (on level up, quest complete) are not yet wired — the store actions don't auto-save. This should be connected in Step 3 (engine) or Step 8 (app bridge) via store subscriptions.

**Impact on future steps:**

- **Step 3 (engine):** `tick()` should read state via `gameStore.getState()` and apply results via store actions (`addXp`, `setAction`, etc.). The engine package does _not_ depend on state (no circular dep) — pass state as a parameter to `tick()`.
- **Step 4 (items):** Inventory operations should be pure functions over `InventoryState` (28-slot `(ItemStack | null)[]` array). Add corresponding store actions when integrating.
- **Step 5 (skills):** XP curve functions (`xpForLevel`, `levelForXp`, `xpToNextLevel`) are exported from `packages/state`, not `packages/skills`. Skills package should import from state or these should be moved to shared if needed by skills independently.
- **Step 8 (app bridge):** Wire `startAutoSave(gameStore.getState)` and `registerExitSave(gameStore.getState)` on app startup. Event-saves should use `gameStore.subscribe()`.

---

## Step 3: `packages/engine` — Game Loop & Tick System ✅

**Goal:** Build the core tick loop that drives all gameplay, independent of rendering.

### 3.1 — Tick Function

Implement the pure `tick()` function from the architecture:

```typescript
interface TickResult {
  skillXp: Record<SkillType, number>;
  itemsGained: ItemStack[];
  itemsConsumed: ItemStack[];
  combatEvents: CombatEvent[];
  completedObjectives: QuestObjectiveId[];
  notifications: GameNotification[];
}

function tick(state: GameState): TickResult;
```

- Reads current action queue entry
- Delegates to the appropriate action processor
- Returns a pure delta — no mutations

### 3.2 — Action Processor

Dispatch based on action type:

```
tick() → resolve current action
       ├─ GatherAction  → skill check, tool check, produce resource, grant XP
       ├─ CraftAction   → consume inputs, produce output, grant XP
       ├─ CombatAction  → run combat round (delegates to packages/combat)
       └─ IdleAction    → no-op
```

- Each processor is a pure function: `(state, actionDef) → partial TickResult`
- Action cycle tracks tick progress: when accumulated ticks >= `baseTickDuration`, cycle completes

### 3.3 — State Application

- `applyTickResult(state, tickResult) → newState`
- Adds XP, checks level-ups, adds/removes items, updates HP, checks quest objectives
- Produces notifications for the UI (level ups, rare drops, quest completions)

### 3.4 — Offline Simulation

- `simulateOffline(state, ticksElapsed) → { newState, summary }`
- Runs `tick()` in a tight loop with no rendering
- Aggregates results into a `WelcomeBackSummary` (total XP, items, levels gained)
- Cap at `MAX_OFFLINE_TICKS` (48,000 = 8 hours)

### 3.5 — Loop Runner (for `apps/game`)

- `GameLoop` class that manages the `requestAnimationFrame` tick accumulator
- Every 600ms of accumulated delta time → fire `tick()`
- `document.visibilitychange` → on re-focus, run catch-up ticks (same as offline, uncapped)
- Exposes `onTick(result: TickResult)` callback for the app bridge

### Tests

- Tick with `GatherAction` (woodcutting) → produces logs and XP after enough ticks
- Tick with `IdleAction` → empty TickResult
- `applyTickResult` correctly levels up skill when XP threshold crossed
- Offline sim for N ticks matches N sequential `tick()` calls
- Action cycle progress accumulates correctly across ticks

### Implementation Notes

**Key decisions:**

- **GameState types moved to `packages/shared`** — `GameState`, `InventoryState`, `EquipmentState`, `BankState`, `QuestStatus`, and `PlayerSettings` were moved from `packages/state/src/types.ts` to `packages/shared/src/types.ts`. This avoids a circular dependency (state depends on engine, so engine cannot import from state). State re-exports them for backwards compatibility.
- **XP functions moved to `packages/shared`** — `xpForLevel`, `levelForXp`, `xpToNextLevel` and the pre-computed `XP_TABLE` were moved from `packages/state/src/xp-table.ts` to `packages/shared/src/xp-table.ts` for the same reason. State re-exports them.
- **`TickContext` registry pattern** — `tick()` signature is `tick(state: GameState, ctx: TickContext)`. Activity definitions (`GatherActivityDef`, `CraftActivityDef`) are injected via `TickContext` rather than imported, so engine stays decoupled from the future `packages/skills` package. Step 5 should populate this registry.
- **`TickResult.updatedAction`** — The tick result includes an `updatedAction: ActionEntry | null` field that the apply step writes back to `actionQueue`. This is how tick countdown (`ticksRemaining`) is decremented and how processors signal auto-restart or fall back to idle.
- **Two apply variants** — `applyTickResult()` (immutable, clones via `structuredClone`) for real-time use, and `applyTickResultMut()` (mutates in-place) for offline simulation performance.
- **`GameLoop` constructor** takes `getState`, `setState`, `ctx`, and callbacks — it owns the tick→apply→setState cycle. The app bridge provides `getState`/`setState` wired to the Zustand store.
- **Combat is a placeholder** — `processCombat()` immediately returns idle with a "not yet available" notification. Step 6 should replace this with real combat logic, potentially via an optional `combatProcessor` callback in `TickContext`.
- **Engine tsconfig includes `"dom"`** in `lib` for `GameLoop` (uses `requestAnimationFrame`, `document`, `performance`).

**Impact on future steps:**

- **Step 4 (items):** Inventory helpers (`addItemToInventory`, `removeItemFromInventory`, `hasItems`, `countFreeSlots`) are exported from `packages/engine/src/helpers.ts`. The items package may want its own pure inventory operations — consider whether to share or duplicate. Engine helpers treat all items as stackable for simplicity.
- **Step 5 (skills):** Must produce a `TickContext` object with `activities.gather` and `activities.craft` registries keyed by activity ID. The `GatherActivityDef` and `CraftActivityDef` interfaces are exported from `packages/engine`.
- **Step 6 (combat):** Replace `processCombat()` placeholder. Consider adding a `combatResolver` callback to `TickContext` so combat logic lives in `packages/combat` but is invoked by the engine.
- **Step 8 (app bridge):** Wire `GameLoop` with `getState: () => gameStore.getState()`, `setState: (s) => gameStore.getState().loadState(s)`, and a populated `TickContext`. Also wire `startAutoSave` and `registerExitSave` on startup. Offline catch-up on initial load should use `simulateOffline()` with ticks computed from `timestamps.lastTick`.

---

## Step 4: `packages/items` — Item Database & Inventory ✅

**Goal:** Define all MVP items and implement inventory/equipment operations.

### 4.1 — Item Definitions

Implement the `ItemDef` interface:

```typescript
interface ItemDef {
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
```

Define all MVP items as a static registry:

- **Resources:** Normal log, oak log, copper ore, tin ore, iron ore, coal, bronze bar, iron bar, raw shrimp, raw trout
- **Food:** Cooked shrimp (heals 3), cooked trout (heals 7), burnt fish
- **Tools:** Bronze axe, iron axe, bronze pickaxe, iron pickaxe, fishing rod
- **Equipment:** Bronze/iron variants of sword, dagger, helm, platebody, platelegs, shield
- **Quest items:** As needed by Step 8

### 4.2 — Inventory Operations

Pure functions over state:

```typescript
addItem(inventory, itemId, qty)     → updated inventory | 'full'
removeItem(inventory, itemId, qty)  → updated inventory | 'insufficient'
equipItem(inventory, equipment, itemId) → { inventory, equipment }
unequipItem(inventory, equipment, slot) → { inventory, equipment }
hasItem(inventory, itemId, qty)     → boolean
```

- Stackable items merge into existing slots
- Non-stackable items (equipment) take one slot each
- Grid-based: fixed number of slots (28 for MVP, matching RuneScape)

### 4.3 — Bank Operations

- Same interface as inventory but with larger capacity (100 slots)
- `deposit(inventory, bank, itemId, qty)` and `withdraw(bank, inventory, itemId, qty)`

### 4.4 — Shop Operations

- `buyItem(gold, inventory, itemId, qty, shopDef) → { gold, inventory } | error`
- `sellItem(gold, inventory, itemId, qty) → { gold, inventory }`
- Bulk selling applies diminishing returns to price

### Tests

- Add stackable item merges quantity
- Add item to full inventory returns error
- Equip/unequip swaps correctly between inventory and equipment
- Shop buy deducts gold, shop sell adds gold
- Bank deposit/withdraw round-trips

### Implementation Notes

**Key decisions:**

- **Immutable inventory operations** — All functions in `packages/items` (`addItem`, `removeItem`, `equipItem`, etc.) are pure and return new state. This contrasts with the mutating helpers in `packages/engine/src/helpers.ts` which exist for tick-loop performance. The two sets serve different purposes and are intentionally separate.
- **`addItem` takes an `ItemDef` parameter** — rather than looking up from the registry internally. This keeps functions pure and registry-independent, letting callers pass any item definition.
- **Result types use discriminated unions** — `{ ok: true; inventory } | { ok: false; reason }` pattern for all operations. Avoids exceptions and makes error handling explicit.
- **Non-stackable items always occupy one slot per unit** — Equipment and tools each take one inventory slot with `quantity: 1`. `addItem` with `qty: 3` for a non-stackable creates 3 separate slots.
- **Bank always stacks** — All items stack in the bank regardless of their `stackable` flag, matching RuneScape convention.
- **No diminishing returns on selling** — Kept simple for MVP. Bulk sell is `sellValue × qty`.
- **~40 items in registry** — Resources (10), food (3), tools (5), equipment (12 = bronze+iron × 6 slots), misc drops (8 including bones, feathers, pelts, guardian's crest).
- **`ShopDef` interface** — Defines shop stock with `basePrice` per item. Shop instances should be created by the quest/world step.

**Impact on future steps:**

- **Step 5 (skills):** Activity outputs reference item IDs from this registry (e.g. `"normal-log"`, `"bronze-bar"`). Activity definitions should use the same string IDs.
- **Step 6 (combat):** Monster loot tables reference item IDs from this registry. `getItem(id)` can be used to look up `healAmount` for auto-eat, `equipStats` for damage calculations.
- **Step 8 (app bridge):** UI should call `addItem`/`removeItem`/`equipItem` etc. from this package and write results to the Zustand store. Consider adding store actions that wrap these pure functions.
- **Step 9 (UI):** Item icons reference `ItemDef.icon` — these need matching sprite assets in `apps/game/public/assets/items/`.

---

## Step 5: `packages/skills` — Skill System & Activities ✅

**Goal:** Define skills, XP curves, and the activity registry that the engine processes.

### 5.1 — Skill Registry

```typescript
interface SkillDef {
  type: SkillType;
  name: string;
  category: "gathering" | "production" | "combat";
  xpCurve: (level: number) => number;
  milestones: Milestone[];
}
```

MVP skills: Woodcutting, Mining, Fishing, Smithing, Cooking, Attack, Strength, Hitpoints

### 5.2 — XP Curve

RuneScape-style exponential curve:

```
Formula: floor(sum(floor(L + 300 * 2^(L/7)) / 4) for L = 1 to level-1)
```

- `xpForLevel(level) → totalXpRequired`
- `levelForXp(xp) → currentLevel`
- `xpToNextLevel(xp, currentLevel) → remaining`

### 5.3 — Activity Definitions

```typescript
interface ActivityDef {
  id: string;
  skill: SkillType;
  baseTickDuration: number;
  levelRequired: number;
  toolRequired?: ItemId;
  locationRequired?: StructureId;
  inputs?: ItemStack[];
  outputs: ItemStack[];
  xpReward: number;
}
```

Define all MVP activities:

| Activity            | Skill       | Ticks | Level | Inputs               | Outputs       | XP  |
| ------------------- | ----------- | ----- | ----- | -------------------- | ------------- | --- |
| Chop normal tree    | Woodcutting | 7     | 1     | —                    | Normal log    | 25  |
| Chop oak tree       | Woodcutting | 10    | 15    | —                    | Oak log       | 37  |
| Mine copper         | Mining      | 7     | 1     | —                    | Copper ore    | 17  |
| Mine tin            | Mining      | 7     | 1     | —                    | Tin ore       | 17  |
| Mine iron           | Mining      | 10    | 15    | —                    | Iron ore      | 35  |
| Fish shrimp         | Fishing     | 7     | 1     | —                    | Raw shrimp    | 10  |
| Fish trout          | Fishing     | 10    | 20    | —                    | Raw trout     | 50  |
| Smelt bronze        | Smithing    | 5     | 1     | Copper ore + tin ore | Bronze bar    | 6   |
| Smelt iron          | Smithing    | 5     | 15    | Iron ore             | Iron bar      | 12  |
| Smith bronze dagger | Smithing    | 5     | 1     | 1 bronze bar         | Bronze dagger | 12  |
| Smith iron dagger   | Smithing    | 5     | 15    | 1 iron bar           | Iron dagger   | 25  |
| Cook shrimp         | Cooking     | 5     | 1     | Raw shrimp           | Cooked shrimp | 30  |
| Cook trout          | Cooking     | 5     | 15    | Raw trout            | Cooked trout  | 70  |

### 5.4 — Milestones

- Every 5 levels: unlock notification
- Key unlocks tied to activity `levelRequired` (oak trees at 15, iron ore at 15, trout at 20)
- Milestones feed into the quest and UI systems

### Tests

- XP curve matches known values (level 2 = 83, level 10 = 1,154, level 99 = 13,034,431)
- `levelForXp` is inverse of `xpForLevel`
- Activity lookup by skill and level returns correct available activities
- Activity requirements validated (level, tool, inputs)

### Implementation Notes

**Key decisions:**

- **XP functions not duplicated** — `xpForLevel`, `levelForXp`, `xpToNextLevel` already live in `packages/shared/src/xp-table.ts` (moved there in Step 3). Skills package does not re-export them — consumers import from shared directly.
- **`SkillDef` does not include `xpCurve`** — The plan specified `xpCurve: (level: number) => number` per skill, but all skills use the same RuneScape formula. Since the curve is shared and already in `packages/shared`, there's no per-skill curve function. If custom curves are needed later, add it then.
- **Engine dependency added** — `packages/skills/package.json` depends on `@realm-of-idlers/engine` to import `GatherActivityDef`, `CraftActivityDef`, `TickContext` types directly. No circular dependency (skills → engine → shared is linear).
- **`createTickContext()`** — Factory function that returns a populated `TickContext` ready to pass to `tick()`. This is the bridge between the skills data and the engine.
- **Helper functions** — `getActivitiesForSkill(skill)` and `getAvailableActivities(skill, level)` for UI to query what a player can do.
- **13 activities total** — 7 gather (woodcutting ×2, mining ×3, fishing ×2) + 6 craft (smithing ×4, cooking ×2). Matches the plan table exactly.

**Impact on future steps:**

- **Step 6 (combat):** Combat skills (attack, strength, hitpoints) have no activities yet — they gain XP from combat rounds, not from the activity system.
- **Step 8 (app bridge):** Call `createTickContext()` on startup and pass to `GameLoop`. When skills package adds new activities, no engine changes needed.
- **Step 9 (UI):** Use `getActivitiesForSkill()` and `getAvailableActivities()` to populate skill detail modals with "Start" buttons for each available activity.

---

## Step 6: `packages/combat` — Combat System ✅

**Goal:** Implement idle auto-combat with the 3 combat skills.

### 6.1 — Combat Resolution

```typescript
interface CombatRound {
  playerHit: boolean;
  playerDamage: number;
  monsterHit: boolean;
  monsterDamage: number;
  playerHp: number;
  monsterHp: number;
  loot?: ItemStack[];
  xpGained?: { attack: number; strength: number; hitpoints: number };
  playerDied: boolean;
  ateFood?: ItemId;
}

function resolveCombatRound(state: GameState, monster: MonsterInstance): CombatRound;
```

### 6.2 — Damage Formula

```
accuracy = attackLevel + equipmentAttackBonus
maxHit   = strengthLevel + equipmentStrengthBonus
hitChance = accuracy / (accuracy + enemyDefence)

if (random() < hitChance):
  damage = random(1, maxHit)
else:
  damage = 0
```

- Combat round fires every 4 ticks (2.4 seconds)
- Both player and monster attack each round

### 6.3 — Auto-Eat

- When player HP drops below threshold (default 50%), consume best food from inventory
- If no food available and HP reaches 0 → death
- Death: respawn at town tile, deduct 10% gold, no item loss

### 6.4 — Monster Definitions

10 Briarwood monsters scaling from level 1–20:

| Monster            | Combat Level | HP  | Atk | Str | Def | Notable Drops                 |
| ------------------ | ------------ | --- | --- | --- | --- | ----------------------------- |
| Chicken            | 1            | 3   | 1   | 1   | 1   | Feathers, bones               |
| Rat                | 2            | 5   | 1   | 2   | 1   | Rat tail, bones               |
| Spider             | 4            | 8   | 3   | 3   | 2   | Spider silk, bones            |
| Goblin             | 5            | 12  | 4   | 4   | 3   | Gold (5-15), bronze dagger    |
| Skeleton           | 8            | 18  | 7   | 6   | 5   | Bones, iron dagger            |
| Wolf               | 10           | 22  | 8   | 8   | 4   | Wolf pelt, raw meat           |
| Bandit             | 12           | 28  | 10  | 9   | 7   | Gold (20-50), iron sword      |
| Dark Mage          | 15           | 32  | 12  | 11  | 6   | Runes, mystic robe            |
| Troll              | 18           | 45  | 14  | 15  | 12  | Gold (50-100), troll hide     |
| Briarwood Guardian | 20           | 60  | 16  | 18  | 15  | Unique drop: Guardian's Crest |

### 6.5 — Loot Tables

- Weighted RNG per monster: `{ itemId, weight, minQty, maxQty }`
- Always-drop table (bones, gold) + rare-drop table (equipment, uniques)
- Drop log: track which drops the player has received per monster

### Tests

- Hit chance formula returns values in [0, 1]
- Damage output is within [0, maxHit] range
- Auto-eat triggers at correct threshold
- Death resets position and deducts gold
- Loot table weights sum correctly, all items resolvable
- Monster kill grants correct XP split (Attack, Strength, Hitpoints)

### Implementation Notes

**Key decisions:**

- **Dependency injection via `TickContext.processCombatTick`** — Engine can't depend on combat (would create state→engine→combat→state cycle). Instead, `TickContext` has an optional `processCombatTick?: (state, action) => TickResult` callback. The app bridge populates this using `createCombatProcessor()` from packages/combat. Engine's `processCombat()` calls it if available, falls back to "not available" otherwise.
- **`CombatAction` extended with runtime state** — Added optional `monsterCurrentHp` and `tickCounter` fields to track combat state across ticks. Initialized on first tick, updated via `TickResult.updatedAction` each tick.
- **Combat rounds every 4 ticks (2.4s)** — Tick counter increments each tick; combat round resolves when counter reaches 4, then resets.
- **Injectable RNG** — All randomized functions (`rollLoot`, `createCombatProcessor`) accept an optional `rng: () => number` parameter for deterministic testing.
- **XP minimum of 1** — `Math.max(1, Math.floor(monster.hp / N))` ensures even weak monsters (chicken HP=3) grant at least 1 XP per skill on kill.
- **Player HP simplified** — Uses `hitpoints.level` as both current and max HP for each combat round. Full HP tracking across rounds would require additional state in `CombatAction`.
- **Gold drops** — Stored as `{ itemId: "gold", quantity: N }` in loot. The app bridge should convert gold drops to player gold (not inventory items). Currently gold drops appear in `itemsGained` for the loot event.
- **Engine dependency added to combat** — For importing `TickResult` type. No circular dep (combat→engine→shared is linear).

**Impact on future steps:**

- **Step 8 (app bridge):** Must call `createCombatProcessor(MONSTERS, ITEMS)` and set it on the `TickContext` as `processCombatTick`. Also handle gold drops from combat (convert `gold` itemId in `itemsGained` to `player.gold` increase).
- **Step 9 (UI):** Combat events in `TickResult.combatEvents` can drive damage number display, hit/miss animations. Monster death events include `itemsDropped` for loot popups.
- **Step 10 (Quests):** Kill-count quest objectives should track monster deaths from combat events. The `"Pest Control"` quest (kill 20 rats) needs to count `CombatEvent { type: "death", source: "monster" }` events.

---

## Step 7: `packages/world` — Tile Engine & Pathfinding ✅

**Goal:** Define the Briarwood map data, tile system, chunk rendering, and pathfinding.

### 7.1 — Tile Data Structures

```typescript
interface TileData {
  terrain: TerrainType;
  elevation: 0 | 1 | 2 | 3;
  walkable: boolean;
  resourceNode?: ResourceNodeDef;
  decoration?: DecorationId;
  structure?: StructureId;
}

type TileMap = TileData[][]; // [row][col], 64x64
```

### 7.2 — Briarwood Map

Author the 64x64 Briarwood map as a typed constant or static JSON asset:

- **Town center** (~10x10 area): forge, shop, bank, cooking range, quest NPCs
- **Forest zones** (NW, NE): trees (normal, oak) for woodcutting
- **Mining area** (east): copper, tin, iron rock nodes
- **River/lake** (south): fishing spots for shrimp, trout
- **Monster zones**: graduated from chickens/rats near town to guardian deep in the forest
- **Paths**: dirt tile walkways connecting zones
- **Water border**: non-walkable water tiles along edges
- **Elevation**: gentle hills (elevation 1-2) in the mining area

### 7.3 — Chunk System

- Divide 64x64 into 8x8 chunks (64 total chunks)
- `ChunkRenderer` class: creates Three.js `PlaneGeometry` meshes per tile
- Only instantiate chunks within camera frustum + 1 buffer ring (~20x20 tile viewport)
- Pool and recycle chunk meshes as camera moves
- Texture atlas for terrain tiles (512x512 atlas = 64 terrain variants)

### 7.4 — Pathfinding

- A\* algorithm over the walkability grid
- Heuristic: Manhattan distance (sufficient for grid-based movement)
- Path length cap: 50 tiles (longer paths auto-teleport)
- Used by: player click-to-move, monster roaming within spawn zones

### 7.5 — Coordinate Conversion (Three.js Layer)

- `screenToTile(mouseX, mouseY, camera, raycaster)` — Three.js raycaster picks the ground plane, converts to tile coord
- `tileToWorld` from `packages/shared` used to position all meshes and sprites

### Tests

- Briarwood map is valid: 64x64, all tiles have valid terrain type
- Town has required structures (forge, shop, bank)
- A\* finds path between two walkable tiles
- A\* returns null for unreachable tiles
- Chunk boundaries don't produce gaps or overlaps

### Implementation Notes

**Key decisions:**

- **Two-layer architecture** — Pure data layer (types, map, pathfinding, chunk math) has no Three.js dependency and is fully unit-testable. Three.js rendering layer (ChunkRenderer, screenToTile) is validated manually in Step 8.
- **Procedural map generator** — `createBriarwoodMap()` builds the 64×64 map programmatically rather than storing it as static JSON. This makes it easy to iterate on layout and add new zones.
- **Map layout** — Town center at col/row 27-36 (center of map). NW forest (normal trees), NE forest (oak trees), east mining area (elevation 1-2), south river (row 48-51), water border (2-tile ring). Dirt paths connect zones along row 32 and col 32.
- **Resource nodes link to activity IDs** — Each `ResourceNodeDef` has an `activityId` matching the skills registry (e.g. `"chop-normal-tree"`, `"mine-copper"`, `"fish-shrimp"`). This links world tiles to the engine's activity system.
- **Spawn zones** — 10 zones matching the 10 monsters from Step 6, graduated by distance from town. Each zone is a rectangular area of tile coordinates.
- **A\* pathfinding** — 4-directional, Manhattan heuristic, 50-tile default cap. Returns null for unreachable or over-cap paths.
- **Chunk math separated from rendering** — `tileToChunk`, `getChunkTiles`, `getVisibleChunks` are pure functions. `ChunkRenderer` uses them but adds Three.js mesh creation/pooling.
- **ChunkRenderer uses color placeholders** — Terrain types are color-coded (grass=green, dirt=brown, stone=gray, water=blue) until texture atlases are added in Step 8.
- **World tsconfig includes `"dom"`** for Three.js renderer.

**Impact on future steps:**

- **Step 8 (renderer):** Consume `ChunkRenderer` for tile rendering. Replace color placeholders with texture atlas. Add water UV animation. Use `screenToTile()` for click-to-move. Use `findPath()` for player movement.
- **Step 9 (UI):** Minimap can iterate `createBriarwoodMap().tiles` directly to render 1px-per-tile overview. Fog-of-war uses `world.exploredTiles` from game state.
- **Step 10 (quests):** Quest NPCs need tile positions in the town area. Spawn zones define where kill-quest monsters live.

---

## Step 8: `apps/game` — Renderer & Scene ✅

**Goal:** Wire Three.js into the app and render the Briarwood world.

### 8.1 — Scene Setup (`src/renderer/scene.ts`)

- Three.js `Scene` with `OrthographicCamera` at true isometric angle (2:1 ratio)
- Directional light for day/night cycle
- Ambient light for base illumination
- Fog for atmosphere and distance fade

### 8.2 — Tile Renderer (`src/renderer/tile-renderer.ts`)

- Consumes `packages/world` chunk system
- Creates/disposes Three.js meshes per chunk
- Applies terrain texture atlas to tile planes
- Handles animated water UV scroll

### 8.3 — Sprite Renderer (`src/renderer/sprite-renderer.ts`)

- Billboarded quads using `SpriteMaterial` with sprite sheet UV offsets
- Animation loop at 4-6 FPS for classic feel
- 8-directional idle/walk/action states
- Renders: player character, NPCs, monsters, resource nodes

### 8.4 — Camera & Input (`src/input/`)

- `mouse.ts`: Click-to-move via raycaster → tile picking → pathfinding → player movement
- Click resource node → start gather action
- Click NPC → open interaction UI
- Click monster → start combat action
- `keyboard.ts`: Hotkeys for toggling panels (I = inventory, S = skills, Q = quests)

### 8.5 — Minimap (`src/renderer/minimap.ts`)

- Separate 2D canvas overlay (top-right)
- Renders Briarwood at 1px per tile (64x64 canvas)
- Color-coded by terrain type
- Player position indicator
- Fog-of-war mask based on explored tiles

### 8.6 — Bridge (`src/bridge.ts`)

- Wires game state (Zustand) ↔ renderer ↔ UI
- On `TickResult`: update sprite positions, play animations, spawn particles
- On user input: dispatch state changes (set action, move player, open UI)

### Validate

- `vp dev` renders the Briarwood tile map
- Player sprite visible and positioned at town center
- Click-to-move works with pathfinding
- NPC and monster sprites visible in their zones
- Resource nodes visible with correct terrain placement

### Implementation Notes

**Key decisions:**

- **Bridge as central hub** — `bridge.ts` owns the full boot sequence: load/create state → create map → setup Three.js scene → create renderers → build TickContext with activities + combat → create GameLoop → wire persistence → setup input → start render loop. All integration happens here.
- **TickContext wiring** — `createTickContext()` from skills provides activities, then `createCombatProcessor(MONSTERS, ITEMS)` is assigned to `ctx.processCombatTick`. This is the dependency injection point from Step 6.
- **Separate tick and render loops** — GameLoop handles 600ms tick accumulation internally. A separate `requestAnimationFrame` loop handles rendering and movement animation at display refresh rate.
- **Click-to-move with pathfinding** — Mouse clicks → `screenToTile()` → `findPath()` → movement path stored in bridge, consumed one tile per render frame. Player position updates the store, tile renderer, sprite renderer, minimap, and camera each frame.
- **Placeholder sprites** — Player (blue box), monsters (red boxes at spawn zone centers), NPCs (yellow boxes at structure tiles). Billboard sprite sheets deferred to Step 11.
- **Minimap** — 2D canvas at 3× scale (192×192px) in top-right corner. Pre-renders terrain as ImageData, overlays player dot and fog-of-war on each update.
- **`erasableSyntaxOnly` constraint** — App tsconfig enforces this, so no TypeScript parameter properties (`constructor(private x)`) or other non-erasable syntax in app code. Classes use explicit field declarations.
- **Offline catch-up on load** — Bridge checks `timestamps.lastTick` on init and runs `simulateOffline()` for missed ticks before starting the game loop.

**Impact on future steps:**

- **Step 9 (UI):** Keyboard hotkeys dispatch `onTogglePanel` — Step 9 should implement the actual panel visibility logic in a UI store. The `#ui-overlay` div regions are ready for panel components.
- **Step 10 (Quests):** Click-on-tile handler in bridge dispatches gather actions for resource nodes. Quest NPC interaction should be added to the tile click handler (check for `tile.structure` type and open quest dialog).
- **Step 11 (Polish):** Replace `SpriteRenderer` placeholder boxes with billboard sprite sheets. Replace `ChunkRenderer` color placeholders with texture atlas. Add water UV animation in tile-renderer.ts.

---

## Step 9: `apps/game` — UI Overlay ✅

**Goal:** Parchment-themed HTML/CSS UI overlay on the Three.js canvas.

### 9.1 — UI Foundation (`src/ui/`)

- Zustand UI store (`src/ui/store.ts`): panel visibility, active modal, selected skill, tooltip state
- Vanilla CSS with custom properties for theming:
  ```css
  :root {
    --bg-parchment: #f4e4c1;
    --border-stone: #8b7d6b;
    --text-ink: #2c1810;
    --accent-gold: #c9a84c;
  }
  ```
- Mount UI components into `#ui-overlay` div regions

### 9.2 — HUD Components (`src/ui/components/`)

- **Top bar** (`hud-top`): Character name, total level, gold count
- **Skill panel** (`panel-skills`, left sidebar): 8 skills with level, XP progress bar, active action indicator
- **Action panel** (`panel-action`, bottom): Current action queue entry, progress timer, idle earnings per hour
- **Inventory** (`panel-inventory`, right sidebar): 28-slot grid, equipment slots (weapon, head, body, legs, shield)
- **Event log** (`event-log`, bottom-left): Scrollable message feed for game events

### 9.3 — Modal Screens (`src/ui/screens/`)

- **Welcome Back**: Offline gains summary with "Collect" button
- **Skill Detail**: Click skill → level, XP to next, milestones list, available activities for that skill with "Start" buttons
- **Crafting Interface**: Recipe list filtered by skill, have/need material counts, "Craft X" button
- **Quest Journal**: Active/completed quests with objectives, progress bars, rewards
- **Shop Interface**: Buy/sell tabs, item list, quantity selector, gold preview
- **Bank Interface**: Deposit/withdraw grid, drag or click to transfer
- **Settings**: Graphics quality (placeholder), UI scale, auto-eat threshold

### Validate

- All HUD panels render and update reactively when game state changes
- Clicking a skill opens the detail modal
- Inventory drag/click equip works
- Event log scrolls and shows recent messages

### Implementation Notes

**Key decisions:**

- **Vanilla DOM, no framework** — All UI components are plain TypeScript creating/updating DOM elements. Each component function returns a Zustand unsubscribe callback for cleanup.
- **Zustand vanilla UI store** — Separate `uiStore` (panel visibility, modal state, event log) from the game `gameStore`. Both are vanilla Zustand stores (no React dependency).
- **Reactive updates via `gameStore.subscribe()`** — Each HUD component subscribes to the game store and re-renders on every state change. Simple and effective for this scale.
- **Skill detail modal** — Click skill → `uiStore.selectSkill()` → modal renders with `getAvailableActivities()` from skills package. "Start" button dispatches `gameStore.setAction()` directly.
- **Inventory equip/unequip** — Click inventory item with `equipSlot` → calls `equipItem()` from items package. Click equipped slot → `unequipItem()`. Results written to store via `loadState()`.
- **Event log** — Bridge pushes `GameNotification.message` to `uiStore.pushEvent()` on each tick. Max 50 entries, auto-scroll.
- **CSS parchment theme** — Dark semi-transparent panels (`rgba(42, 28, 16, 0.9)`), gold accents (`#c9a84c`), stone borders (`#8b7d6b`). Skills left, inventory right, action bottom-center, event log bottom-left, minimap top-right.
- **Welcome-back modal** — Shows offline `OfflineSummary` on catch-up. Bridge calls `showWelcomeBack(summary)`.
- **Zustand added to app deps** — `apps/game/package.json` needed zustand directly for the UI store import.

**Impact on future steps:**

- **Step 10 (Quests):** Quest journal UI can be added as a new modal screen. The keyboard "Q" hotkey currently toggles a nonexistent panel — wire it to open a quest journal modal instead.
- **Step 11 (Polish):** Add crafting interface modal (recipe list), shop modal, bank modal, settings modal. Improve inventory with drag-and-drop. Add combat damage numbers as floating DOM elements.

---

## Step 10: Quests ✅

**Goal:** 5 introductory quests that teach core mechanics.

### 10.1 — Quest System

```typescript
interface QuestDef {
  id: QuestId;
  name: string;
  description: string;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  prerequisites: QuestId[];
}

type QuestObjective =
  | { type: "talk"; npcId: string }
  | { type: "gather"; itemId: ItemId; qty: number }
  | { type: "craft"; itemId: ItemId; qty: number }
  | { type: "kill"; monsterId: string; qty: number }
  | { type: "skill"; skill: SkillType; level: number };
```

- Quest states: `available` → `active` → `complete`
- Objectives auto-complete as conditions are met (idle-compatible)
- `completedObjectives` field in `TickResult` drives quest progress

### 10.2 — Starter Quests

1. **"Welcome to Briarwood"** — Talk to the guide NPC. Rewards: starter tools (bronze axe, bronze pickaxe, fishing rod), 100 gold. _Teaches: NPC interaction, inventory._
2. **"Timber!"** — Chop 10 normal logs. Rewards: Woodcutting XP lamp, oak shortcut unlock. _Teaches: gathering, action system._
3. **"Strike the Earth"** — Mine 10 copper + 10 tin ore, smelt 10 bronze bars. Rewards: Smithing XP, bronze sword. _Teaches: mining, production skills._
4. **"Gone Fishing"** — Catch 15 shrimp, cook them. Rewards: Cooking XP, better fishing rod. _Teaches: fishing, cooking, burn chance._
5. **"Pest Control"** — Defeat 20 rats. Rewards: combat XP, bronze shield, unlocks deeper Briarwood zones. _Teaches: combat, equipment, food/healing._

### Tests

- Quest activation sets state to active
- Objective progress tracks correctly (gather 5/10 ore)
- Quest completes when all objectives met
- Rewards apply to state (items, XP, gold)
- Prerequisites gate quest availability

### Implementation Notes

**Key decisions:**

- **Quest logic in app layer** — No `packages/quests` was scaffolded. Since quests reference items, skills, combat, and world (top of dependency tree), quest definitions and logic live in `apps/game/src/quests/`. This avoids circular dependencies.
- **Post-tick quest checking** — The bridge runs `checkQuestProgress()` after each tick rather than modifying engine processors. Quest objectives auto-complete by examining current state (inventory counts, skill levels, kill counts).
- **GameState extended** — Added `questProgress: Record<QuestId, Record<string, number>>` for tracking objective counters (craft counts, talk completions) and `killCounts: Record<string, number>` for monster kills. Both initialized as empty objects.
- **Kill tracking via combat events** — Bridge's `onTick` detects `CombatEvent { type: "death", source: "monster" }` and increments `killCounts[monsterId]` in the store.
- **Craft tracking via tick results** — When `itemsGained` includes items matching active craft quest objectives, bridge increments the quest progress counter.
- **"Welcome to Briarwood" auto-activated** — On new game, the welcome quest is set to "active". Clicking any town structure completes the "talk" objective (simplified NPC interaction).
- **Quest journal modal** — Opened via "Q" hotkey. Shows available (Accept button), active (objective progress), and completed quests. "Claim" button appears when all objectives are met.
- **Reward application** — `applyQuestRewards()` adds items to inventory, XP to skills, and gold to player via store actions.

---

## Step 11: Day/Night Cycle & Polish

**Goal:** Atmosphere, visual polish, performance, and final integration.

### 11.1 — Day/Night Cycle (`src/renderer/effects.ts`)

- Accelerated clock: 1 game day = 20 real minutes
- Directional light color transition: warm gold → orange → cool blue → pink
- Fog color shifts to match time of day
- Point lights on torches/campfires activate at night with flicker effect

### 11.2 — Visual Polish

- Water tile animated UV scroll
- Resource node animations (swaying trees, shimmering ore)
- Particle effects: mining sparks, woodchipping, level-up sparkle
- Combat damage numbers (floating text)
- Smooth camera follow on player movement

### 11.3 — Performance Optimization

- Frustum culling: only render visible chunks
- Texture atlases: tiles (512x512), sprites (1024x1024), item icons (256x256)
- Object pooling for particles and floating text
- Targets: 60 FPS on mid-range hardware, <3s initial load, <50MB total assets

### 11.4 — Integration Testing & Balancing

- End-to-end playtest: new player can complete all 5 quests
- XP curve feels rewarding (~2 hours to reach level 20 in a skill)
- Combat difficulty scales smoothly across Briarwood's 10 monsters
- Offline gains feel meaningful on return (8 hours of progress visible)
- Save/load round-trip integrity verified
- No memory leaks from chunk loading/disposal

---

## Dependency Graph

```
Step 0 (Scaffold) ──────────────────────────────────────────────────────┐
    │                                                                    │
    ▼                                                                    │
Step 1 (packages/shared) ──────────────────────────────────────────┐    │
    │                                                               │    │
    ├──► Step 2 (packages/state) ──┬──► Step 5 (packages/skills)   │    │
    │                              │         │                      │    │
    ├──► Step 3 (packages/engine) ─┘         ▼                      │    │
    │         │                    Step 6 (packages/combat)         │    │
    │         │                         │                           │    │
    ├──► Step 4 (packages/items) ◄──────┘                           │    │
    │                                                               │    │
    └──► Step 7 (packages/world) ──► Step 8 (apps/game renderer) ◄─┘    │
                                          │                              │
                                     Step 9 (apps/game UI) ◄────────────┘
                                          │
                                     Step 10 (Quests) ─── needs Steps 3-6, 9
                                          │
                                     Step 11 (Polish) ─── final pass
```

### Parallelization Opportunities

These steps can be developed concurrently once their dependencies are met:

- **Steps 4 + 5 + 7** can begin in parallel after Steps 1-2 are done
- **Step 9 (UI)** can begin after Step 0 and iterate alongside Steps 4-8
- **Step 6 (Combat)** can begin once Steps 4 + 5 are done
- **Step 8 (Renderer)** can begin once Step 7 is done

---

## Testing Strategy

All tests use `vite-plus/test`:

```typescript
import { describe, expect, it } from "vite-plus/test";
```

| Package           | What to Test                                        | Type         |
| ----------------- | --------------------------------------------------- | ------------ |
| `packages/shared` | Coordinate conversions, type guards                 | Unit         |
| `packages/state`  | Schema, migrations, selectors, save/load round-trip | Unit         |
| `packages/engine` | Tick deltas, action processing, offline sim         | Unit         |
| `packages/items`  | Inventory ops, equip/unequip, shop math             | Unit         |
| `packages/skills` | XP curve, activity registry, milestone unlocks      | Unit         |
| `packages/combat` | Damage formula, loot rolls, death, auto-eat         | Unit         |
| `packages/world`  | Map validity, pathfinding, chunk boundaries         | Unit         |
| `apps/game`       | Full gameplay loops, quest completion               | Manual + E2E |

Run all: `vp test`
Validate everything: `vp check && vp test`

---

## Tech Stack Summary

| Layer       | Technology                                                        |
| ----------- | ----------------------------------------------------------------- |
| Toolchain   | Vite+ (`vp`) — dev, build, test, lint, fmt                        |
| Renderer    | Three.js (`OrthographicCamera`, isometric)                        |
| UI          | HTML/CSS overlay, Zustand store, vanilla DOM                      |
| Game Loop   | `requestAnimationFrame` + 600ms fixed tick                        |
| Persistence | localStorage (IndexedDB fallback)                                 |
| Offline Sim | Timestamp-delta compressed tick loop                              |
| Language    | TypeScript (strict)                                               |
| Monorepo    | pnpm workspaces                                                   |
| Packages    | `shared`, `engine`, `state`, `world`, `skills`, `combat`, `items` |
| App         | `apps/game` (single deployable SPA)                               |

---

_Document Version: 2.0 — March 2026_
