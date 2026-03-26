import { MAP_SIZE } from "@realm-of-idlers/shared";
import type { TileMap } from "@realm-of-idlers/world";
import { getTile } from "@realm-of-idlers/world";

const TERRAIN_COLORS: Record<string, string> = {
  grass: "#4a7c3f",
  dirt: "#8b7355",
  stone: "#888888",
  water: "#3a6ea5",
};

const MINIMAP_SCALE = 3; // 3px per tile → 192×192 canvas

/**
 * 2D minimap overlay rendered on a separate canvas.
 * Shows terrain colors and player dot.
 */
export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrainImageData: ImageData;

  constructor(container: HTMLElement, tiles: TileMap) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = MAP_SIZE * MINIMAP_SCALE;
    this.canvas.height = MAP_SIZE * MINIMAP_SCALE;
    this.canvas.style.imageRendering = "pixelated";
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d")!;

    // Pre-render terrain
    this.terrainImageData = this.ctx.createImageData(
      MAP_SIZE * MINIMAP_SCALE,
      MAP_SIZE * MINIMAP_SCALE,
    );
    this.renderTerrain(tiles);
  }

  /** Update the player position indicator. */
  updatePlayerPosition(col: number, row: number): void {
    // Redraw terrain
    this.ctx.putImageData(this.terrainImageData, 0, 0);

    // Draw player dot
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(
      col * MINIMAP_SCALE - 1,
      row * MINIMAP_SCALE - 1,
      MINIMAP_SCALE + 2,
      MINIMAP_SCALE + 2,
    );
  }

  /** No-op — fog of war removed so the full map is always visible. */
  updateExploredTiles(_explored: Set<string>): void {
    // Intentionally empty — full map is always shown
  }

  dispose(): void {
    this.canvas.remove();
  }

  private renderTerrain(tiles: TileMap): void {
    for (let row = 0; row < MAP_SIZE; row++) {
      for (let col = 0; col < MAP_SIZE; col++) {
        const tile = getTile(tiles, col, row);
        const colorHex = TERRAIN_COLORS[tile?.terrain ?? "grass"] ?? TERRAIN_COLORS.grass!;
        const rgb = hexToRgb(colorHex);

        for (let dy = 0; dy < MINIMAP_SCALE; dy++) {
          for (let dx = 0; dx < MINIMAP_SCALE; dx++) {
            const px = col * MINIMAP_SCALE + dx;
            const py = row * MINIMAP_SCALE + dy;
            const idx = (py * MAP_SIZE * MINIMAP_SCALE + px) * 4;
            this.terrainImageData.data[idx] = rgb.r;
            this.terrainImageData.data[idx + 1] = rgb.g;
            this.terrainImageData.data[idx + 2] = rgb.b;
            this.terrainImageData.data[idx + 3] = 255;
          }
        }
      }
    }
    this.ctx.putImageData(this.terrainImageData, 0, 0);
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
