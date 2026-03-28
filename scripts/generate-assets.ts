/**
 * Asset generation script — supports Gemini and Ideogram providers.
 *
 * Generates ground terrain textures (grass, dirt, stone, water) as
 * seamless tileable 64×64 pixel art tiles.
 *
 * Usage:
 *   GEMINI_API_KEY=key npx tsx scripts/generate-assets.ts [--force]
 *   IDEOGRAM_API_KEY=key npx tsx scripts/generate-assets.ts [--force]
 *
 * Provider is auto-detected from whichever API key is set.
 * Use --provider=gemini or --provider=ideogram to override.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const PUBLIC = path.resolve(import.meta.dirname, "../apps/game/public");

// ---------------------------------------------------------------------------
// Provider abstraction — Gemini vs Ideogram
// ---------------------------------------------------------------------------

type Provider = "gemini" | "ideogram";

function detectProvider(): Provider {
  const args = process.argv.slice(2);
  const explicit = args.find((a) => a.startsWith("--provider="));
  if (explicit) return explicit.split("=")[1] as Provider;
  if (process.env["IDEOGRAM_API_KEY"]) return "ideogram";
  if (process.env["GEMINI_API_KEY"]) return "gemini";
  return "gemini";
}

const PROVIDER = detectProvider();

async function generateImage(prompt: string): Promise<Buffer | null> {
  if (PROVIDER === "ideogram") {
    return generateImageIdeogram(prompt);
  }
  return generateImageGemini(prompt);
}

// ── Gemini provider ──

let _geminiAi: GoogleGenAI | null = null;
function getGeminiAi(): GoogleGenAI {
  if (!_geminiAi) {
    _geminiAi = new GoogleGenAI({ apiKey: process.env["GEMINI_API_KEY"]! });
  }
  return _geminiAi;
}

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";

async function generateImageGemini(prompt: string): Promise<Buffer | null> {
  const ai = getGeminiAi();

  const response = await ai.models.generateContentStream({
    model: GEMINI_MODEL,
    config: {
      imageConfig: {
        aspectRatio: "1:1" as any,
        imageSize: "1K" as any,
      },
      responseModalities: ["IMAGE", "TEXT"],
    },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  for await (const chunk of response) {
    if (!chunk.candidates?.[0]?.content?.parts) continue;
    const part = chunk.candidates[0].content.parts[0];
    if (part?.inlineData) {
      return Buffer.from(part.inlineData.data || "", "base64");
    }
  }
  return null;
}

// ── Ideogram provider ──

async function generateImageIdeogram(prompt: string): Promise<Buffer | null> {
  const apiKey = process.env["IDEOGRAM_API_KEY"]!;
  const url = "https://api.ideogram.ai/v1/ideogram-v3/generate";

  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("aspect_ratio", "1x1");
  formData.append("rendering_speed", "DEFAULT");
  formData.append("magic_prompt", "OFF");
  formData.append(
    "negative_prompt",
    "blurry, photorealistic, 3D render, smooth gradients, anti-aliased, modern, flat design, neon colors",
  );
  formData.append("num_images", "1");
  formData.append("style_type", "DESIGN");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Api-Key": apiKey },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ideogram ${response.status}: ${text}`);
  }

  const json = (await response.json()) as {
    data: Array<{ url: string | null }>;
  };
  const imageUrl = json.data?.[0]?.url;
  if (!imageUrl) return null;

  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) {
    throw new Error(`Failed to download image: ${imgResponse.status}`);
  }
  return Buffer.from(await imgResponse.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Style & prompt
// ---------------------------------------------------------------------------

const ART_STYLE = [
  "16-bit pixel art",
  "Ultima Online (1997) art style",
  "hand-pixeled look with visible individual pixels",
  "limited earth-tone palette: greens, browns, greys, muted golds",
  "medieval fantasy theme",
  "no anti-aliasing, hard pixel edges",
].join(", ");

const TILE_PROMPT = [
  ART_STYLE,
  "seamless tileable square texture that repeats infinitely in all directions",
  "when copies of this texture are placed edge-to-edge in a grid the pattern must flow continuously with NO visible seam lines between tiles",
  "the left edge must match the right edge pixel-for-pixel and the top edge must match the bottom edge pixel-for-pixel",
  "perfectly flat top-down orthographic view, no perspective, no 3D, no isometric",
  "the texture must fill the ENTIRE square image edge-to-edge with no gaps or transparency",
  "no border, no frame, no diamond shape, no vignette, no darkened edges",
  "uniform density and brightness across the entire texture — no center focal point, no radial gradient, no spotlight effect",
].join(", ");

// ---------------------------------------------------------------------------
// Tile definitions
// ---------------------------------------------------------------------------

interface TileDef {
  name: string;
  filename: string;
  prompt: string;
}

const TILES: TileDef[] = [
  {
    name: "grass",
    filename: "grass",
    prompt: [
      TILE_PROMPT,
      "",
      "Generate a SINGLE seamless tileable grass terrain texture for a medieval fantasy RPG styled after Ultima Online (1997). Viewed from directly above (pure top-down orthographic). The texture fills the ENTIRE image edge-to-edge — no borders, no frame, no transparency.",
      "",
      "Lush temperate meadow grass. A rich base of forest green (#4a7c3f) with subtle individual blade variation using 3-4 green shades. Scatter tiny wildflower dots (yellow, white) very sparingly. Small clover patches. The texture should feel alive and organic, not a flat solid color — like the grassy fields of Ultima Online's Britannia. Use pixel-level noise for natural variation.",
      "",
      "CRITICAL: This texture must tile seamlessly — when placed next to copies of itself, the edges must match perfectly with no visible seam lines. The entire image is ONE texture, not a grid.",
    ].join("\n"),
  },
  {
    name: "dirt",
    filename: "dirt",
    prompt: [
      TILE_PROMPT,
      "",
      "Generate a SINGLE seamless tileable dirt path terrain texture for a medieval fantasy RPG styled after Ultima Online (1997). Viewed from directly above (pure top-down orthographic). The texture fills the ENTIRE image edge-to-edge.",
      "",
      "Well-worn packed earth path. Warm brown base (#8b7355) with visible cart-wheel ruts, small embedded grey pebbles, and hairline cracks in the dry surface. 3-4 brown shades from dark umber to light tan. Feels like a road that's been traveled for centuries. Not mud — dry, compacted earth.",
      "",
      "CRITICAL: This texture must tile seamlessly. The entire image is ONE texture, not a grid.",
    ].join("\n"),
  },
  {
    name: "stone",
    filename: "stone",
    prompt: [
      TILE_PROMPT,
      "",
      "Generate a SINGLE seamless tileable cobblestone terrain texture for a medieval fantasy RPG styled after Ultima Online (1997). Viewed from directly above (pure top-down orthographic). The texture fills the ENTIRE image edge-to-edge.",
      "",
      "Medieval cobblestone town paving. Irregular hand-laid grey stone blocks (#888888) with darker mortar lines between them. Each stone is slightly different in size and shade — some lighter, some darker grey. The mortar gaps are narrow and dark. Feels like the town square of a medieval village. Clean and well-maintained.",
      "",
      "CRITICAL: This texture must tile seamlessly. The entire image is ONE texture, not a grid.",
    ].join("\n"),
  },
  {
    name: "water",
    filename: "water",
    prompt: [
      TILE_PROMPT,
      "",
      "Generate a SINGLE seamless tileable water surface terrain texture for a medieval fantasy RPG styled after Ultima Online (1997). Viewed from directly above (pure top-down orthographic). The texture fills the ENTIRE image edge-to-edge. No transparency — fully opaque.",
      "",
      "Calm river or pond surface. Muted blue base (#3a6ea5) with gentle pixel ripple patterns suggesting slow-moving water. Subtle light reflection highlights in lighter blue. The ripples should be small and regular, creating a pleasant tiling pattern. Only water — no land, no shore, no other terrain type.",
      "",
      "CRITICAL: This texture must tile seamlessly. The entire image is ONE texture — only water, nothing else.",
    ].join("\n"),
  },
];

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_RETRIES = 3;

async function generateTile(tile: TileDef, force: boolean, attempt = 0): Promise<void> {
  const outDir = path.join(PUBLIC, "tiles");
  if (!existsSync(outDir)) {
    await mkdir(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, `${tile.filename}.png`);
  if (!force && existsSync(outPath)) {
    console.log(`  -- ${tile.name}: exists, skipping`);
    return;
  }

  console.log(`  >> Generating ${tile.name}...`);

  try {
    const buffer = await generateImage(tile.prompt);
    if (!buffer) {
      console.log(`  !! No image returned for ${tile.name}`);
      return;
    }

    // Resize to 64×64 with nearest-neighbor (preserve pixel art)
    const resized = await sharp(buffer)
      .resize(64, 64, { kernel: sharp.kernel.nearest })
      .png()
      .toBuffer();

    await writeFile(outPath, resized);
    console.log(`  OK tiles/${tile.filename}.png (${(resized.length / 1024).toFixed(1)}KB)`);
  } catch (err: any) {
    console.error(`  ERR ${tile.name}: ${err.message}`);
    if (attempt >= MAX_RETRIES) {
      console.error(`  !! Giving up on ${tile.name} after ${MAX_RETRIES} retries`);
      return;
    }
    const msg = err.message || "";
    if (msg.includes("429") || msg.includes("rate") || msg.includes("RESOURCE_EXHAUSTED")) {
      console.log(`  .. Rate limited, waiting 60s (${attempt + 1}/${MAX_RETRIES})...`);
      await sleep(60000);
      return generateTile(tile, force, attempt + 1);
    }
    if (msg.includes("500") || msg.includes("INTERNAL")) {
      console.log(`  .. Server error, waiting 10s (${attempt + 1}/${MAX_RETRIES})...`);
      await sleep(10000);
      return generateTile(tile, force, attempt + 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes("--force");

  const hasKey = process.env["GEMINI_API_KEY"] || process.env["IDEOGRAM_API_KEY"];
  if (!hasKey) {
    console.error("Error: Set GEMINI_API_KEY or IDEOGRAM_API_KEY environment variable");
    console.error("Usage: GEMINI_API_KEY=key npx tsx scripts/generate-assets.ts [--force]");
    process.exit(1);
  }

  console.log("Realm of Idlers - Asset Generator");
  console.log(`  Provider: ${PROVIDER}`);
  console.log(`  Output:   ${PUBLIC}/tiles/`);
  console.log(`  Force:    ${force}`);
  console.log("");

  for (const tile of TILES) {
    await generateTile(tile, force);
    await sleep(2000);
  }

  console.log("\nDone.");
}

void main();
