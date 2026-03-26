# Architecture — Realm of Idlers

_Technical architecture for the MVP (Phase 1)_

---

## 1. Monorepo Layout

```
realm-of-idlers/
├── apps/
│   └── game/                    # Main browser client (Three.js + UI)
├── packages/
│   ├── engine/                  # Game loop, tick system, offline sim
│   ├── state/                   # State schema, store, persistence
│   ├── world/                   # Tile engine, map data, pathfinding
│   ├── skills/                  # Skill definitions, XP curves, actions
│   ├── combat/                  # Combat loop, damage calc, loot tables
│   ├── items/                   # Item database, inventory, equipment
│   └── shared/                  # Constants, types, utilities
├── docs/                        # PRD, architecture, implementation plan
├── vite.config.ts               # Root Vite+ config (lint, format, hooks)
├── pnpm-workspace.yaml          # Workspace definition
└── package.json                 # Root scripts, vp toolchain
```

### Why This Split

- **`apps/game`** is the only deployable artifact — it imports from all packages and wires them into the Three.js scene and UI overlay.
- **`packages/*`** are pure TypeScript libraries with no DOM or Three.js dependency (except `world/` which depends on Three.js for mesh generation). This keeps game logic testable without a browser.
- **`shared/`** holds cross-cutting types (`ItemId`, `SkillType`, `TileCoord`, etc.) and constants (`TICK_DURATION_MS`, `MAX_OFFLINE_TICKS`) so packages don't depend on each other for basic definitions.

### Package Dependency Graph

```
shared ◄──────────────────────────────────────────────┐
   ▲                                                   │
   ├── engine ◄── state                                │
   │     ▲          ▲                                  │
   │     │          ├── skills ◄── combat              │
   │     │          │               ▲                  │
   │     │          ├── items ◄─────┘                  │
   │     │          │                                  │
   │     │          └───────────────────┐              │
   │     │                              │              │
   │     └── world (Three.js meshes) ◄──┼── app/game ──┘
   │                                    │
   └────────────────────────────────────┘
```

Key rule: **dependencies flow inward**. `shared` depends on nothing. `engine` depends on `shared`. Packages never import from `apps/game`.

---

## 2. Application Layer (`apps/game`)

The game client is a Vite-bundled SPA that composes all packages into a running game.

### Entry Point

```
apps/game/
├── index.html                   # Canvas + UI overlay mount points
├── src/
│   ├── main.ts                  # Bootstrap: init renderer, store, game loop
│   ├── renderer/
│   │   ├── scene.ts             # Three.js scene, camera, lights
│   │   ├── tile-renderer.ts     # Chunk loading, tile mesh management
│   │   ├── sprite-renderer.ts   # Billboarded sprite animation
│   │   ├── effects.ts           # Particles, day/night, water scroll
│   │   └── minimap.ts           # Top-right minimap canvas
│   ├── input/
│   │   ├── mouse.ts             # Tile picking via raycaster
│   │   └── keyboard.ts          # Hotkeys for panels
│   ├── ui/
│   │   ├── components/          # UI components (skill panel, inventory, etc.)
│   │   ├── screens/             # Modal screens (welcome back, quest journal, etc.)
│   │   ├── store.ts             # Zustand UI store (panel visibility, selections)
│   │   └── index.ts             # Mount UI overlay
│   └── bridge.ts                # Wires game state changes → renderer + UI updates
├── public/
│   └── assets/
│       ├── tiles/               # 64x64 terrain textures
│       ├── sprites/             # Character & NPC sprite sheets
│       ├── items/               # Item icon sprites
│       └── ui/                  # Parchment frames, buttons
└── package.json
```

### Rendering Pipeline

```
requestAnimationFrame loop
  │
  ├─ Simulation tick (every 600ms) ──► engine.tick(state)
  │     └─ Returns state delta (XP gained, items produced, combat results)
  │
  ├─ State update ──► state.apply(delta)
  │     └─ Zustand notifies subscribers (UI re-renders, renderer updates)
  │
  └─ Render frame (30-60 FPS)
        ├─ Update sprite animations (UV offsets)
        ├─ Update day/night lighting
        ├─ Update particles
        └─ renderer.render(scene, camera)
```

Simulation and rendering are **decoupled**. The tick runs at a fixed 600ms interval regardless of frame rate. Multiple ticks can fire between renders if the tab was backgrounded.

---

## 3. Engine (`packages/engine`)

The core loop that drives the entire game, independent of rendering.

### Tick System

