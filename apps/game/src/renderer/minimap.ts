import type { GameMap, GameMapV2 } from "@realm-of-idlers/world";
import { getGround } from "@realm-of-idlers/world";

const TERRAIN_COLORS: Record<string, string> = {
  grass: "#4a7c3f",
  dirt: "#8b7355",
  stone: "#888888",
  water: "#3a6ea5",
  sand: "#c2b280",
  forest: "#2d5a1e",
  jungle: "#1a5c2a",
  snow: "#e8e8e8",
  cave: "#4a4a4a",
  brick: "#8b4513",
  sandstone: "#d2a679",
  wood: "#8b6914",
  tile: "#a0856c",
  farmland: "#6b4226",
  lava: "#cc3300",
  cobblestones: "#5a5550",
  marble: "#c0b8b0",
  flagstone: "#908070",
};

/** Pixels per tile on the minimap. */
const MINIMAP_SCALE = 2;
/** Visible viewport size in pixels. */
const VIEWPORT_SIZE = 160;

/**
 * 2D minimap overlay rendered on a separate canvas.
 * Shows a scrolling viewport centered on the player with terrain colors and a player dot.
 */
export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  /** Offscreen full-map terrain render at MINIMAP_SCALE px/tile. */
  private terrainCanvas: OffscreenCanvas;
  private terrainCtx: OffscreenCanvasRenderingContext2D;
  private mapWidth: number;
  private mapHeight: number;

  constructor(container: HTMLElement, gameMap: GameMap | GameMapV2) {
    this.mapWidth = gameMap.meta.width;
    this.mapHeight = gameMap.meta.height;

    // Visible canvas — fixed viewport size
    this.canvas = document.createElement("canvas");
    this.canvas.width = VIEWPORT_SIZE;
    this.canvas.height = VIEWPORT_SIZE;
    this.canvas.style.imageRendering = "pixelated";
    this.canvas.style.width = `${VIEWPORT_SIZE}px`;
    this.canvas.style.height = `${VIEWPORT_SIZE}px`;
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d")!;

    // Offscreen canvas — full map at MINIMAP_SCALE
    this.terrainCanvas = new OffscreenCanvas(
      this.mapWidth * MINIMAP_SCALE,
      this.mapHeight * MINIMAP_SCALE,
    );
    this.terrainCtx = this.terrainCanvas.getContext("2d")!;
    this.renderTerrain(gameMap);
  }

  /** Update the viewport to center on the player. */
  updatePlayerPosition(col: number, row: number): void {
    const px = col * MINIMAP_SCALE;
    const py = row * MINIMAP_SCALE;
    const half = VIEWPORT_SIZE / 2;

    // Source rect on the terrain canvas (clamped to bounds)
    const fullW = this.mapWidth * MINIMAP_SCALE;
    const fullH = this.mapHeight * MINIMAP_SCALE;
    const sx = Math.max(0, Math.min(fullW - VIEWPORT_SIZE, px - half));
    const sy = Math.max(0, Math.min(fullH - VIEWPORT_SIZE, py - half));

    this.ctx.clearRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);
    this.ctx.drawImage(
      this.terrainCanvas,
      sx,
      sy,
      VIEWPORT_SIZE,
      VIEWPORT_SIZE,
      0,
      0,
      VIEWPORT_SIZE,
      VIEWPORT_SIZE,
    );

    // Player dot (always centered unless at map edge)
    const dotX = px - sx;
    const dotY = py - sy;
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(dotX - 2, dotY - 2, 5, 5);
    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(dotX - 2, dotY - 2, 5, 5);
  }

  /** No-op — fog of war removed so the full map is always visible. */
  updateExploredTiles(_explored: Set<string>): void {}

  dispose(): void {
    this.canvas.remove();
  }

  private renderTerrain(gameMap: GameMap | GameMapV2): void {
    const imageData = this.terrainCtx.createImageData(
      this.mapWidth * MINIMAP_SCALE,
      this.mapHeight * MINIMAP_SCALE,
    );
    const data = imageData.data;
    const stride = this.mapWidth * MINIMAP_SCALE;

    for (let row = 0; row < this.mapHeight; row++) {
      for (let col = 0; col < this.mapWidth; col++) {
        const ground = getGround(gameMap, col, row);
        const colorHex = TERRAIN_COLORS[ground?.terrain ?? "grass"] ?? TERRAIN_COLORS.grass!;
        const rgb = hexToRgb(colorHex);

        for (let dy = 0; dy < MINIMAP_SCALE; dy++) {
          for (let dx = 0; dx < MINIMAP_SCALE; dx++) {
            const px = col * MINIMAP_SCALE + dx;
            const py = row * MINIMAP_SCALE + dy;
            const idx = (py * stride + px) * 4;
            data[idx] = rgb.r;
            data[idx + 1] = rgb.g;
            data[idx + 2] = rgb.b;
            data[idx + 3] = 255;
          }
        }
      }
    }
    this.terrainCtx.putImageData(imageData, 0, 0);
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  };
}
