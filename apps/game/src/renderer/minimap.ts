import type { GameMap } from "@realm-of-idlers/world";
import { getGround } from "@realm-of-idlers/world";

const TERRAIN_COLORS: Record<string, string> = {
  grass: "#4a7c3f",
  dirt: "#8b7355",
  stone: "#888888",
  water: "#3a6ea5",
};

const MINIMAP_SCALE = 3; // 3px per tile

/**
 * 2D minimap overlay rendered on a separate canvas.
 * Shows terrain colors and player dot.
 */
export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrainImageData: ImageData;
  private mapWidth: number;
  private mapHeight: number;

  constructor(container: HTMLElement, gameMap: GameMap) {
    this.mapWidth = gameMap.meta.width;
    this.mapHeight = gameMap.meta.height;

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.mapWidth * MINIMAP_SCALE;
    this.canvas.height = this.mapHeight * MINIMAP_SCALE;
    this.canvas.style.imageRendering = "pixelated";
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d")!;

    this.terrainImageData = this.ctx.createImageData(
      this.mapWidth * MINIMAP_SCALE,
      this.mapHeight * MINIMAP_SCALE,
    );
    this.renderTerrain(gameMap);
  }

  /** Update the player position indicator. */
  updatePlayerPosition(col: number, row: number): void {
    this.ctx.putImageData(this.terrainImageData, 0, 0);

    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(
      col * MINIMAP_SCALE - 1,
      row * MINIMAP_SCALE - 1,
      MINIMAP_SCALE + 2,
      MINIMAP_SCALE + 2,
    );
  }

  /** No-op — fog of war removed so the full map is always visible. */
  updateExploredTiles(_explored: Set<string>): void {}

  dispose(): void {
    this.canvas.remove();
  }

  private renderTerrain(gameMap: GameMap): void {
    for (let row = 0; row < this.mapHeight; row++) {
      for (let col = 0; col < this.mapWidth; col++) {
        const ground = getGround(gameMap, col, row);
        const colorHex = TERRAIN_COLORS[ground?.terrain ?? "grass"] ?? TERRAIN_COLORS.grass!;
        const rgb = hexToRgb(colorHex);

        for (let dy = 0; dy < MINIMAP_SCALE; dy++) {
          for (let dx = 0; dx < MINIMAP_SCALE; dx++) {
            const px = col * MINIMAP_SCALE + dx;
            const py = row * MINIMAP_SCALE + dy;
            const idx = (py * this.mapWidth * MINIMAP_SCALE + px) * 4;
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
