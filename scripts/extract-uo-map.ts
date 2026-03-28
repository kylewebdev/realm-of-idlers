/**
 * Extracts a region of UO's Britannia map (map0.mul) and converts it to
 * the game's GameMapV2 JSON format.
 *
 * Reads:
 *   - map0.mul       (terrain grid: 196-byte blocks of 8x8 tiles)
 *   - staidx0.mul    (statics index: 12-byte entries per block)
 *   - statics0.mul   (statics data: 7-byte entries per object)
 *   - export/data/tiledata/land_tiles.json   (tile metadata)
 *   - export/data/tiledata/item_tiles.json   (item metadata)
 *
 * Usage:
 *   npx tsx scripts/extract-uo-map.ts [options]
 *
 * Options:
 *   --x=N        Start X tile (default: 0)
 *   --y=N        Start Y tile (default: 0)
 *   --width=N    Region width in tiles (default: 512, max 7168)
 *   --height=N   Region height in tiles (default: 512, max 4096)
 *   --name=STR   Map name (default: "britannia")
 *   --out=PATH   Output path (default: apps/game/public/maps/{name}.json)
 *   --preset=STR Use a named region preset (britain, minoc, yew, vesper, trinsic, moonglow)
 *
 * Presets (notable UO towns):
 *   britain   1200,1400 512x512  — Britain and surroundings
 *   minoc     2400,400  512x512  — Minoc mining town
 *   yew       400,700   512x512  — Yew forest area
 *   vesper    2700,2000 512x512  — Vesper waterfront
 *   trinsic   1800,2600 512x512  — Trinsic walled city
 *   moonglow  4400,1000 512x512  — Moonglow mage city
 */

import {
  readFileSync,
  writeFileSync,
  openSync,
  readSync,
  closeSync,
  mkdirSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const UO_DIR = "/mnt/c/Program Files (x86)/UOForever/UO";
const EXPORT = resolve(ROOT, "export");

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);