```typescript
// Simplified tick interface
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

- **Active mode:** `requestAnimationFrame` drives a tick accumulator. Every 600ms of accumulated time, `tick()` fires.
- **Offline mode:** On load, calculate `ticksElapsed = min((now - lastSave) / 600, MAX_OFFLINE_TICKS)`. Run `tick()` in a tight loop (no rendering) to produce a cumulative `TickResult` for the welcome-back screen.
- **Background tab:** `document.visibilitychange` switches to timestamp-based catch-up on re-focus, same as offline but uncapped.

### Action Processor

The engine delegates to an action processor based on the current action queue entry:

```
tick() → resolve current action
       ├─ GatherAction  → skill check, tool check, produce resource, grant XP
       ├─ CraftAction   → consume inputs, produce output, grant XP
       ├─ CombatAction  → run combat round (see combat package)
       └─ IdleAction     → no-op (player standing in town)
```

---

## 4. State (`packages/state`)

### Schema

```typescript
interface GameState {
  version: number;
  player: {
    name: string;
    position: TileCoord;
    gold: number;
  };
  skills: Record<SkillType, { level: number; xp: number }>;
  inventory: InventoryState;
  equipment: EquipmentState;
  bank: BankState;
  actionQueue: ActionEntry[];
  quests: Record<QuestId, QuestStatus>;
  world: {
    resourceNodes: Record<NodeId, { depleted: boolean; respawnAt: number }>;
    exploredTiles: Set<string>; // serialized as array
  };
  settings: PlayerSettings;
  timestamps: {
    lastSave: number;
    lastTick: number;
    created: number;
  };
}
```

### Store

- Zustand store wrapping `GameState`
- Immutable updates via Immer (or Zustand's built-in produce)
- Selectors for derived values: `totalLevel`, `combatLevel`, `xpToNextLevel(skill)`
- Subscriptions for UI and renderer sync

### Persistence

```
GameState ──► JSON.stringify ──► localStorage (key: "realm-of-idlers-save")
                                     │
                                     ├─ Auto-save: every 30s via setInterval
                                     ├─ Event-save: level up, quest complete
                                     ├─ Exit-save: beforeunload listener
                                     │
                              On load:
                              localStorage ──► JSON.parse ──► migrate(version) ──► GameState
```

- Save versioning: each schema change increments `version`. A migration registry maps `v(N) → v(N+1)` transforms.
- If `localStorage` exceeds quota, fall back to IndexedDB via a thin adapter.

---

## 5. World (`packages/world`)

### Tile Map

```typescript
interface TileData {
  terrain: TerrainType; // grass, dirt, stone, water, etc.
  elevation: 0 | 1 | 2 | 3; // gentle hills
  walkable: boolean;
  resourceNode?: ResourceNodeDef;
  decoration?: DecorationId;
  structure?: StructureId;
}

type TileMap = TileData[][]; // [row][col], 64x64 for Briarwood
```

- Map data stored as compressed JSON, loaded at startup
- Authored as a typed constant or loaded from a static asset

### Chunk Renderer

- Divides the 64x64 map into chunks (e.g., 8x8 tiles per chunk)
- Only chunks within the camera frustum + 1 buffer ring are instantiated as Three.js meshes
- Chunk meshes are pooled and recycled as the camera moves
- Each tile becomes a textured `PlaneGeometry` positioned in isometric space

### Pathfinding

- A\* over the walkability grid
- Heuristic: Manhattan distance adjusted for isometric tile layout
- Path capped at reasonable length (e.g., 50 tiles) — longer paths auto-teleport to nearest valid tile
- Used by player movement and monster roaming AI

### Coordinate Systems

```
Tile coords:  (col, row) integers — canonical position in game logic
World coords: (x, y, z) floats — Three.js scene position
Screen coords: (px, py) — mouse position → raycasted to tile coord
```

Conversion utilities live in `packages/shared`:

- `tileToWorld(col, row, elevation) → Vector3`
- `worldToTile(Vector3) → { col, row }`
- `screenToTile(mouseX, mouseY, camera) → { col, row }` (via Three.js raycaster)

---

## 6. Skills (`packages/skills`)

### Skill Registry

```typescript
interface SkillDef {
  type: SkillType;
  name: string;
  category: "gathering" | "production" | "combat" | "utility";
  maxLevel: 99;
  xpCurve: (level: number) => number; // XP required for given level
  milestones: Milestone[]; // unlocks at level thresholds
}
```

MVP skills: `Woodcutting`, `Mining`, `Fishing`, `Smithing`, `Cooking`, `Attack`, `Strength`, `Hitpoints`

### Activity Definitions

```typescript
interface ActivityDef {
  id: string;
  skill: SkillType;
  baseTickDuration: number; // ticks per action cycle
  levelRequired: number;
  toolRequired?: ItemId;
  locationRequired?: StructureId; // e.g., forge for smithing
  inputs?: ItemStack[]; // consumed per cycle (ores for smelting)
  outputs: ItemStack[]; // produced per cycle
  xpReward: number;
}
```

Activities are the atomic unit of gameplay. The engine's action processor looks up the activity definition and resolves each cycle.

### XP Curve

Exponential curve matching RuneScape style:

```
Level  2:      83 XP
Level 10:   1,154 XP
Level 25:   8,740 XP
Level 50:  101,333 XP
Level 75:  1,210,421 XP
Level 99: 13,034,431 XP
```

Formula: `floor(sum(floor(L + 300 * 2^(L/7)) / 4) for L = 1 to level-1)`

---

## 7. Combat (`packages/combat`)

### Combat Resolution

```typescript
interface CombatRound {
  playerHit: boolean;
  playerDamage: number;
  monsterHit: boolean;
  monsterDamage: number;
  playerHp: number;
  monsterHp: number;
  loot?: ItemStack[]; // if monster dies
  xpGained?: CombatXpGain; // if monster dies
  playerDied: boolean;
  ateFood?: ItemId; // if auto-eat triggered
}

