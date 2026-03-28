/**
 * Copies UO terrain textures into the game's public/tiles/ directory and
 * generates the autotile variant set for each terrain type.
 *
 * Reads:   packages/world/data/terrain-catalog.json
 * Source:  export/assets/textures/
 * Output:  apps/game/public/tiles/{name}.png + {name}_{0-14}.png
 *
 * Usage:  npx tsx scripts/build-terrain-assets.ts [--force]
 */

import { readFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const EXPORT = resolve(ROOT, "export/assets/textures");
const TILES_DIR = resolve(ROOT, "apps/game/public/tiles");
const CATALOG = resolve(ROOT, "packages/world/data/terrain-catalog.json");

const force = process.argv.includes("--force");

interface TerrainEntry {
  name: string;
  uoNames: string[];
  primaryTextureId: number;
  textureIds: number[];
  landTileIds: number[];
  impassable: boolean;
  isWater: boolean;
}

const catalog: TerrainEntry[] = JSON.parse(readFileSync(CATALOG, "utf-8"));

mkdirSync(TILES_DIR, { recursive: true });

let copied = 0;
let skipped = 0;

for (const terrain of catalog) {
  const { name, primaryTextureId, textureIds } = terrain;

  // --- Base tile: {name}.png from the primary texture ---
  const baseDst = resolve(TILES_DIR, `${name}.png`);
  const baseSrc = resolve(EXPORT, `${String(primaryTextureId).padStart(5, "0")}.png`);

  if (!existsSync(baseSrc)) {
    console.warn(`  SKIP ${name}: primary texture ${primaryTextureId} not found`);
    skipped++;
    continue;
  }

  if (force || !existsSync(baseDst)) {
    copyFileSync(baseSrc, baseDst);
    copied++;
    console.log(`  ${name}.png <- texture ${primaryTextureId}`);
  }

  // --- Autotile variants: {name}_0.png through {name}_14.png ---
  // Pick from the available texture IDs, cycling if fewer than 15
  // These serve as transition variants — different UO texture variants
  // of the same terrain type provide natural visual variety.
  const variantPool = textureIds.filter((id) => id !== primaryTextureId);
  if (variantPool.length === 0) continue;

  for (let mask = 0; mask < 15; mask++) {
    const varDst = resolve(TILES_DIR, `${name}_${mask}.png`);
    const varTexId = variantPool[mask % variantPool.length];
    const varSrc = resolve(EXPORT, `${String(varTexId).padStart(5, "0")}.png`);

    if (!existsSync(varSrc)) continue;

    if (force || !existsSync(varDst)) {
      copyFileSync(varSrc, varDst);
      copied++;
    }
  }
}

console.log(`\nDone: ${copied} files copied, ${skipped} skipped`);
console.log(`Terrain types: ${catalog.length}`);
console.log(`Output: ${TILES_DIR}`);