interface Preset {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PRESETS: Record<string, Preset> = {
  britain: { x: 1200, y: 1400, width: 512, height: 512 },
  minoc: { x: 2400, y: 400, width: 512, height: 512 },
  yew: { x: 400, y: 700, width: 512, height: 512 },
  vesper: { x: 2700, y: 2000, width: 512, height: 512 },
  trinsic: { x: 1800, y: 2600, width: 512, height: 512 },
  moonglow: { x: 4400, y: 1000, width: 512, height: 512 },
};

const preset = args.preset ? PRESETS[args.preset] : undefined;
if (args.preset && !preset) {
  console.error(`Unknown preset: ${args.preset}. Available: ${Object.keys(PRESETS).join(", ")}`);
  process.exit(1);
}

const startX = Number(args.x ?? preset?.x ?? 0);
const startY = Number(args.y ?? preset?.y ?? 0);
const regionW = Number(args.width ?? preset?.width ?? 512);
const regionH = Number(args.height ?? preset?.height ?? 512);
const mapName = args.name ?? args.preset ?? "britannia";
const outPath = args.out
  ? resolve(ROOT, args.out)
  : resolve(ROOT, `apps/game/public/maps/${mapName}.json`);

// UO Map0 dimensions
const MAP_W = 7168;
const MAP_H = 4096;
const BLOCKS_W = MAP_W >> 3; // 896
const BLOCKS_H = MAP_H >> 3; // 512

// Validate bounds
if (startX + regionW > MAP_W || startY + regionH > MAP_H) {
  console.error(
    `Region ${startX},${startY} ${regionW}x${regionH} exceeds map bounds ${MAP_W}x${MAP_H}`,
  );
  process.exit(1);
}

console.log(`Extracting ${mapName}: ${regionW}x${regionH} tiles from (${startX},${startY})`);

// ---------------------------------------------------------------------------
// UO land tile ID → game tileId mapping
// ---------------------------------------------------------------------------

interface UOLandTile {
  id: number;
  name: string;
  texture_id: number;
  flag_names: string[];
  godot: { is_water: boolean };
}

const landTileData: UOLandTile[] = JSON.parse(
  readFileSync(resolve(EXPORT, "data/tiledata/land_tiles.json"), "utf-8"),
);

// Build a lookup: UO land tile ID → game terrain tileId (0-14)
// Based on the name mapping from the catalog
const UO_NAME_TO_GAME_TILE: Record<string, number> = {
  grass: 0,
  dirt: 1,
  stone: 2,
  water: 3,
  sand: 4,
  forest: 5,
  jungle: 6,
  snow: 7,
  cave: 8,
  brick: 9,
  sandstone: 10,
  wood: 11,
  tile: 12,
  farmland: 13,
  lava: 14,
  cobblestones: 15,
  marble: 16,
  flagstone: 17,
};

// Map UO terrain name → game name
const UO_TERRAIN_MAP: Record<string, string> = {
  grass: "grass",
  dirt: "dirt",
  sand: "sand",
  stone: "stone",
  "stone moss": "stone",
  "stone moss2": "stone",
  flagstone: "flagstone",
  marble: "marble",
  water: "water",
  forest: "forest",
  jungle: "jungle",
  snow: "snow",
  cave: "cave",
  "cave exit": "cave",
  obsidian: "cave",
  brick: "brick",
  cobblestones: "cobblestones",
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
  terrainfallback: "water",
  noname: "dirt",
};

// Build the 16K lookup arrays
const uoTileIdToGameTile = new Uint8Array(16384);
const uoTileIdToTexId = new Uint16Array(16384);
for (const tile of landTileData) {
  const rawName = tile.name.trim().toLowerCase();
  const gameName = UO_TERRAIN_MAP[rawName];
  if (gameName && UO_NAME_TO_GAME_TILE[gameName] !== undefined) {
    uoTileIdToGameTile[tile.id] = UO_NAME_TO_GAME_TILE[gameName];
  } else if (tile.godot.is_water) {
    uoTileIdToGameTile[tile.id] = 3; // water
  } else {
    uoTileIdToGameTile[tile.id] = 0; // default to grass
  }
  uoTileIdToTexId[tile.id] = tile.texture_id;
}

// ---------------------------------------------------------------------------
// UO item tile ID → game staticId mapping
// ---------------------------------------------------------------------------

interface UOItemTile {
  id: number;
  name: string;
  height: number;
  flag_names: string[];
}

const itemTileData: UOItemTile[] = JSON.parse(
  readFileSync(resolve(EXPORT, "data/tiledata/item_tiles.json"), "utf-8"),
);

// Build fast item name lookup
const itemNameById = new Map<number, string>();
const itemHeightById = new Map<number, number>();
const itemFlagsById = new Map<number, string[]>();
for (const item of itemTileData) {
  itemNameById.set(item.id, item.name.trim().toLowerCase());
  itemHeightById.set(item.id, item.height);
  itemFlagsById.set(item.id, item.flag_names);
}

// Map UO item graphic → game staticId
// Returns a category-based staticId for ALL visible items
function mapItemToStatic(graphicId: number): string | null {
  const name = itemNameById.get(graphicId) ?? "";
  const flags = itemFlagsById.get(graphicId) ?? [];

  // Skip truly invisible items
  if (!name || name === "nodraw") return null;
  if (flags.includes("NoDraw")) return null;

  // Trees (specific types for game interactions)
  if (name.includes("oak tree") || name.includes("oak ")) return "oak-tree";
  if (name.includes("willow tree") || name.includes("willow")) return "willow-tree";
  if (name.includes("cedar tree") || name.includes("cedar")) return "cedar-tree";
  if (name.includes("cypress tree") || name.includes("cypress")) return "cypress-tree";
  if (name.includes("apple tree")) return "apple-tree";
  if (name.includes("peach tree")) return "peach-tree";
  if (name.includes("banana tree")) return "banana-tree";
  if (name.includes("pine tree") || name.includes("pine ")) return "pine-tree";
  if (name.includes("yew tree") || name.includes("yew ")) return "yew-tree";
  if (name.includes("tree") || name.includes("sapling")) return "normal-tree";

  // Rocks / ores
  if (name.includes("iron ore")) return "iron-rock";
  if (name.includes("copper ore")) return "copper-rock";
  if (name === "boulder" || name.startsWith("boulder")) return "boulder";
  if (name === "rocks" || name === "rock") return "rock";

  // Structures
  if (name === "forge" || name.startsWith("forge")) return "forge";
  if (name === "anvil" || name.startsWith("anvil")) return "anvil";

  // Named decorations
  if (name.includes("barrel")) return "barrel";
  if (name.includes("crate")) return "crate";
  if (name.includes("sign")) return "sign";

  // Walls
  if (name.includes("stone wall")) return "stone-wall";
  if (name.includes("wooden wall")) return "wooden-wall";

  // Include ALL remaining visible items as generic UO statics
  // They'll be rendered using their graphicId sprite
  return "uo-static";
}

// ---------------------------------------------------------------------------
// Binary reading helpers
// ---------------------------------------------------------------------------

function readUInt16LE(buf: Buffer, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8);
}

