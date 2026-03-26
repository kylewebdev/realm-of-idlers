# Product Requirements Document: **Realm of Idlers**

### A Three.js Tile-Based Idle Adventure

---

## 1. Vision & Overview

**Realm of Idlers** is a browser-based idle adventure game rendered in Three.js that marries the isometric, pixel-art aesthetic of _Ultima Online_ (circa 1997–2002) with the progression-driven idle mechanics of _Bloobs Idle Adventure_ and the skill-based sandbox gameplay of _RuneScape_.

Players explore a persistent tile-based world, assign their character to gather resources, train skills, fight monsters, and craft items — all while progress continues whether the player is actively watching or away. The game rewards both active micro-management and passive idle accumulation.

**Target Platform:** Modern web browsers (desktop-first, mobile-responsive)
**Engine:** Three.js with orthographic/isometric camera
**Monetization:** Free-to-play, optional cosmetic shop (no pay-to-win)

---

## 2. Pillars of Design

1. **Nostalgic Aesthetic** — Evoke the look and feel of Ultima Online: hand-painted tile textures, sprite-based characters on 3D terrain, atmospheric lighting, and a muted fantasy color palette.
2. **Idle-First Progression** — The game plays itself. Players make strategic decisions about _what_ to do, not _how_ to do it. All actions auto-execute on timers.
3. **Depth Through Skills** — A RuneScape-inspired skill system where every activity feeds into interconnected progression loops.
4. **One More Thing** — Every session should surface a new unlock, milestone, or decision that keeps the player engaged.

---

## 3. Art Direction & Rendering

### 3.1 Visual Style

- **Camera:** Fixed isometric (true isometric 2:1 ratio), orthographic projection. Optional slight rotation via drag.
- **Tiles:** 64×64 pixel pre-rendered tile textures applied to flat Three.js plane geometries. Terrain types include grass, dirt, sand, stone, water (animated UV scroll), swamp, snow, and dungeon floors.
- **Characters & NPCs:** 2D sprite sheets rendered on billboarded quads facing the camera. 8-directional idle/walk/action animations at 4–6 FPS for that classic feel.
- **Structures:** Low-poly 3D models with pixel-art textures (houses, shops, forges, altars, mine entrances). Keep poly counts under 500 per structure.
- **Lighting:** Baked ambient light with a dynamic day/night cycle using Three.js directional light and fog color shifts. Torches and campfires use point lights with flicker.
- **UI Overlay:** HTML/CSS overlay on top of the Three.js canvas. Styled to look like a worn parchment / stone UI frame — reminiscent of UO's gump system.

### 3.2 Tile Map System

- World built from a 2D tile array (e.g., 256×256 tiles for the overworld).
- Chunk-based loading: render a viewport of ~20×20 tiles around the player, lazy-load adjacent chunks.
- Each tile stores: terrain type, elevation (0–3 levels for gentle hills), walkability flag, resource node reference, decoration layer.
- Tile data stored as compressed JSON or binary; loaded from server or IndexedDB for offline.

### 3.3 Audio

- Ambient soundscapes per biome (forest birds, dungeon drips, ocean waves).
- Retro-style SFX for actions (pickaxe strike, sword clash, spell cast, level-up fanfare).
- Optional chiptune/orchestral background music.

---

## 4. Core Gameplay Loop

```
┌──────────────────────────────────────────────────┐
│                                                  │
│   CHOOSE ACTIVITY ──► AUTO-EXECUTE ON TIMER      │
│        │                      │                  │
│        │               GAIN XP + RESOURCES       │
│        │                      │                  │
│        │               LEVEL UP SKILL            │
│        │                      │                  │
│        │              UNLOCK NEW ACTIVITY /       │
│        │              AREA / RECIPE / GEAR        │
│        │                      │                  │
│        └──────────────────────┘                  │
│                                                  │
│   (Loop continues while idle or active)          │
└──────────────────────────────────────────────────┘
```

### 4.1 Action Queue

- Players assign their character to an activity (e.g., "Chop Oak Trees").
- The character walks to the nearest valid tile, begins the action, and repeats indefinitely.
- Each action has a **base timer** (e.g., 4 seconds to chop) modified by skill level, equipment, and buffs.
- An **action queue** (up to 5 slots, expandable) lets players chain tasks: "Mine 100 copper ore → Smelt into bars → Smith into daggers."

### 4.2 Idle / Offline Progression

