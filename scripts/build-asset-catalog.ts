/**
 * Reads the UO tiledata export and produces curated catalog files that map
 * game terrain/static types to UO asset IDs.
 *
 * Usage:  npx tsx scripts/build-asset-catalog.ts
 * Output: packages/world/data/terrain-catalog.json
 *         packages/world/data/static-catalog.json
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const EXPORT = resolve(ROOT, "export");
const OUT_DIR = resolve(ROOT, "packages/world/data");

// ---------------------------------------------------------------------------
// Read raw UO tiledata
// ---------------------------------------------------------------------------

interface UOLandTile {
  id: number;
  name: string;
  texture_id: number;
  flags: number;
  flag_names: string[];
  godot: {
    collision: string;
    is_water: boolean;
    is_foliage: boolean;
  };
}

interface UOItemTile {
  id: number;
  name: string;
  flags: number;
  flag_names: string[];
  weight: number;
  quality: number;
  anim_id: number;
  hue: number;
  height: number;
  value: number;
}

const landTiles: UOLandTile[] = JSON.parse(
  readFileSync(resolve(EXPORT, "data/tiledata/land_tiles.json"), "utf-8"),
);
const itemTiles: UOItemTile[] = JSON.parse(
  readFileSync(resolve(EXPORT, "data/tiledata/item_tiles.json"), "utf-8"),
);

// ---------------------------------------------------------------------------
// Terrain catalog — map UO terrain names to game terrain types
// ---------------------------------------------------------------------------

interface TerrainEntry {
  /** Game terrain type name */
  name: string;
  /** UO names that map to this type */
  uoNames: string[];
  /** Best representative UO texture ID (for the base tile) */
  primaryTextureId: number;
  /** All UO texture IDs for variety/autotile */
  textureIds: number[];
  /** UO tile IDs that use this terrain */
  landTileIds: number[];
  /** Derived flags */
  impassable: boolean;
  isWater: boolean;
}

// Manual mapping from UO terrain names → game terrain type
const TERRAIN_NAME_MAP: Record<string, string> = {
  grass: "grass",
  dirt: "dirt",
  sand: "sand",
  stone: "stone",
  "stone moss": "stone",
  "stone moss2": "stone",
  flagstone: "stone",
  marble: "stone",
  water: "water",
  forest: "forest",
  jungle: "jungle",
  snow: "snow",
  cave: "cave",
  "cave exit": "cave",
  obsidian: "cave",
  brick: "brick",
  cobblestones: "brick",
  "sand stone": "sandstone",
  planks: "wood",
  "wooden floor": "wood",
  tile: "tile",
  furrows: "farmland",
  lava: "lava",
  acid: "lava",
  embank: "dirt",
  leaves: "forest",
  tree: "forest",
};

// Best representative texture per game terrain (hand-picked for visual quality)
const PRIMARY_TEXTURE: Record<string, number> = {
  grass: 3,
  dirt: 113,
  sand: 22,
  stone: 1078,
  water: 310,
  forest: 196,
  jungle: 172,
  snow: 268,
  cave: 581,
  brick: 1001,
  sandstone: 1094,
  wood: 662,
  tile: 1046,
  farmland: 9,
  lava: 500,
};

// Build terrain catalog
const terrainGroups = new Map<
  string,
  {
    textureIds: Set<number>;
    landTileIds: number[];
    impassable: boolean;
    isWater: boolean;
    uoNames: Set<string>;
  }
>();

for (const tile of landTiles) {
  const rawName = tile.name.trim().toLowerCase();
  const gameType = TERRAIN_NAME_MAP[rawName];
  if (!gameType) continue;

  let group = terrainGroups.get(gameType);
  if (!group) {
    group = {
      textureIds: new Set(),
      landTileIds: [],
      impassable: false,
      isWater: false,
      uoNames: new Set(),
    };
    terrainGroups.set(gameType, group);
  }

  group.uoNames.add(rawName);
  if (tile.texture_id > 0) group.textureIds.add(tile.texture_id);
  group.landTileIds.push(tile.id);
  if (tile.flag_names.includes("Impassable")) group.impassable = true;
  if (tile.godot.is_water) group.isWater = true;
}