function readInt8(buf: Buffer, offset: number): number {
  const v = buf[offset];
  return v > 127 ? v - 256 : v;
}

function readUInt32LE(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset);
}

// ---------------------------------------------------------------------------
// Read map data
// ---------------------------------------------------------------------------

const mapFd = openSync(resolve(UO_DIR, "map0.mul"), "r");
const staidxFd = openSync(resolve(UO_DIR, "staidx0.mul"), "r");
const staticsFd = openSync(resolve(UO_DIR, "statics0.mul"), "r");

// MapBlock = 4 byte header + 64 * 3 bytes (tileId:u16 + z:i8) = 196 bytes
const BLOCK_SIZE = 196;
// StaticsBlock = 7 bytes per entry (graphic:u16 + x:u8 + y:u8 + z:i8 + hue:u16)
const STATIC_ENTRY_SIZE = 7;
// StaidxBlock = 12 bytes (position:u32 + size:u32 + unknown:u32)
const STAIDX_ENTRY_SIZE = 12;

interface GroundCellV2 {
  tileId: number;
  texId?: number;
  elevation: number;
}

interface MapStaticEntry {
  col: number;
  row: number;
  z: number;
  staticId: string;
  graphicId: number;
  itemHeight: number;
  flags: number;
}

const ground: GroundCellV2[][] = [];
const statics: MapStaticEntry[] = [];

// Initialize ground grid
for (let row = 0; row < regionH; row++) {
  ground[row] = [];
  for (let col = 0; col < regionW; col++) {
    ground[row][col] = { tileId: 0, elevation: 0 };
  }
}

const blockBuf = Buffer.alloc(BLOCK_SIZE);
const staidxBuf = Buffer.alloc(STAIDX_ENTRY_SIZE);

// Determine which 8x8 blocks we need
const blockStartX = startX >> 3;
const blockStartY = startY >> 3;
const blockEndX = (startX + regionW - 1) >> 3;
const blockEndY = (startY + regionH - 1) >> 3;

let totalStaticsMapped = 0;
let totalStaticsSkipped = 0;