- When the player closes the browser, the server (or a Web Worker simulation) calculates offline gains based on the last assigned activity.
- Offline gains are capped at 8 hours by default (upgradeable to 24 hours).
- On return, a "Welcome Back" screen shows: resources gained, XP earned, levels achieved, and any rare drops.

---

## 5. Skills System

Inspired by RuneScape's 23+ skills. Each skill levels from 1 to 99 (with prestige beyond). XP curve is exponential.

### 5.1 Gathering Skills

| Skill           | Description                            | Resources Produced                        |
| --------------- | -------------------------------------- | ----------------------------------------- |
| **Woodcutting** | Chop trees across biomes               | Logs (normal, oak, willow, yew, magic)    |
| **Mining**      | Extract ore from rock nodes            | Copper, tin, iron, coal, mithril, adamant |
| **Fishing**     | Catch fish from water tiles            | Shrimp, trout, salmon, lobster, swordfish |
| **Farming**     | Plant and harvest crops on tilled soil | Wheat, herbs, vegetables, rare seeds      |
| **Foraging**    | Gather wild herbs, mushrooms, berries  | Alchemy and cooking ingredients           |

### 5.2 Production Skills

| Skill            | Description                              | Output                   |
| ---------------- | ---------------------------------------- | ------------------------ |
| **Smithing**     | Smelt ore into bars, forge weapons/armor | Metal equipment          |
| **Cooking**      | Prepare fish and crops into healing food | Healing items, buff food |
| **Crafting**     | Create leather armor, jewelry, furniture | Accessories, home décor  |
| **Alchemy**      | Brew potions from herbs and reagents     | Buff potions, XP boosts  |
| **Runecrafting** | Inscribe runes at altars for magic       | Rune supplies for spells |
| **Fletching**    | Carve bows and arrows from logs          | Ranged weapons and ammo  |

### 5.3 Combat Skills

| Skill         | Description                                          |
| ------------- | ---------------------------------------------------- |
| **Attack**    | Melee accuracy                                       |
| **Strength**  | Melee max hit                                        |
| **Defence**   | Damage reduction                                     |
| **Ranged**    | Bow/crossbow combat                                  |
| **Magic**     | Spell damage and utility                             |
| **Hitpoints** | Total health pool (leveled passively through combat) |
| **Prayer**    | Unlocks passive combat buffs at altars               |

### 5.4 Utility Skills

| Skill           | Description                                       |
| --------------- | ------------------------------------------------- |
| **Agility**     | Unlocks shortcuts, reduces action timers globally |
| **Thieving**    | Pickpocket NPCs, unlock chests for gold/items     |
| **Exploration** | Reveals fog-of-war, unlocks new map regions       |

### 5.5 Skill Interdependencies (Examples)

- Cooking level 20 + Fishing level 30 → Unlocks "Sushi" recipe (best-in-slot food).
- Mining level 40 + Smithing level 40 → Unlocks Mithril equipment tier.
- Alchemy level 50 + Farming level 35 → Unlocks XP Boost Potion.

---

## 6. World Design

### 6.1 Regions

The world is divided into themed regions, each gated by Exploration level or quest completion.

| Region                 | Theme                         | Level Range | Key Resources                           |
| ---------------------- | ----------------------------- | ----------- | --------------------------------------- |
| **Briarwood**          | Temperate forest starter zone | 1–20        | Normal trees, copper, shrimp            |
| **Dusthollow**         | Arid canyon mining hub        | 15–40       | Iron, coal, desert herbs                |
| **Mistmere**           | Swampland with alchemy focus  | 25–50       | Rare herbs, swamp fish                  |
| **Frostpeak**          | Snowy mountain range          | 40–70       | Mithril, yew trees, ice fish            |
| **The Ashlands**       | Volcanic endgame zone         | 60–99       | Adamant ore, magic trees, boss monsters |
| **Shadowkeep Dungeon** | Multi-floor dungeon crawl     | 30–99       | Rare drops, rune altars, treasure rooms |

### 6.2 Points of Interest

- **Towns:** NPC shops (buy/sell), banks (storage), quest boards.
- **Resource Nodes:** Visually distinct tiles (glowing ore veins, tall trees, fishing spots with splashing water).
- **Dungeons:** Instanced multi-room tile maps with escalating monster difficulty and loot tables.
- **Altars/Shrines:** Used for Prayer, Runecrafting, and prestige resets.
- **Player Housing Plot:** A buildable tile area where players place furniture, trophies, and functional stations (personal forge, garden, etc.).