const terrainCatalog: TerrainEntry[] = [];
for (const [name, group] of terrainGroups) {
  const textureIds = [...group.textureIds].sort((a, b) => a - b);
  // Filter to textures that actually exist on disk
  const validTextureIds = textureIds.filter((id) => {
    const path = resolve(EXPORT, `assets/textures/${String(id).padStart(5, "0")}.png`);
    return existsSync(path);
  });

  terrainCatalog.push({
    name,
    uoNames: [...group.uoNames].sort(),
    primaryTextureId: PRIMARY_TEXTURE[name] ?? validTextureIds[0] ?? 0,
    textureIds: validTextureIds,
    landTileIds: group.landTileIds.sort((a, b) => a - b),
    impassable: group.impassable,
    isWater: group.isWater,
  });
}

terrainCatalog.sort((a, b) => a.name.localeCompare(b.name));

// ---------------------------------------------------------------------------
// Static catalog — map UO items to game static categories
// ---------------------------------------------------------------------------

interface StaticEntry {
  /** Game static type name */
  name: string;
  /** Readable display name */
  displayName: string;
  /** Game category */
  category: string;
  /** Best representative UO item ID */
  primaryItemId: number;
  /** All matching UO item IDs */
  itemIds: number[];
  /** UO height value */
  height: number;
  /** Notable flags */
  flags: string[];
}

// Category detection rules: keyword → { category, gameName, displayName }
interface CategoryRule {
  keyword: string;
  category: string;
  gameName: string;
  displayName: string;
  /** Only match if name exactly equals or starts with keyword */
  exact?: boolean;
}

const STATIC_RULES: CategoryRule[] = [
  // Trees - specific before general
  { keyword: "oak tree", category: "tree", gameName: "oak-tree", displayName: "Oak Tree" },
  { keyword: "cedar tree", category: "tree", gameName: "cedar-tree", displayName: "Cedar Tree" },
  { keyword: "willow tree", category: "tree", gameName: "willow-tree", displayName: "Willow Tree" },
  { keyword: "banana tree", category: "tree", gameName: "banana-tree", displayName: "Banana Tree" },
  {
    keyword: "cypress tree",
    category: "tree",
    gameName: "cypress-tree",
    displayName: "Cypress Tree",
  },
  { keyword: "apple tree", category: "tree", gameName: "apple-tree", displayName: "Apple Tree" },
  { keyword: "peach tree", category: "tree", gameName: "peach-tree", displayName: "Peach Tree" },
  { keyword: "yew tree", category: "tree", gameName: "yew-tree", displayName: "Yew Tree" },
  { keyword: "pine tree", category: "tree", gameName: "pine-tree", displayName: "Pine Tree" },
  { keyword: "tree", category: "tree", gameName: "normal-tree", displayName: "Tree" },

  // Rocks and ores
  { keyword: "iron ore", category: "rock", gameName: "iron-rock", displayName: "Iron Ore" },
  { keyword: "copper ore", category: "rock", gameName: "copper-rock", displayName: "Copper Ore" },
  { keyword: "gold ore", category: "rock", gameName: "gold-rock", displayName: "Gold Ore" },
  { keyword: "rock", category: "rock", gameName: "rock", displayName: "Rock", exact: true },
  { keyword: "rocks", category: "rock", gameName: "rocks", displayName: "Rocks", exact: true },
  { keyword: "boulder", category: "rock", gameName: "boulder", displayName: "Boulder" },

  // Structures
  { keyword: "forge", category: "structure", gameName: "forge", displayName: "Forge", exact: true },
  { keyword: "anvil", category: "structure", gameName: "anvil", displayName: "Anvil", exact: true },
  {
    keyword: "spinning wheel",
    category: "structure",
    gameName: "spinning-wheel",
    displayName: "Spinning Wheel",
  },
  { keyword: "loom", category: "structure", gameName: "loom", displayName: "Loom", exact: true },
  { keyword: "oven", category: "structure", gameName: "oven", displayName: "Oven", exact: true },

  // Furniture
  { keyword: "chest", category: "decoration", gameName: "chest", displayName: "Chest" },
  { keyword: "barrel", category: "decoration", gameName: "barrel", displayName: "Barrel" },
  { keyword: "crate", category: "decoration", gameName: "crate", displayName: "Crate" },
  { keyword: "table", category: "decoration", gameName: "table", displayName: "Table" },
  { keyword: "chair", category: "decoration", gameName: "chair", displayName: "Chair" },
  { keyword: "bench", category: "decoration", gameName: "bench", displayName: "Bench" },
  { keyword: "bookcase", category: "decoration", gameName: "bookcase", displayName: "Bookcase" },
  { keyword: "sign", category: "decoration", gameName: "sign", displayName: "Sign" },
  { keyword: "lamp post", category: "decoration", gameName: "lamp-post", displayName: "Lamp Post" },
  {
    keyword: "candelabra",
    category: "decoration",
    gameName: "candelabra",
    displayName: "Candelabra",
  },

  // Walls and fences
  {
    keyword: "wooden fence",
    category: "fence",
    gameName: "wooden-fence",
    displayName: "Wooden Fence",
  },
  { keyword: "fence", category: "fence", gameName: "fence", displayName: "Fence", exact: true },
  { keyword: "stone wall", category: "wall", gameName: "stone-wall", displayName: "Stone Wall" },
  { keyword: "wooden wall", category: "wall", gameName: "wooden-wall", displayName: "Wooden Wall" },

  // Fishing
  {
    keyword: "fishing pole",
    category: "fishing",
    gameName: "fishing-pole",
    displayName: "Fishing Pole",
  },
  { keyword: "koi fish", category: "fishing", gameName: "koi-fish", displayName: "Koi Fish" },
];

