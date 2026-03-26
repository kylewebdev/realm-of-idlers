import * as THREE from "three";
import type { TileCoord } from "@realm-of-idlers/shared";
import { tileToWorld } from "@realm-of-idlers/shared";
import type { MapIndex, MapObject } from "@realm-of-idlers/world";
import {
  getGround,
  getObject,
  isWalkable,
  findPath,
  getObjectType,
  screenToTile,
} from "@realm-of-idlers/world";
import type { SceneContext } from "../renderer/scene.js";
import type { SpriteRenderer } from "../renderer/sprite-renderer.js";
import { uiStore } from "../ui/store.js";

/** Tooltip descriptions keyed by object typeId or interaction activityId. */
const TOOLTIP_OVERRIDES: Record<string, { title: string; description: string }> = {
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
  shop: { title: "General Store", description: "Buy and sell items." },
  bank: { title: "Bank", description: "Store items safely." },
  forge: { title: "Forge", description: "Smelt ores and smith equipment." },
  "cooking-range": { title: "Cooking Range", description: "Cook raw fish and food." },
};

/** Get tooltip for a map object. */
function getTooltipForObject(obj: MapObject): { title: string; description: string } | null {
  // Check interaction-specific tooltips first
  if (obj.interaction?.kind === "resource") {
    const tip = TOOLTIP_OVERRIDES[obj.interaction.activityId];
    if (tip) return tip;
  }
  if (obj.interaction?.kind === "structure") {
    const tip = TOOLTIP_OVERRIDES[obj.interaction.structureType];
    if (tip) return tip;
  }
  // Fall back to object type registry label
  const typeDef = getObjectType(obj.typeId);
  if (typeDef) {
    return { title: typeDef.label, description: `A ${typeDef.label.toLowerCase()}.` };
  }
  return null;
}

/**
 * Setup mouse click handling for click-to-move and tile interaction,
 * plus hover highlighting for interactive tiles.
 */
export function setupMouseInput(
  canvas: HTMLCanvasElement,
  sceneCtx: SceneContext,
  index: MapIndex,
  spriteRenderer: SpriteRenderer,
  playerPosition: () => TileCoord,
  onMoveTo: (path: TileCoord[]) => void,
  onClickObject: (obj: MapObject, coord: TileCoord) => void,
  onClickGround: (coord: TileCoord) => void,
): () => void {
  const entityRaycaster = new THREE.Raycaster();
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

  const tooltip = document.createElement("div");
  tooltip.style.cssText =
    "position:fixed;pointer-events:none;z-index:1000;display:none;" +
    "background:rgba(0,0,0,0.85);color:#fff;padding:6px 10px;border-radius:4px;" +
    "font-family:sans-serif;font-size:13px;line-height:1.4;max-width:220px;" +
    "border:1px solid rgba(255,255,255,0.15);";
  document.body.appendChild(tooltip);

  function toNdc(event: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    };
  }

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

    if (key === hoveredKey) {
      if (tooltip.style.display === "block") {
        tooltip.style.left = `${event.clientX + 12}px`;
        tooltip.style.top = `${event.clientY - 8}px`;
      }
      return;
    }
    hoveredKey = key;

    const obj = getObject(index, tileCoord.col, tileCoord.row);
    if (obj) {
      const ground = getGround(index.map, tileCoord.col, tileCoord.row);
      const pos = tileToWorld(tileCoord.col, tileCoord.row, ground?.elevation ?? 0);
      highlightMesh.position.set(pos.x, pos.y + 0.01, pos.z);
      highlightMesh.visible = true;
      canvas.style.cursor = "pointer";

      const tip = getTooltipForObject(obj);
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

    // Check for interactive object at this tile
    const obj = getObject(index, tileCoord.col, tileCoord.row);
    if (obj && obj.interaction) {
      onClickObject(obj, tileCoord);
      return;
    }

    // Regular ground click — check walkability and pathfind
    if (!isWalkable(index, tileCoord.col, tileCoord.row)) return;

    onClickGround(tileCoord);

    const from = playerPosition();
    const path = findPath(index, from, tileCoord);
    if (path && path.length > 1) {
      onMoveTo(path);
    }
  };

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0]!;
    const synth = { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent;
    onClick(synth);
    hideTooltip();
  };

  canvas.addEventListener("click", onClick);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("touchstart", onTouchStart, { passive: true });

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
    canvas.removeEventListener("touchstart", onTouchStart);
    unsubModal();
    sceneCtx.scene.remove(highlightMesh);
    highlightGeo.dispose();
    highlightMat.dispose();
    tooltip.remove();
    canvas.style.cursor = "";
  };
}
