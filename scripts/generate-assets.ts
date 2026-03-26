/**
 * Asset generation script using Google Nano Banana 2 (Gemini 3.1 Flash Image)
 * Generates all game art assets in Ultima Online aesthetic style.
 *
 * Usage:
 *   GEMINI_API_KEY=your-key npx tsx scripts/generate-assets.ts [category]
 *
 * Categories: tiles, sprites, icons, all (default: all)
 * Add --force to regenerate existing assets.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const PUBLIC = path.resolve(import.meta.dirname, "../apps/game/public");

const ai = new GoogleGenAI({ apiKey: process.env["GEMINI_API_KEY"]! });
const MODEL = "gemini-3.1-flash-image-preview";

// ---------------------------------------------------------------------------
// Shared style anchors — keep every prompt grounded to the same look
// ---------------------------------------------------------------------------

/** Core style applied to ALL assets for visual coherence. */
const ART_STYLE = [
  "16-bit pixel art",
  "Ultima Online (1997) art style",
  "hand-pixeled look with visible individual pixels",
  "limited earth-tone palette: greens, browns, greys, muted golds",
  "medieval fantasy theme",
  "black outline on sprites",
  "no anti-aliasing, hard pixel edges",
  "PNG with transparent background where noted",
].join(", ");

// ---------------------------------------------------------------------------
// Asset definitions
// ---------------------------------------------------------------------------

interface AssetDef {
  filename: string;
  dir: string;
  prompt: string;
  /** Optional reference image path (relative to public/) to include as context. */
  referenceImage?: string;
}

// ── Terrain tiles ──
// These are flat, top-down square textures. The 3D engine rotates them.
const TILE_PROMPT = [
  ART_STYLE,
  "seamless tileable square texture",
  "perfectly flat top-down orthographic view, no perspective, no 3D, no isometric",
  "the texture must fill the ENTIRE square image edge-to-edge with no gaps or transparency",
  "no border, no frame, no diamond shape",
].join(", ");

const CLIFF_PROMPT = [
  ART_STYLE,
  "vertical cliff wall texture, side view",
  "flat front-facing surface, no perspective",
  "fills the entire square image edge-to-edge",
  "no border, no frame",
].join(", ");

const TILES: AssetDef[] = [
  {
    filename: "grass",
    dir: "tiles",
    prompt: `${TILE_PROMPT}. Lush green grass ground, subtle blade variation, small wildflowers, earthy greens`,
  },
  {
    filename: "dirt",
    dir: "tiles",
    prompt: `${TILE_PROMPT}. Packed brown dirt path, worn earth, small embedded pebbles and cracks`,
  },
  {
    filename: "stone",
    dir: "tiles",
    prompt: `${TILE_PROMPT}. Grey cobblestone floor, medieval town paving, irregular fitted stones with mortar lines`,
  },
  {
    filename: "water",
    dir: "tiles",
    prompt: `${TILE_PROMPT}. Calm blue water surface, gentle pixel ripple pattern, no transparency`,
  },
  {
    filename: "grass-cliff",
    dir: "tiles",
    referenceImage: "tiles/grass.png",
    prompt: `${CLIFF_PROMPT}. The attached image is the top-down grass texture. Create a vertical cliff face version using the SAME colors and pixel style. Grassy earth cliff edge, exposed brown dirt layers with grass on top and dangling roots`,
  },
  {
    filename: "dirt-cliff",
    dir: "tiles",
    referenceImage: "tiles/dirt.png",
    prompt: `${CLIFF_PROMPT}. The attached image is the top-down dirt texture. Create a vertical cliff face version using the SAME colors and pixel style. Brown compacted dirt cliff face, visible earth strata layers, embedded stones`,
  },
  {
    filename: "stone-cliff",
    dir: "tiles",
    referenceImage: "tiles/stone.png",
    prompt: `${CLIFF_PROMPT}. The attached image is the top-down stone texture. Create a vertical cliff face version using the SAME colors and pixel style. Grey stone quarry cliff face, layered rock strata, pick marks`,
  },
  {
    filename: "water-cliff",
    dir: "tiles",
    referenceImage: "tiles/water.png",
    prompt: `${CLIFF_PROMPT}. The attached image is the top-down water texture. Create a vertical cliff face version using the SAME colors and pixel style. Dark wet stone cliff, waterline at top, algae and moss, dripping water`,
  },
];

