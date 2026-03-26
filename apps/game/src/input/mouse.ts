import * as THREE from "three";
import type { TileCoord } from "@realm-of-idlers/shared";
import { tileToWorld } from "@realm-of-idlers/shared";
import type { TileData, TileMap } from "@realm-of-idlers/world";
import { getTile, findPath, screenToTile } from "@realm-of-idlers/world";
import type { SceneContext } from "../renderer/scene.js";
import type { SpriteRenderer } from "../renderer/sprite-renderer.js";
import { uiStore } from "../ui/store.js";

/** Returns true if a tile has something interactive the player can click on. */
function isInteractive(tile: TileData): boolean {
  return !!(tile.resourceNode || tile.structure);
}

/** Tooltip info for resource nodes keyed by activityId. */
const RESOURCE_TOOLTIPS: Record<string, { title: string; description: string }> = {
  "chop-normal-tree": { title: "Tree", description: "Chop for logs. Requires Woodcutting 1." },
  "chop-oak-tree": { title: "Oak Tree", description: "Sturdy hardwood. Requires Woodcutting 15." },
  "mine-copper": { title: "Copper Rock", description: "Mine copper ore. Requires Mining 1." },
  "mine-tin": { title: "Tin Rock", description: "Mine tin ore. Requires Mining 1." },
  "mine-iron": { title: "Iron Rock", description: "Mine iron ore. Requires Mining 15." },
  "fish-shrimp": { title: "Fishing Spot", description: "Net shrimp here. Requires Fishing 1." },
  "fish-trout": {
    title: "Fishing Spot (Trout)",
    description: "Catch trout here. Requires Fishing 20.",
  },
};

/** Tooltip info for structures keyed by structure type. */
const STRUCTURE_TOOLTIPS: Record<string, { title: string; description: string }> = {
  shop: { title: "General Store", description: "Buy and sell items." },
  bank: { title: "Bank", description: "Store items safely." },
  forge: { title: "Forge", description: "Smelt ores and smith equipment." },
  "cooking-range": { title: "Cooking Range", description: "Cook raw fish and food." },
};

/** Get tooltip content for a tile, or null if none. */
function getTooltip(tile: TileData): { title: string; description: string } | null {
  if (tile.resourceNode) {
    return RESOURCE_TOOLTIPS[tile.resourceNode.activityId] ?? null;
  }
  if (tile.structure) {
    return STRUCTURE_TOOLTIPS[tile.structure] ?? null;
  }
  return null;
}

/**
 * Setup mouse click handling for click-to-move and tile interaction,
 * plus hover highlighting for interactive tiles.
 *
 * Returns a cleanup function to remove event listeners.
 */