function resolveCombatRound(state: GameState, monster: MonsterInstance): CombatRound;
```

### Damage Formula

```
accuracy = attackLevel + equipmentAttackBonus
maxHit   = strengthLevel + equipmentStrengthBonus
hitChance = accuracy / (accuracy + enemyDefence)

if (random() < hitChance):
  damage = random(1, maxHit)
else:
  damage = 0
```

### Monster Definitions

```typescript
interface MonsterDef {
  id: string;
  name: string;
  combatLevel: number;
  hp: number;
  attack: number;
  strength: number;
  defence: number;
  attackSpeed: number; // ticks between attacks
  lootTable: LootTableEntry[];
  spawnZone: { region: string; tiles: TileCoord[] };
  respawnTicks: number;
}
```

---

## 8. Items (`packages/items`)

### Item Database

```typescript
interface ItemDef {
  id: ItemId;
  name: string;
  icon: string; // sprite sheet reference
  category: ItemCategory; // resource, equipment, food, tool, quest
  stackable: boolean;
  sellValue: number; // gold when sold to NPC
  equipSlot?: EquipSlot; // if equippable
  equipStats?: EquipStats; // attack/strength/defence bonuses
  healAmount?: number; // if food
  toolPower?: number; // if tool (affects gather speed)
}
```

Items are defined as a static registry. All item logic (stacking, equipping, consuming) lives in this package.

### Inventory Operations

```
addItem(inventory, item, qty)     → updated inventory or "full" error
removeItem(inventory, item, qty)  → updated inventory or "insufficient" error
equipItem(inventory, equipment, itemId) → swap equipped ↔ inventory
```

All operations are pure functions over state — no side effects.

---

## 9. UI Architecture

### Overlay Structure

```html
<!-- index.html -->
<body>
  <canvas id="game-canvas"></canvas>
  <!-- Three.js renders here -->
  <div id="ui-overlay">
    <!-- HTML/CSS UI on top -->
    <div id="hud-top"></div>
    <!-- Name, level, gold -->
    <div id="panel-skills"></div>
    <!-- Left sidebar -->
    <div id="panel-inventory"></div>
    <!-- Right sidebar -->
    <div id="panel-action"></div>
    <!-- Bottom bar -->
    <div id="minimap"></div>
    <!-- Top-right -->
    <div id="event-log"></div>
    <!-- Bottom-left -->
    <div id="modal-root"></div>
    <!-- Screens overlay -->
  </div>
</body>
```

### State Flow

```
GameState (Zustand)
   │
   ├──► UI components subscribe to slices
   │      ├─ SkillPanel subscribes to state.skills
   │      ├─ InventoryGrid subscribes to state.inventory
   │      ├─ ActionBar subscribes to state.actionQueue
   │      └─ EventLog subscribes to notifications
   │
   └──► User interactions dispatch actions
          ├─ Click skill → open skill detail modal
          ├─ Click tile → set movement target
          ├─ Click "Chop Trees" → set action queue entry
          └─ Click shop item → buy/sell transaction