// ── Entity sprites ──
// Front-facing billboard sprites. The engine faces them toward the camera.
// IMPORTANT: all sprites must use the EXACT same camera angle for visual consistency.
const SPRITE_PROMPT = [
  ART_STYLE,
  "single object or character, centered in frame",
  "straight-on front-facing view at eye level, camera looking directly at the subject",
  "NOT isometric, NOT top-down, NOT 3/4 angle, NOT angled",
  "the subject faces the viewer directly",
  "transparent background, no ground, no shadow, no floor, no platform",
  "crisp pixel edges, clean silhouette",
  "consistent scale across all sprites in this set",
].join(", ");

const SPRITES: AssetDef[] = [
  // Player
  {
    filename: "player",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Medieval adventurer in leather armor, brown boots, belt with pouches, idle standing pose facing the viewer. Resembles an Ultima Online player avatar`,
  },

  // Structures — all viewed straight-on from the front, same scale
  {
    filename: "shop",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Small medieval wooden market stall with striped cloth awning, goods on counter, viewed straight-on from the front`,
  },
  {
    filename: "bank",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Small stone bank building with reinforced iron door, gold coin emblem above door, viewed straight-on from the front`,
  },
  {
    filename: "forge",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Blacksmith forge station with anvil, glowing orange furnace opening, stone chimney, viewed straight-on from the front`,
  },
  {
    filename: "cooking-range",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Medieval stone cooking hearth with iron cooking pot hanging over fire, small orange flames, viewed straight-on from the front`,
  },

  // Trees — both viewed straight-on
  {
    filename: "normal-tree",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Medium deciduous tree, brown trunk, round green leafy canopy, viewed straight-on from the front, classic RPG tree sprite`,
  },
  {
    filename: "oak-tree",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Large sturdy oak tree, thick gnarled brown trunk, wide dark-green dense canopy, noticeably bigger than a normal tree`,
  },

  // Ore rocks — squat, rocky
  {
    filename: "copper-rock",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Small boulder with visible copper-orange ore veins running through grey rock, mineable ore node`,
  },
  {
    filename: "tin-rock",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Small boulder with visible silvery-white metallic tin veins running through grey rock, mineable ore node`,
  },
  {
    filename: "iron-rock",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Small boulder with visible dark reddish-brown iron ore veins running through grey rock, mineable ore node`,
  },

  // Fishing spots
  {
    filename: "fishing-spot-shrimp",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Small circular water splash with tiny shrimp jumping, ripple rings on water, fishing spot indicator`,
  },
  {
    filename: "fishing-spot-trout",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Water splash with silver fish tail breaking surface, larger ripple rings, fishing spot indicator`,
  },

  // Monsters — consistent creature sprite style
  {
    filename: "chicken",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. White chicken, small farm bird, pecking pose, classic RPG low-level creature`,
  },
  {
    filename: "rat",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Large brown rat with long pink tail, beady red eyes, facing left, classic RPG giant rat`,
  },
  {
    filename: "spider",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Giant black spider with eight hairy legs spread wide, red eyes, fangs visible, facing forward`,
  },
  {
    filename: "goblin",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Small green-skinned goblin holding crude wooden club, ragged loincloth, pointy ears, aggressive stance`,
  },
  {
    filename: "skeleton",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Undead skeleton warrior, yellowed bones, holding a rusted sword, hollow eye sockets with faint glow`,
  },
  {
    filename: "wolf",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Grey dire wolf, fur bristled, snarling with teeth bared, aggressive hunting stance`,
  },
  {
    filename: "bandit",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Human bandit in dark leather armor, hooded cloak, holding a dagger, menacing rogue stance`,
  },
  {
    filename: "dark-mage",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Evil mage in dark purple robes, hood up, holding glowing staff with purple energy, arcane aura`,
  },
  {
    filename: "troll",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Large hulking green troll, massive wooden club, hunched posture, tusks, ugly warty skin`,
  },
  {
    filename: "briarwood-guardian",
    dir: "sprites",
    prompt: `${SPRITE_PROMPT}. Ancient treant boss monster, body made of twisted dark wood and thorny vines, glowing green eyes, tall and imposing`,
  },
];

// ── Item icons ──
// Small inventory-style icons, front-facing, single item.
const ICON_PROMPT = [
  ART_STYLE,
  "single item icon centered in frame",
  "front-facing view, slight 3/4 angle for depth",
  "transparent background",
  "clean silhouette, no text, no labels, no UI frame",
  "RPG inventory icon style",
].join(", ");

const ICONS: AssetDef[] = [
  // Resources
  {
    filename: "normal-log",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Short wooden log with brown bark, freshly cut light wood visible on ends`,
  },
  {
    filename: "oak-log",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Thick dark oak log, rougher darker bark than normal log, larger`,
  },
  {
    filename: "copper-ore",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Chunk of raw copper ore, grey rock with orange-brown metallic copper streaks`,
  },
  {
    filename: "tin-ore",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Chunk of raw tin ore, grey rock with silvery-white metallic streaks`,
  },
  {
    filename: "iron-ore",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Chunk of raw iron ore, grey rock with dark reddish-brown metallic streaks`,
  },
  {
    filename: "coal",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Lump of black coal, shiny dark faceted surface`,
  },
  {
    filename: "bronze-bar",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Bronze metal ingot, warm orange-brown trapezoidal bar shape`,
  },
  {
    filename: "iron-bar",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Iron metal ingot, dark grey trapezoidal bar shape`,
  },
  {
    filename: "raw-shrimp",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Raw pink shrimp, curved body, uncooked seafood`,
  },
  {
    filename: "raw-trout",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Raw silver-pink trout fish, whole uncooked fish`,
  },
  {
    filename: "feathers",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Small bundle of white feathers tied together`,
  },
  {
    filename: "rat-tail",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Curled pink rat tail, monster drop trophy`,
  },
  {
    filename: "wolf-pelt",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Rolled grey wolf fur pelt, animal hide bundle`,
  },
  {
    filename: "troll-hide",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Thick folded green troll hide, tough scaly leather`,
  },

  // Food
  {
    filename: "cooked-shrimp",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Cooked orange-red shrimp, curled, steaming hot`,
  },
  {
    filename: "cooked-trout",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Cooked golden-brown grilled trout, whole fish on plate`,
  },
  {
    filename: "burnt-fish",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Charred blackened burnt fish, completely ruined overcooked`,
  },

  // Tools
  {
    filename: "bronze-axe",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Bronze axe, orange-brown metal head, wooden handle, woodcutting tool`,
  },
  {
    filename: "iron-axe",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Iron axe, dark grey metal head, wooden handle, woodcutting tool`,
  },
  {
    filename: "bronze-pickaxe",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Bronze pickaxe, orange-brown pointed metal head, wooden handle`,
  },
  {
    filename: "iron-pickaxe",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Iron pickaxe, dark grey pointed metal head, wooden handle`,
  },
  {
    filename: "fishing-rod",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Wooden fishing rod with dangling line and hook`,
  },

  // Bronze equipment
  {
    filename: "bronze-sword",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Bronze short sword, warm orange-brown blade, simple crossguard`,
  },
  {
    filename: "bronze-dagger",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Bronze dagger, small orange-brown pointed blade`,
  },
  {
    filename: "bronze-helm",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Bronze medieval helmet with nose guard, open face`,
  },
  {
    filename: "bronze-platebody",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Bronze chest plate armor, front view, orange-brown metal`,
  },
  {
    filename: "bronze-platelegs",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Bronze leg armor greaves, front view, orange-brown metal`,
  },
  {
    filename: "bronze-shield",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Bronze round shield with central boss, orange-brown metal`,
  },

  // Iron equipment
  {
    filename: "iron-sword",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Iron longsword, dark grey blade, longer than bronze sword`,
  },
  {
    filename: "iron-dagger",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Iron dagger, dark grey pointed blade`,
  },
  {
    filename: "iron-helm",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Iron full helmet with face guard, dark grey metal`,
  },
  {
    filename: "iron-platebody",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Iron chest plate armor, front view, dark grey metal`,
  },
  {
    filename: "iron-platelegs",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Iron leg armor greaves, front view, dark grey metal`,
  },
  {
    filename: "iron-shield",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Iron kite shield, dark grey metal, larger than bronze shield`,
  },

  // Quest / misc
  {
    filename: "spider-silk",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Bundle of white spider silk thread, wispy crafting material`,
  },
  {
    filename: "raw-meat",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Raw red meat chunk, uncooked steak`,
  },
  {
    filename: "bones",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Small pile of white bones, crossed femurs and skull`,
  },
  {
    filename: "guardian-crest",
    dir: "icons",
    prompt: `${ICON_PROMPT}. Ornate wooden crest medallion with embedded green gem, ancient forest relic`,
  },
];

