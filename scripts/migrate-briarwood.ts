/**
 * One-time migration: converts the procedural Briarwood map to the new
 * two-layer JSON format (GameMap).
 *
 * Usage: npx tsx scripts/migrate-briarwood.ts
 * Output: apps/game/public/maps/briarwood.json
 */

import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createBriarwoodMap } from "../packages/world/src/briarwood.js";
import type { GameMap, MapObject, MapSpawnZone, GroundCell } from "../packages/world/src/types.js";

const OUT_DIR = path.resolve(import.meta.dirname, "../apps/game/public/maps");
const OUT_FILE = path.join(OUT_DIR, "briarwood.json");

async function main(): Promise<void> {
  console.log("Migrating Briarwood map to new two-layer format...\n");

  // Generate old-format map
  const oldMap = createBriarwoodMap();
  const height = oldMap.tiles.length;
  const width = oldMap.tiles[0]?.length ?? 0;

  console.log(`  Map size: ${width}x${height}`);

  // Split into ground layer and object layer
  const ground: GroundCell[][] = [];
  const objects: MapObject[] = [];

  let nodeCounter: Record<string, number> = {};

  for (let row = 0; row < height; row++) {
    const groundRow: GroundCell[] = [];
    for (let col = 0; col < width; col++) {
      const tile = oldMap.tiles[row]![col]!;

      // Ground layer: terrain + elevation
      groundRow.push({
        terrain: tile.terrain,
        elevation: tile.elevation,
      });

      // Object layer: resource nodes
      if (tile.resourceNode) {
        const actId = tile.resourceNode.activityId;

        // Map activity IDs to object type IDs
        const typeMap: Record<string, string> = {
          "chop-normal-tree": "normal-tree",
          "chop-oak-tree": "oak-tree",
          "mine-copper": "copper-rock",
          "mine-tin": "tin-rock",
          "mine-iron": "iron-rock",
          "fish-shrimp": "fishing-spot-shrimp",
          "fish-trout": "fishing-spot-trout",
        };

        const typeId = typeMap[actId] ?? actId;

        objects.push({
          col,
          row,
          typeId,
          blocking: true,
          interaction: {
            kind: "resource",
            activityId: actId,
            nodeId: tile.resourceNode.nodeId,
          },
        });
      }

      // Object layer: structures
      if (tile.structure) {
        objects.push({
          col,
          row,
          typeId: tile.structure,
          blocking: true,
          interaction: {
            kind: "structure",
            structureType: tile.structure,
          },
        });
      }
    }
    ground.push(groundRow);
  }

  // Convert spawn zones from tile arrays to bounding rects
  const spawnZones: MapSpawnZone[] = oldMap.spawnZones.map((zone) => {
    let colStart = Infinity,
      rowStart = Infinity,
      colEnd = -Infinity,
      rowEnd = -Infinity;
    for (const t of zone.tiles) {
      colStart = Math.min(colStart, t.col);
      rowStart = Math.min(rowStart, t.row);
      colEnd = Math.max(colEnd, t.col);
      rowEnd = Math.max(rowEnd, t.row);
    }
    return {
      monsterId: zone.monsterId,
      rect: { colStart, rowStart, colEnd, rowEnd },
    };
  });

  const gameMap: GameMap = {
    meta: {
      name: "Briarwood",
      version: 1,
      width,
      height,
    },
    ground,
    objects,
    walls: [], // No walls in the starter map
    spawnZones,
  };

  // Write output
  if (!existsSync(OUT_DIR)) {
    await mkdir(OUT_DIR, { recursive: true });
  }

  const json = JSON.stringify(gameMap);
  await writeFile(OUT_FILE, json, "utf-8");

  const sizeKb = (Buffer.byteLength(json) / 1024).toFixed(1);
  console.log(`\n  Ground cells: ${width * height}`);
  console.log(`  Objects:      ${objects.length}`);
  console.log(`  Walls:        ${gameMap.walls.length}`);
  console.log(`  Spawn zones:  ${spawnZones.length}`);
  console.log(`  File size:    ${sizeKb} KB`);
  console.log(`\n  Written to: ${OUT_FILE}`);
}

void main();