```

### Styling Approach

- Vanilla CSS with CSS custom properties for theming
- Parchment aesthetic: `--bg-parchment`, `--border-stone`, `--text-ink`, `--accent-gold`
- No CSS framework — the UI is bespoke and game-specific
- Responsive only to the extent of filling the viewport; desktop-first for MVP

---

## 10. Data Flow Overview

```
                    ┌─────────────────────────────────┐
                    │          apps/game               │
                    │                                  │
 User Input ──────► │  input/ ──► bridge.ts            │
 (click, key)       │               │                  │
                    │               ▼                  │
                    │  ┌─── packages/state ───┐        │
                    │  │     GameState store   │◄── Load from localStorage
                    │  └──────────┬───────────┘        │
                    │             │                     │
                    │             ▼                     │
                    │  ┌─── packages/engine ──┐        │
                    │  │  tick() every 600ms  │        │
                    │  │    ├─ skills/        │        │
                    │  │    ├─ combat/        │        │
                    │  │    └─ items/         │        │
                    │  └──────────┬───────────┘        │
                    │             │                     │
                    │        TickResult                 │
                    │             │                     │
                    │    ┌────────┴────────┐            │
                    │    ▼                 ▼            │
                    │  state.apply()   renderer/        │
                    │    │             sprite, tile,     │
                    │    ▼             effects           │
                    │  UI overlay         │              │
                    │  (Zustand ──►       ▼              │
                    │   components)   Three.js canvas    │
                    │                                    │
                    │  ──► Save to localStorage ──►     │
                    └─────────────────────────────────┘
```

---

## 11. Build & Development

### Commands

| Command                | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `vp install`           | Install all workspace dependencies         |
| `vp dev`               | Start Vite dev server for `apps/game`      |
| `vp build`             | Production build                           |
| `vp test`              | Run all package tests via Vitest           |
| `vp check`             | Format + lint + typecheck across workspace |
| `vp lint --type-aware` | Deep lint with type information            |

### Development Workflow

1. Run `vp install` after pulling changes
2. Run `vp dev` — opens browser with hot-reload
3. Game logic changes in `packages/*` are tested headlessly via `vp test`
4. Rendering changes in `apps/game/src/renderer/` are tested visually in browser
5. Run `vp check` before committing

### Testing Strategy

| Layer             | What to test                                  | How                      |
| ----------------- | --------------------------------------------- | ------------------------ |
| `packages/engine` | Tick produces correct deltas                  | Unit tests (Vitest)      |
| `packages/state`  | Migrations, selectors, persistence round-trip | Unit tests               |
| `packages/skills` | XP curve, activity resolution, level unlocks  | Unit tests               |
| `packages/combat` | Damage formulas, loot rolls, death handling   | Unit tests               |
| `packages/items`  | Inventory ops, equip/unequip, stack logic     | Unit tests               |
| `packages/world`  | Pathfinding, coordinate conversion            | Unit tests               |
| `apps/game`       | Integration: full gameplay loops              | Manual + lightweight E2E |

All test imports use `vite-plus/test`:

```typescript
import { describe, expect, it } from "vite-plus/test";
```

---

## 12. Asset Pipeline

### Tile Textures

- 64x64 PNG sprites, organized into texture atlases (e.g., 512x512 atlas = 64 tiles)
- Loaded lazily per chunk; cached in GPU memory
- Format: `public/assets/tiles/{terrain}-{variant}.png`

### Sprite Sheets

- Character/NPC/monster sprite sheets: 8 directions x N frames per animation
- Packed into atlases with a JSON manifest mapping `(action, direction, frame) → UV rect`
- Format: `public/assets/sprites/{entity}-sheet.png` + `{entity}-sheet.json`

### Item Icons

- 32x32 PNG icons for inventory/shop display
- Single atlas with JSON manifest
- Format: `public/assets/items/icons-atlas.png` + `icons-atlas.json`

---

## 13. Key Design Decisions

| Decision                                   | Rationale                                                                                                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monorepo with isolated packages**        | Game logic is testable without a browser. Packages enforce separation of concerns.                                                                       |
| **600ms fixed tick**                       | Matches idle-game granularity. Fast enough to feel responsive, slow enough to be cheap for offline sim.                                                  |
| **Zustand for UI state**                   | Lightweight, works with vanilla TS or any UI approach. No framework lock-in.                                                                             |
| **localStorage first, IndexedDB fallback** | Simplest persistence for MVP. Server sync is Phase 2.                                                                                                    |
| **Pure functions for game logic**          | `tick(state) → delta` is deterministic and testable. No hidden side effects in the simulation.                                                           |
| **HTML/CSS overlay, not Three.js UI**      | Game UI is complex (panels, grids, text). HTML/CSS is far more productive than in-canvas UI rendering.                                                   |
| **No framework for UI (MVP)**              | Keeps bundle small and avoids framework churn. Zustand + vanilla DOM manipulation is sufficient for MVP panels. Revisit if UI complexity warrants React. |

---

_Document Version: 1.0 — March 2026_
