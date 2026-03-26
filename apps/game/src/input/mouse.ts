import type { TileCoord } from "@realm-of-idlers/shared";
import type { TileData, TileMap } from "@realm-of-idlers/world";
import { getTile, findPath, screenToTile } from "@realm-of-idlers/world";
import type { SceneContext } from "../renderer/scene.js";

/**
 * Setup mouse click handling for click-to-move and tile interaction.
 *
 * Returns a cleanup function to remove event listeners.
 */
export function setupMouseInput(
  canvas: HTMLCanvasElement,
  sceneCtx: SceneContext,
  tiles: TileMap,
  playerPosition: () => TileCoord,
  onMoveTo: (path: TileCoord[]) => void,
  onClickTile: (tile: TileData, coord: TileCoord) => void,
): () => void {
  const onClick = (event: MouseEvent) => {
    // Convert to normalized device coordinates (-1 to 1)
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const tileCoord = screenToTile(
      mouseX,
      mouseY,
      sceneCtx.camera,
      sceneCtx.raycaster,
      sceneCtx.groundPlane,
    );

    if (!tileCoord) return;

    const tile = getTile(tiles, tileCoord.col, tileCoord.row);
    if (!tile || !tile.walkable) return;

    // Notify about the clicked tile (for resource/combat/NPC interactions)
    onClickTile(tile, tileCoord);

    // Find path and dispatch movement
    const from = playerPosition();
    const path = findPath(tiles, from, tileCoord);
    if (path && path.length > 1) {
      onMoveTo(path);
    }
  };

  canvas.addEventListener("click", onClick);

  return () => {
    canvas.removeEventListener("click", onClick);
  };
}