for (let bx = blockStartX; bx <= blockEndX; bx++) {
  for (let by = blockStartY; by <= blockEndY; by++) {
    // Block index: bx * BLOCKS_H + by (column-major in UO)
    const blockIdx = bx * BLOCKS_H + by;

    // --- Read terrain block ---
    const mapOffset = blockIdx * BLOCK_SIZE;
    readSync(mapFd, blockBuf, 0, BLOCK_SIZE, mapOffset);

    // Skip 4-byte header, read 64 cells
    for (let ly = 0; ly < 8; ly++) {
      for (let lx = 0; lx < 8; lx++) {
        const worldX = (bx << 3) + lx;
        const worldY = (by << 3) + ly;

        // Check if within our extraction region
        if (worldX < startX || worldX >= startX + regionW) continue;
        if (worldY < startY || worldY >= startY + regionH) continue;

        const cellOffset = 4 + ((ly << 3) + lx) * 3;
        const uoTileId = readUInt16LE(blockBuf, cellOffset) & 0x3fff;
        const z = readInt8(blockBuf, cellOffset + 2);

        const col = worldX - startX;
        const row = worldY - startY;

        const texId = uoTileIdToTexId[uoTileId] ?? 0;
        ground[row][col] = {
          tileId: uoTileIdToGameTile[uoTileId] ?? 0,
          ...(texId > 0 ? { texId } : {}),
          elevation: z,
        };
      }
    }

    // --- Read statics for this block ---
    const staidxOffset = blockIdx * STAIDX_ENTRY_SIZE;
    readSync(staidxFd, staidxBuf, 0, STAIDX_ENTRY_SIZE, staidxOffset);

    const staticPos = readUInt32LE(staidxBuf, 0);
    const staticSize = readUInt32LE(staidxBuf, 4);

    if (staticPos === 0xffffffff || staticSize === 0) continue;

    const staticCount = Math.min(1024, Math.floor(staticSize / STATIC_ENTRY_SIZE));
    const staticBuf = Buffer.alloc(staticCount * STATIC_ENTRY_SIZE);
    readSync(staticsFd, staticBuf, 0, staticBuf.length, staticPos);

    for (let i = 0; i < staticCount; i++) {
      const off = i * STATIC_ENTRY_SIZE;
      const graphic = readUInt16LE(staticBuf, off);
      const lx = staticBuf[off + 2];
      const ly = staticBuf[off + 3];
      const sz = readInt8(staticBuf, off + 4);
      // const hue = readUInt16LE(staticBuf, off + 5); // available if needed

      if (graphic === 0 || graphic === 0xffff) continue;
      if (lx > 7 || ly > 7) continue;

      const worldX = (bx << 3) + lx;
      const worldY = (by << 3) + ly;

      if (worldX < startX || worldX >= startX + regionW) continue;
      if (worldY < startY || worldY >= startY + regionH) continue;

      const staticId = mapItemToStatic(graphic);
      if (!staticId) {
        totalStaticsSkipped++;
        continue;
      }

      const col = worldX - startX;
      const row = worldY - startY;

      // Compute flags from UO item flags
      let itemFlags = 0;
      const uoFlags = itemFlagsById.get(graphic) ?? [];
      if (uoFlags.includes("Impassable")) itemFlags |= 1;
      if (uoFlags.includes("Wall")) itemFlags |= 2;
      if (uoFlags.includes("Surface")) itemFlags |= 4;
      if (uoFlags.includes("Background")) itemFlags |= 8;
      if (uoFlags.includes("Roof")) itemFlags |= 16;
      if (uoFlags.includes("Foliage")) itemFlags |= 32;

      const itemH = itemHeightById.get(graphic) ?? 0;
      statics.push({
        col,
        row,
        z: sz,
        staticId,
        graphicId: graphic,
        itemHeight: itemH,
        flags: itemFlags,
      });

      totalStaticsMapped++;
    }
  }
}

closeSync(mapFd);
closeSync(staidxFd);
closeSync(staticsFd);

// ---------------------------------------------------------------------------
// Build GameMapV2 JSON
// ---------------------------------------------------------------------------

const mapV2 = {
  meta: {
    name: mapName.charAt(0).toUpperCase() + mapName.slice(1),
    version: 2,
    width: regionW,
    height: regionH,
  },
  ground,
  statics,
  spawnZones: [] as {
    monsterId: string;
    rect: { colStart: number; rowStart: number; colEnd: number; rowEnd: number };
  }[],
};

// Minify: strip default values, keep texId
const minifiedGround = ground.map((row) =>
  row.map((cell) => {
    const out: Record<string, number> = { tileId: cell.tileId };
    if (cell.texId) out.texId = cell.texId;
    if (cell.elevation !== 0) out.elevation = cell.elevation;
    return out;
  }),
);

const output = JSON.stringify({ ...mapV2, ground: minifiedGround });

writeFileSync(outPath, output);

// ---------------------------------------------------------------------------
// Copy texture and sprite assets
// ---------------------------------------------------------------------------

const texSrcDir = resolve(EXPORT, "assets/textures");
const texDstDir = resolve(ROOT, "apps/game/public/tiles/texmap");
const sprSrcDir = resolve(EXPORT, "assets/art/items");
const sprDstDir = resolve(ROOT, "apps/game/public/sprites/item");

// Collect unique texIds and graphicIds
const usedTexIds = new Set<number>();
for (const row of ground) {
  for (const cell of row) {
    if (cell.texId && cell.texId > 0) usedTexIds.add(cell.texId);
  }
}

const usedGraphicIds = new Set<number>();
for (const s of statics) {
  usedGraphicIds.add(s.graphicId);
}

