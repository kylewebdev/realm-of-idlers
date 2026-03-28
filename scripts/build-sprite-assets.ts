/**
 * Copies UO item sprites into the game's public/sprites/ directory for each
 * static type defined in the catalog.
 *
 * Reads:   packages/world/data/static-catalog.json
 * Source:  export/assets/art/items/
 * Output:  apps/game/public/sprites/{name}.png
 *
 * Usage:  npx tsx scripts/build-sprite-assets.ts [--force]
 */

import { readFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const EXPORT_ITEMS = resolve(ROOT, "export/assets/art/items");
const SPRITES_DIR = resolve(ROOT, "apps/game/public/sprites");
const CATALOG = resolve(ROOT, "packages/world/data/static-catalog.json");

const force = process.argv.includes("--force");

interface StaticEntry {
  name: string;
  displayName: string;
  category: string;
  primaryItemId: number;
  itemIds: number[];
  height: number;
  flags: string[];
}

const catalog: StaticEntry[] = JSON.parse(readFileSync(CATALOG, "utf-8"));

mkdirSync(SPRITES_DIR, { recursive: true });

let copied = 0;
let skipped = 0;

for (const entry of catalog) {
  const dst = resolve(SPRITES_DIR, `${entry.name}.png`);
  const src = resolve(EXPORT_ITEMS, `${String(entry.primaryItemId).padStart(5, "0")}.png`);

  if (!existsSync(src)) {
    console.warn(`  SKIP ${entry.name}: item ${entry.primaryItemId} not found`);
    skipped++;
    continue;
  }

  if (force || !existsSync(dst)) {
    copyFileSync(src, dst);
    copied++;
    console.log(`  ${entry.name}.png <- item ${entry.primaryItemId} (${entry.displayName})`);
  } else {
    console.log(`  ${entry.name}.png (exists, skipping)`);
  }
}

console.log(`\nDone: ${copied} files copied, ${skipped} skipped`);
console.log(`Static types: ${catalog.length}`);
console.log(`Output: ${SPRITES_DIR}`);