// ---------------------------------------------------------------------------
// Generation logic
// ---------------------------------------------------------------------------

/**
 * Remove near-white / checkered backgrounds from sprite and icon PNGs.
 * AI generators often render a faux-transparent checkered pattern as actual pixels.
 * This flood-fills from corners: any pixel that is light (high luminance) and
 * low saturation (grey/white) gets set to fully transparent.
 */
async function removeBackground(inputBuffer: Buffer): Promise<Buffer> {
  const image = sharp(inputBuffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  if (channels !== 4) return inputBuffer;

  const pixels = new Uint8Array(data);
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const idx = (x: number, y: number) => (y * width + x) * 4;
  const flat = (x: number, y: number) => y * width + x;

  /** Check if a pixel looks like background (light, desaturated, or checkered pattern). */
  function isBackground(i: number): boolean {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    const a = pixels[i + 3]!;

    // Already transparent
    if (a < 10) return true;

    // Light grey/white: high brightness, low color variation
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = (r + g + b) / 3;
    const saturation = max > 0 ? (max - min) / max : 0;

    // Checkered pattern: alternating light/dark grey squares
    // Both the light (#FFFFFF/EFEFEF) and dark (#CCCCCC/CDCDCD) squares are desaturated
    if (lum > 180 && saturation < 0.08) return true;
    if (lum > 140 && lum < 220 && saturation < 0.05) return true;

    return false;
  }

  // Seed from all 4 edges
  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      if (isBackground(idx(x, y)) && !visited[flat(x, y)]) {
        queue.push(x, y);
        visited[flat(x, y)] = 1;
      }
    }
  }
  for (let y = 0; y < height; y++) {
    for (const x of [0, width - 1]) {
      if (isBackground(idx(x, y)) && !visited[flat(x, y)]) {
        queue.push(x, y);
        visited[flat(x, y)] = 1;
      }
    }
  }

  // Flood fill from edges
  while (queue.length > 0) {
    const cy = queue.pop()!;
    const cx = queue.pop()!;
    const i = idx(cx, cy);

    // Set to transparent
    pixels[i + 3] = 0;

    // Check 4 neighbors
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (visited[flat(nx, ny)]) continue;
      visited[flat(nx, ny)] = 1;
      if (isBackground(idx(nx, ny))) {
        queue.push(nx, ny);
      }
    }
  }

  return sharp(Buffer.from(pixels), { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

async function generateAsset(asset: AssetDef, force: boolean): Promise<void> {
  const outDir = path.join(PUBLIC, asset.dir);
  const outPath = path.join(outDir, `${asset.filename}.png`);

  if (!force && existsSync(outPath)) {
    console.log(
      `  -- ${asset.dir}/${asset.filename}.png exists, skipping (use --force to regenerate)`,
    );
    return;
  }

  await ensureDir(outDir);

  console.log(`  >> Generating ${asset.dir}/${asset.filename}.png ...`);

  try {
    // Build content parts — text prompt + optional reference image
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    if (asset.referenceImage) {
      const refPath = path.join(PUBLIC, asset.referenceImage);
      if (existsSync(refPath)) {
        const { readFile } = await import("fs/promises");
        const refData = await readFile(refPath);
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: refData.toString("base64"),
          },
        });
        console.log(`  .. Using reference: ${asset.referenceImage}`);
      }
    }

    parts.push({ text: asset.prompt });

    const response = await ai.models.generateContentStream({
      model: MODEL,
      config: {
        imageConfig: {
          aspectRatio: "1:1" as any,
          imageSize: "1K" as any,
        },
        responseModalities: ["IMAGE", "TEXT"],
      },
      contents: [
        {
          role: "user",
          parts,
        },
      ],
    });

    for await (const chunk of response) {
      if (!chunk.candidates?.[0]?.content?.parts) continue;
      const part = chunk.candidates[0].content.parts[0];
      if (part?.inlineData) {
        let buffer: Buffer = Buffer.from(part.inlineData.data || "", "base64");

        // Post-process: downscale tiles to 64x64 for true pixel-art look
        if (asset.dir === "tiles") {
          console.log(`  .. Downscaling ${asset.filename} to 64x64...`);
          buffer = await sharp(buffer)
            .resize(64, 64, { kernel: sharp.kernel.nearest })
            .png()
            .toBuffer();
        }

        // Post-process sprites and icons to remove AI-generated fake backgrounds
        if (asset.dir === "sprites" || asset.dir === "icons") {
          console.log(`  .. Removing background for ${asset.filename}...`);
          buffer = await removeBackground(buffer);
        }

        // Downscale icons to 32x32
        if (asset.dir === "icons") {
          console.log(`  .. Downscaling ${asset.filename} to 32x32...`);
          buffer = await sharp(buffer)
            .resize(32, 32, { kernel: sharp.kernel.nearest })
            .png()
            .toBuffer();
        }

        await writeFile(outPath, buffer);
        console.log(
          `  OK ${asset.dir}/${asset.filename}.png (${(buffer.length / 1024).toFixed(1)}KB)`,
        );
        return;
      }
    }

    console.log(`  !! No image returned for ${asset.filename}`);
  } catch (err: any) {
    console.error(`  ERR ${asset.filename}: ${err.message}`);
    if (
      err.message?.includes("429") ||
      err.message?.includes("rate") ||
      err.message?.includes("RESOURCE_EXHAUSTED")
    ) {
      console.log(`  .. Rate limited, waiting 60s before retry...`);
      await sleep(60000);
      return generateAsset(asset, force);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateCategory(name: string, assets: AssetDef[], force: boolean): Promise<void> {
  console.log(`\n=== ${name} (${assets.length} assets) ===\n`);
  for (const asset of assets) {
    await generateAsset(asset, force);
    await sleep(2000);
  }
  console.log(`\n=== ${name} done ===\n`);
}

/** Post-process existing sprite/icon PNGs to remove backgrounds without re-generating. */
async function fixBackgrounds(): Promise<void> {
  console.log("\n=== Fixing backgrounds on existing sprites and icons ===\n");
  const dirs = ["sprites", "icons"];
  for (const dir of dirs) {
    const dirPath = path.join(PUBLIC, dir);
    if (!existsSync(dirPath)) continue;
    const { readdir, readFile } = await import("fs/promises");
    const files = await readdir(dirPath);
    for (const file of files) {
      if (!file.endsWith(".png")) continue;
      const filePath = path.join(dirPath, file);
      console.log(`  >> ${dir}/${file}...`);
      const input = await readFile(filePath);
      const output = await removeBackground(input);
      await writeFile(filePath, output);
      console.log(`  OK ${dir}/${file} (${(output.length / 1024).toFixed(1)}KB)`);
    }
  }
  console.log("\n=== Background fix done ===\n");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const fixBg = args.includes("--fix-bg");
  const category = args.find((a) => !a.startsWith("--")) || "all";

  const fixSize = args.includes("--fix-size");

  // --fix-bg mode: just post-process existing files, no API key needed
  if (fixBg) {
    await fixBackgrounds();
    return;
  }

  // --fix-size mode: downscale existing tiles to 64x64, icons to 32x32
  if (fixSize) {
    console.log("\n=== Downscaling existing assets ===\n");
    const { readdir, readFile } = await import("fs/promises");
    const resizeDir = async (dir: string, size: number) => {
      const dirPath = path.join(PUBLIC, dir);
      if (!existsSync(dirPath)) return;
      const files = await readdir(dirPath);
      for (const file of files) {
        if (!file.endsWith(".png")) continue;
        const filePath = path.join(dirPath, file);
        const input = await readFile(filePath);
        const meta = await sharp(input).metadata();
        if (meta.width === size && meta.height === size) {
          console.log(`  -- ${dir}/${file} already ${size}x${size}`);
          continue;
        }
        const output = await sharp(input)
          .resize(size, size, { kernel: sharp.kernel.nearest })
          .png()
          .toBuffer();
        await writeFile(filePath, output);
        console.log(
          `  OK ${dir}/${file} → ${size}x${size} (${(output.length / 1024).toFixed(1)}KB)`,
        );
      }
    };
    await resizeDir("tiles", 64);
    await resizeDir("icons", 32);
    console.log("\n=== Downscale done ===\n");
    return;
  }

  if (!process.env["GEMINI_API_KEY"]) {
    console.error("Error: GEMINI_API_KEY environment variable is required");
    console.error(
      "Usage: GEMINI_API_KEY=your-key npx tsx scripts/generate-assets.ts [category] [--force]",
    );
    console.error("       npx tsx scripts/generate-assets.ts --fix-bg  (remove backgrounds only)");
    process.exit(1);
  }

  console.log("Realm of Idlers - Asset Generator");
  console.log(`  Style:    Ultima Online 16-bit pixel art`);
  console.log(`  Model:    Nano Banana 2 (${MODEL})`);
  console.log(`  Output:   ${PUBLIC}/`);
  console.log(`  Category: ${category}`);
  console.log(`  Force:    ${force}`);

  const categories: Record<string, [string, AssetDef[]]> = {
    tiles: ["Terrain Tiles", TILES],
    sprites: ["Entity Sprites", SPRITES],
    icons: ["Item Icons", ICONS],
  };

  if (category === "all") {
    for (const [name, assets] of Object.values(categories)) {
      await generateCategory(name, assets, force);
    }
  } else if (category in categories) {
    const [name, assets] = categories[category]!;
    await generateCategory(name, assets, force);
  } else {
    console.error(`Unknown category: ${category}`);
    console.error(`Valid: tiles, sprites, icons, all`);
    process.exit(1);
  }

  console.log("\nDone.");
}

void main();