// Copy texmaps
if (existsSync(texSrcDir)) {
  mkdirSync(texDstDir, { recursive: true });
  let texCopied = 0;
  let texMissing = 0;
  for (const texId of usedTexIds) {
    const srcFile = resolve(texSrcDir, String(texId).padStart(5, "0") + ".png");
    const dstFile = resolve(texDstDir, `${texId}.png`);
    if (existsSync(srcFile)) {
      copyFileSync(srcFile, dstFile);
      texCopied++;
    } else {
      texMissing++;
    }
  }
  console.log(
    `\nTexmaps: ${texCopied} copied, ${texMissing} missing (of ${usedTexIds.size} unique)`,
  );
} else {
  console.log(`\nTexmap source dir not found: ${texSrcDir} — skipping texture copy`);
}

// Copy item sprites
if (existsSync(sprSrcDir)) {
  mkdirSync(sprDstDir, { recursive: true });
  let sprCopied = 0;
  let sprMissing = 0;
  for (const gid of usedGraphicIds) {
    const srcFile = resolve(sprSrcDir, String(gid).padStart(5, "0") + ".png");
    const dstFile = resolve(sprDstDir, `${gid}.png`);
    if (existsSync(srcFile)) {
      copyFileSync(srcFile, dstFile);
      sprCopied++;
    } else {
      sprMissing++;
    }
  }
  console.log(
    `Item sprites: ${sprCopied} copied, ${sprMissing} missing (of ${usedGraphicIds.size} unique)`,
  );
} else {
  console.log(`\nItem sprite source dir not found: ${sprSrcDir} — skipping sprite copy`);
}

// ---------------------------------------------------------------------------
// Generate art dimensions metadata
// ---------------------------------------------------------------------------

const artDimensions: Record<number, [number, number]> = {};

function readPngDimensions(filePath: string): [number, number] | null {
  try {
    const fd = openSync(filePath, "r");
    const buf = Buffer.alloc(24);
    readSync(fd, buf, 0, 24, 0);
    closeSync(fd);
    // PNG header: 8 bytes signature, then IHDR chunk (4 len + 4 type + 4 width + 4 height)
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return [width, height];
  } catch {
    return null;
  }
}

for (const gid of usedGraphicIds) {
  const filePath = resolve(sprDstDir, `${gid}.png`);
  if (existsSync(filePath)) {
    const dims = readPngDimensions(filePath);
    if (dims) artDimensions[gid] = dims;
  }
}

const artMetaPath = outPath.replace(".json", "-art.json");
writeFileSync(artMetaPath, JSON.stringify(artDimensions));
console.log(`\nArt dimensions: ${Object.keys(artDimensions).length} entries → ${artMetaPath}`);

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

const terrainCounts: Record<number, number> = {};
for (const row of ground) {
  for (const cell of row) {
    terrainCounts[cell.tileId] = (terrainCounts[cell.tileId] || 0) + 1;
  }
}

const staticCounts: Record<string, number> = {};
for (const s of statics) {
  staticCounts[s.staticId] = (staticCounts[s.staticId] || 0) + 1;
}

console.log(`\nOutput: ${outPath} (${(output.length / 1024 / 1024).toFixed(1)} MB)`);
console.log(`Region: ${regionW}x${regionH} = ${regionW * regionH} tiles`);
console.log(`\nTerrain distribution:`);
const TILE_NAMES = [
  "grass",
  "dirt",
  "stone",
  "water",
  "sand",
  "forest",
  "jungle",
  "snow",
  "cave",
  "brick",
  "sandstone",
  "wood",
  "tile",
  "farmland",
  "lava",
  "cobblestones",
  "marble",
  "flagstone",
];
for (const [id, count] of Object.entries(terrainCounts).sort(([, a], [, b]) => b - a)) {
  const pct = ((count / (regionW * regionH)) * 100).toFixed(1);
  console.log(`  ${TILE_NAMES[Number(id)] ?? id}: ${count} (${pct}%)`);
}

console.log(
  `\nStatics: ${totalStaticsMapped} mapped, ${totalStaticsSkipped} skipped (unmapped items)`,
);
for (const [id, count] of Object.entries(staticCounts)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 15)) {
  console.log(`  ${id}: ${count}`);
}