---

## 7. Combat System

### 7.1 Idle Combat

- Player assigns "Fight monsters in [area]."
- Character auto-walks to the nearest enemy, engages in turn-based auto-combat.
- Each combat round resolves every ~2.4 seconds (like RuneScape tick rate).
- Damage calculated: `max(0, random(1, maxHit) - enemyDefence)`
- Player eats food automatically when HP drops below a configurable threshold.

### 7.2 Combat Triangle

- **Melee** beats **Ranged** (close gap quickly)
- **Ranged** beats **Magic** (interrupt casting)
- **Magic** beats **Melee** (elemental weakness)
- Players can switch styles; enemies have fixed styles and weaknesses.

### 7.3 Monsters & Loot

- Each region has 5–10 monster types with scaling difficulty.
- Monsters drop: gold, resources, equipment, and rare collectibles.
- **Boss Monsters** spawn on timers; require minimum combat stats; drop unique legendary items.
- Loot tables use weighted RNG with a visible "drop log" so players can track collection progress.

### 7.4 Death Penalty

- On death, the player respawns in the nearest town.
- A small gold fee is deducted (percentage-based).
- No item loss (this is idle-friendly — punishing death too harshly breaks the AFK loop).

---

## 8. Economy & Crafting

### 8.1 Currency

- **Gold Coins** — Primary currency from monster drops, selling items, thieving.
- **Realm Tokens** — Premium currency (earned slowly in-game or purchased). Cosmetics only.

### 8.2 Crafting System

- Recipes discovered via skill level milestones and quest rewards.
- Each recipe requires specific resources and a minimum skill level.
- Crafting is queued: "Smith 200 iron daggers" runs automatically.
- Higher skill levels unlock better items and introduce a small chance of crafting a "superior" variant (+10% stats).

### 8.3 NPC Shops

- Buy basic supplies (bait, low-tier tools, food).
- Sell any item for gold (price determined by item tier and quantity — bulk selling reduces price to prevent inflation).

### 8.4 Player Trading (Future)

- Marketplace / auction house for player-to-player item trading.
- Listed items visible to all players; bidding or buy-now pricing.

---

## 9. Progression & Prestige

### 9.1 Milestones

- Every 5 skill levels unlock a visible milestone with a reward (new area, recipe, cosmetic title).
- A master "Total Level" aggregates all skills — milestone rewards at 100, 250, 500, 1000, 1500, 2000+.

### 9.2 Quests

- ~50 quests at launch, ranging from simple fetch quests to multi-step story arcs.
- Quest rewards: XP lamps, unique items, area unlocks, NPC followers.
- Quests are idle-compatible: objectives auto-complete when conditions are met (e.g., "Collect 50 iron ore" completes as you mine).

### 9.3 Achievements & Drop Log

- Achievement system tracks hundreds of milestones (first kill, max level, rare drops).
- Drop log per monster: checklist of all possible drops with collection percentage.

### 9.4 Prestige System

- At level 99 in any skill, players can "prestige" to reset to level 1 for that skill.
- Each prestige grants: a permanent passive bonus (+2% speed for that skill per prestige), a cosmetic star next to the skill icon, and Realm Tokens.
- Max prestige per skill: 5.

---

## 10. Technical Architecture

### 10.1 Client

- **Renderer:** Three.js with `OrthographicCamera`, custom isometric controls.
- **Tile Engine:** Custom chunk loader that creates/disposes Three.js meshes per chunk.
- **Sprite System:** `SpriteMaterial` with sprite sheet UV offsets, animated via `requestAnimationFrame`.
- **UI:** React or vanilla HTML/CSS overlay. State managed via a lightweight store (Zustand or vanilla pub/sub).
- **Game Loop:** `requestAnimationFrame`-driven. Simulation ticks at fixed 600ms intervals (idle-game granularity). Rendering decoupled at 30–60 FPS.

### 10.2 State & Persistence

- All game state stored as a serializable JSON blob: skills, inventory, quest flags, action queue, position, timestamps.
- **Online mode:** State synced to a backend (Node.js + PostgreSQL or Firebase) every 30 seconds and on key events.
- **Offline mode (MVP):** State saved to `localStorage` or IndexedDB. Offline gains calculated on next load using timestamp delta.
- Save versioning for backward-compatible migrations.

### 10.3 Offline Simulation