// Build static catalog by scanning item tiles
const staticGroups = new Map<
  string,
  { rule: CategoryRule; itemIds: number[]; heights: number[]; flags: Set<string> }
>();

for (const item of itemTiles) {
  const name = item.name.trim().toLowerCase();
  if (!name || name === "nodraw") continue;

  for (const rule of STATIC_RULES) {
    const match = rule.exact
      ? name === rule.keyword || name.startsWith(rule.keyword + " ")
      : name.includes(rule.keyword);
    if (!match) continue;

    let group = staticGroups.get(rule.gameName);
    if (!group) {
      group = { rule, itemIds: [], heights: [], flags: new Set() };
      staticGroups.set(rule.gameName, group);
    }

    group.itemIds.push(item.id);
    group.heights.push(item.height);
    for (const f of item.flag_names) group.flags.add(f);
    break; // first match wins
  }
}

const staticCatalog: StaticEntry[] = [];
for (const [gameName, group] of staticGroups) {
  // Filter to items whose sprites actually exist on disk
  const validItemIds = group.itemIds.filter((id) => {
    const path = resolve(EXPORT, `assets/art/items/${String(id).padStart(5, "0")}.png`);
    return existsSync(path);
  });
  if (validItemIds.length === 0) continue;

  const avgHeight = Math.round(group.heights.reduce((a, b) => a + b, 0) / group.heights.length);

  staticCatalog.push({
    name: gameName,
    displayName: group.rule.displayName,
    category: group.rule.category,
    primaryItemId: validItemIds[0],
    itemIds: validItemIds.sort((a, b) => a - b),
    height: avgHeight,
    flags: [...group.flags].sort(),
  });
}

staticCatalog.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------

writeFileSync(
  resolve(OUT_DIR, "terrain-catalog.json"),
  JSON.stringify(terrainCatalog, null, 2) + "\n",
);

writeFileSync(
  resolve(OUT_DIR, "static-catalog.json"),
  JSON.stringify(staticCatalog, null, 2) + "\n",
);

console.log(`Terrain catalog: ${terrainCatalog.length} types`);
for (const t of terrainCatalog) {
  console.log(`  ${t.name}: ${t.textureIds.length} textures, ${t.landTileIds.length} land tiles`);
}

console.log(`\nStatic catalog: ${staticCatalog.length} types`);
for (const s of staticCatalog) {
  console.log(`  ${s.name} (${s.category}): ${s.itemIds.length} items, primary=${s.primaryItemId}`);
}