export function setupMouseInput(
  canvas: HTMLCanvasElement,
  sceneCtx: SceneContext,
  tiles: TileMap,
  spriteRenderer: SpriteRenderer,
  playerPosition: () => TileCoord,
  onMoveTo: (path: TileCoord[]) => void,
  onClickTile: (tile: TileData, coord: TileCoord) => void,
): () => void {
  const entityRaycaster = new THREE.Raycaster();
  // Highlight overlay mesh — a semi-transparent plane placed over hovered interactive tiles
  const highlightGeo = new THREE.PlaneGeometry(1, 1);
  const highlightMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.25,
    depthTest: false,
  });
  const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
  highlightMesh.rotation.x = -Math.PI / 2;
  highlightMesh.visible = false;
  sceneCtx.scene.add(highlightMesh);

  let hoveredKey = "";

  // Create tooltip element
  const tooltip = document.createElement("div");
  tooltip.style.cssText =
    "position:fixed;pointer-events:none;z-index:1000;display:none;" +
    "background:rgba(0,0,0,0.85);color:#fff;padding:6px 10px;border-radius:4px;" +
    "font-family:sans-serif;font-size:13px;line-height:1.4;max-width:220px;" +
    "border:1px solid rgba(255,255,255,0.15);";
  document.body.appendChild(tooltip);

  /** Convert a mouse event to normalized device coordinates. */
  function toNdc(event: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    };
  }

  /** Raycast against entity meshes and return the hit tile coord, or null. */
  function raycastEntity(ndcX: number, ndcY: number): TileCoord | null {
    entityRaycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), sceneCtx.camera);
    const hits = entityRaycaster.intersectObjects(spriteRenderer.getEntityMeshes(), false);
    if (hits.length > 0) {
      const ud = hits[0]!.object.userData;
      if (ud.tileCol !== undefined && ud.tileRow !== undefined) {
        return { col: ud.tileCol as number, row: ud.tileRow as number };
      }
    }
    return null;
  }

  function showTooltip(event: MouseEvent, title: string, description: string): void {
    tooltip.innerHTML = `<strong style="color:#ffd666">${title}</strong><br><span style="color:#ccc">${description}</span>`;
    tooltip.style.display = "block";
    tooltip.style.left = `${event.clientX + 12}px`;
    tooltip.style.top = `${event.clientY - 8}px`;
  }

  function hideTooltip(): void {
    tooltip.style.display = "none";
  }

  const onMouseMove = (event: MouseEvent) => {
    const ndc = toNdc(event);

    // Try entity mesh raycast first, then fall back to ground plane
    const entityCoord = raycastEntity(ndc.x, ndc.y);
    const tileCoord =
      entityCoord ??
      screenToTile(ndc.x, ndc.y, sceneCtx.camera, sceneCtx.raycaster, sceneCtx.groundPlane);

    if (!tileCoord) {
      highlightMesh.visible = false;
      hoveredKey = "";
      canvas.style.cursor = "";
      hideTooltip();
      return;
    }

    const key = `${tileCoord.col},${tileCoord.row}`;

    // Always update tooltip position even on the same tile
    if (key === hoveredKey) {
      if (tooltip.style.display === "block") {
        tooltip.style.left = `${event.clientX + 12}px`;
        tooltip.style.top = `${event.clientY - 8}px`;
      }
      return;
    }
    hoveredKey = key;

    const tile = getTile(tiles, tileCoord.col, tileCoord.row);
    if (tile && isInteractive(tile)) {
      const pos = tileToWorld(tileCoord.col, tileCoord.row, tile.elevation);
      highlightMesh.position.set(pos.x, pos.y + 0.01, pos.z);
      highlightMesh.visible = true;
      canvas.style.cursor = "pointer";

      const tip = getTooltip(tile);
      if (tip) {
        showTooltip(event, tip.title, tip.description);
      } else {
        hideTooltip();
      }
    } else {
      highlightMesh.visible = false;
      canvas.style.cursor = "";
      hideTooltip();
    }
  };

  const onClick = (event: MouseEvent) => {
    const ndc = toNdc(event);
    const entityCoord = raycastEntity(ndc.x, ndc.y);
    const tileCoord =
      entityCoord ??
      screenToTile(ndc.x, ndc.y, sceneCtx.camera, sceneCtx.raycaster, sceneCtx.groundPlane);

    if (!tileCoord) return;

    const tile = getTile(tiles, tileCoord.col, tileCoord.row);
    if (!tile) return;

    // Interactive entity (resource node, structure) — notify via onClickTile
    // which handles both pathfinding and pending activity/structure setup
    if (!tile.walkable && isInteractive(tile)) {
      onClickTile(tile, tileCoord);
      return;
    }

    if (!tile.walkable) return;

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
  canvas.addEventListener("mousemove", onMouseMove);

  // Hide tooltip and highlight when a modal opens
  const unsubModal = uiStore.subscribe(() => {
    if (uiStore.getState().activeModal) {
      hideTooltip();
      highlightMesh.visible = false;
      hoveredKey = "";
      canvas.style.cursor = "";
    }
  });

  return () => {
    canvas.removeEventListener("click", onClick);
    canvas.removeEventListener("mousemove", onMouseMove);
    unsubModal();
    sceneCtx.scene.remove(highlightMesh);
    highlightGeo.dispose();
    highlightMat.dispose();
    tooltip.remove();
    canvas.style.cursor = "";
  };
}