- On return, calculate: `ticksElapsed = (now - lastSaveTimestamp) / tickDuration`
- Simulate each tick in a compressed loop (no rendering): apply action queue, accumulate XP/resources, resolve combat, consume food.
- Cap at configurable max offline ticks.

### 10.4 Performance Targets

- 60 FPS on mid-range hardware with 20×20 visible tile grid.
- < 3 second initial load (code-split, lazy-load tile textures).
- < 50 MB total asset budget for MVP.

---

## 11. UI/UX Design

### 11.1 Main HUD

- **Top bar:** Character name, total level, gold, realm tokens.
- **Skill panel (left):** Scrollable list of all skills with level, XP bar, and current action indicator.
- **Action panel (bottom):** Shows current action queue, progress timer, and "idle earnings" ticker.
- **Minimap (top-right):** Fog-of-war revealed as Exploration levels. Click to navigate.
- **Inventory (right):** Grid-based inventory (UO-style). Items represented by pixel-art icons.
- **Chat/Log (bottom-left):** Scrollable log of events ("You mined 1 iron ore", "Level up! Mining is now 45").

### 11.2 Key Screens

- **Welcome Back:** Offline gains summary with "Collect" button.
- **Skill Detail:** Click a skill to see: current level, XP to next level, unlockable milestones, available activities for that skill.
- **Crafting Interface:** Recipe list filtered by skill, required materials shown with have/need counts.
- **Quest Journal:** Active and completed quests with objectives and rewards.
- **World Map:** Full zoomable map showing all regions, fog of war, and player position.
- **Settings:** Audio toggles, UI scale, offline cap settings, graphics quality.

---

## 12. Monetization (Non-P2W)

| Item                          | Type        | Price Range |
| ----------------------------- | ----------- | ----------- |
| Character skins               | Cosmetic    | $2–5        |
| House decoration packs        | Cosmetic    | $3–8        |
| Title/nameplate effects       | Cosmetic    | $1–3        |
| Extended offline cap (24h)    | Convenience | $5 one-time |
| Extra action queue slots (+3) | Convenience | $3 one-time |
| Realm Token bundles           | Currency    | $1–20       |

All gameplay content is earnable through play. No XP boosts, no stat advantages, no loot boxes.

---

## 13. MVP Scope (Phase 1)

Target: **Playable vertical slice in 8–12 weeks.**

### In Scope

- Three.js isometric tile renderer with 1 region (Briarwood, ~64×64 tiles).
- 5 skills: Woodcutting, Mining, Fishing, Smithing, Cooking.
- 3 combat skills: Attack, Strength, Hitpoints.
- 10 monster types with loot tables.
- Basic action queue (1 slot).
- Offline progression with timestamp-based calculation.
- localStorage save system.
- Core UI: skill panel, inventory, action bar, minimap, event log.
- 5 introductory quests.
- Day/night cycle.

### Out of Scope (Phase 2+)

- Multiplayer / server-synced state.
- Player trading / marketplace.
- Player housing.
- Remaining skills (Alchemy, Runecrafting, Farming, etc.).
- Additional regions (Dusthollow, Mistmere, etc.).
- Prestige system.
- Cosmetic shop.
- Mobile-optimized controls.
- Audio/music.

---

## 14. Success Metrics

| Metric                                | Target (3 months post-launch)                     |
| ------------------------------------- | ------------------------------------------------- |
| DAU / MAU ratio                       | > 30%                                             |
| Median session length                 | > 8 minutes (active), with idle sessions uncapped |
| D7 retention                          | > 25%                                             |
| D30 retention                         | > 12%                                             |
| Average total level per active player | > 150                                             |
| Conversion to any purchase            | > 3%                                              |

---

## 15. Risks & Mitigations

| Risk                               | Impact                                        | Mitigation                                                     |
| ---------------------------------- | --------------------------------------------- | -------------------------------------------------------------- |
| Three.js performance on large maps | Choppy FPS, bad UX                            | Chunk loading, LOD, texture atlases, frustum culling           |
| Idle balance too fast/slow         | Players quit from boredom or feel no progress | Tunable tick rates and XP curves; analytics-driven balancing   |
| Scope creep                        | Missed deadlines                              | Strict MVP phase gating; cut features, not quality             |
| Browser storage limits             | Save data loss                                | Prompt cloud save migration in Phase 2; warn at storage limits |
| Art asset pipeline bottleneck      | Inconsistent visuals                          | Use AI-assisted pixel art generation + style guide enforcement |

---

_Document Version: 1.0 — March 2026_
_Author: Game Design Team_
