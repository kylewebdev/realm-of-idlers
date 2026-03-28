import * as THREE from "three";
import { tileToWorld } from "@realm-of-idlers/shared";
import type { GameMap, GameMapV2, MapSpawnZone } from "@realm-of-idlers/world";
import { getGround, getGroundV2, getStaticTile } from "@realm-of-idlers/world";
import { getDebugParams } from "./debug-gui.js";

/** Half-height of the player sprite. */
const PLAYER_HALF_HEIGHT = 0.6;

const loader = new THREE.TextureLoader();

/**
 * Create a sprite material that attempts to load a texture.
 * Calls onLoaded with pixel dimensions when the texture loads.
 */
function makeSpriteMaterial(
  texturePath: string | null,
  fallbackColor: number,
  onLoaded?: (width: number, height: number) => void,
): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({
    color: fallbackColor,
    side: THREE.DoubleSide,
  });

  if (texturePath) {
    loader.load(
      texturePath,
      (tex) => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.map = tex;
        mat.color.set(0xffffff);
        mat.transparent = true;
        mat.alphaTest = getDebugParams().alphaTest;
        mat.depthWrite = false;
        mat.needsUpdate = true;
        if (onLoaded && tex.image) {
          onLoaded(tex.image.width, tex.image.height);
        }
      },
      undefined,
      () => {
        // Texture failed to load — keep the fallback color
      },
    );
  }

  return mat;
}

/**
 * Renders player, monster, and map object sprites as billboard planes.
 * Supports both V1 GameMap and V2 GameMapV2 formats.
 */
/** Art dimensions metadata: graphicId → [width, height] in pixels. */
type ArtDimensions = Record<string, [number, number]>;

export class SpriteRenderer {
  private playerMesh: THREE.Mesh;
  private scene: THREE.Scene;
  private camera: THREE.Camera | null = null;
  private gameMap: GameMap | GameMapV2;
  private monsterMeshes: THREE.Mesh[] = [];
  private entityMeshes: THREE.Mesh[] = [];
  private artDimensions: ArtDimensions = {};

  /** Previous world position (where the sprite is coming from). */
  private prevX = 0;
  private prevY = PLAYER_HALF_HEIGHT;
  private prevZ = 0;
  /** Target world position the player is moving toward. */
  private targetX = 0;
  private targetY = PLAYER_HALF_HEIGHT;
  private targetZ = 0;
  /** 0..1 interpolation progress between prev and target. */
  private moveProgress = 1;

  /** Get full-range elevation for a tile (avoids V1 adapter's 0-3 clamp). */
  private getElevation(col: number, row: number): number {
    if (this.gameMap.meta.version === 2) {
      return getGroundV2(this.gameMap as GameMapV2, col, row)?.elevation ?? 0;
    }
    return getGround(this.gameMap, col, row)?.elevation ?? 0;
  }

  constructor(scene: THREE.Scene, gameMap: GameMap | GameMapV2) {
    this.scene = scene;
    this.gameMap = gameMap;
    // Player: billboard sprite
    const playerGeo = new THREE.PlaneGeometry(0.8, 1.2);
    const playerMat = makeSpriteMaterial("player", 0x3366cc);
    this.playerMesh = new THREE.Mesh(playerGeo, playerMat);
    this.playerMesh.position.y = PLAYER_HALF_HEIGHT;
    scene.add(this.playerMesh);
  }

  /** Current movement delay in ms — set by bridge each frame during movement. */
  private moveDelayMs = 200;

  /** Update the movement delay so interpolation stays in sync with tile steps. */
  setMoveDelay(delayMs: number): void {
    this.moveDelayMs = delayMs;
  }

  /** Set the next target tile. Uses sprite's current visual position as start. */
  setPlayerPosition(col: number, row: number): void {
    this.prevX = this.playerMesh.position.x;
    this.prevY = this.playerMesh.position.y;
    this.prevZ = this.playerMesh.position.z;

    const elevation = this.getElevation(col, row);
    const pos = tileToWorld(col, row, elevation);
    this.targetX = pos.x;
    this.targetY = pos.y + PLAYER_HALF_HEIGHT;
    this.targetZ = pos.z;

    this.moveProgress = 0;
  }

  /** Snap the player sprite to the target instantly (use on init / teleport). */
  snapPlayerPosition(): void {
    this.playerMesh.position.x = this.targetX;
    this.playerMesh.position.y = this.targetY;
    this.playerMesh.position.z = this.targetZ;
    this.prevX = this.targetX;
    this.prevY = this.targetY;
    this.prevZ = this.targetZ;
    this.moveProgress = 1;
  }

  /** Fixed Y rotation for static sprites facing the isometric camera. */
  private fixedSpriteRotationY = Math.PI / 4;

  /** Set camera reference for billboarding. */
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
    // Compute fixed rotation from camera direction (orthographic = constant direction)
    const camPos = camera.position;
    this.fixedSpriteRotationY = Math.atan2(camPos.x, camPos.z);
  }

  /** Smoothly interpolate the player sprite between tiles each frame. */
  update(deltaMs: number): void {
    if (this.moveProgress < 1) {
      this.moveProgress = Math.min(1, this.moveProgress + deltaMs / this.moveDelayMs);
      const t = this.moveProgress;
      this.playerMesh.position.x = this.prevX + (this.targetX - this.prevX) * t;
      this.playerMesh.position.y = this.prevY + (this.targetY - this.prevY) * t;
      this.playerMesh.position.z = this.prevZ + (this.targetZ - this.prevZ) * t;
    }

    // Only billboard the player — static entities use fixed isometric rotation
    if (this.camera) {
      this.billboardToCamera(this.playerMesh);
    }
  }

  /** Rotate a plane mesh to face the camera (Y-axis billboard). */
  private billboardToCamera(mesh: THREE.Mesh): void {
    if (!this.camera) return;
    const camPos = this.camera.position;
    const dx = camPos.x - mesh.position.x;
    const dz = camPos.z - mesh.position.z;
    mesh.rotation.y = Math.atan2(dx, dz);
  }

  /** Place monster sprites at spawn zone rect centers. */
  updateSpawnZones(zones: MapSpawnZone[]): void {
    for (const mesh of this.monsterMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.monsterMeshes = [];

    const monsterGeo = new THREE.BoxGeometry(0.5, 0.8, 0.5);
    const monsterMat = new THREE.MeshBasicMaterial({ color: 0xcc3333 });

    for (const zone of zones) {
      const centerCol = Math.floor((zone.rect.colStart + zone.rect.colEnd) / 2);
      const centerRow = Math.floor((zone.rect.rowStart + zone.rect.rowEnd) / 2);
      const elevation = this.getElevation(centerCol, centerRow);
      const pos = tileToWorld(centerCol, centerRow, elevation);
      const mesh = new THREE.Mesh(monsterGeo, monsterMat);
      mesh.position.set(pos.x, pos.y + 0.4, pos.z);
      this.scene.add(mesh);
      this.monsterMeshes.push(mesh);
    }
  }

  /** Render radius (in tiles) around the player for entity sprites. */
  private static ENTITY_RADIUS = 20;

  /** All entity items from the map (cached). */
  private allEntityItems: {
    col: number;
    row: number;
    z: number;
    typeId: string;
    graphicId?: number;
    itemHeight?: number;
    flags: number;
  }[] = [];

  /** Last player position used for entity culling. */
  private lastEntityCol = -999;
  private lastEntityRow = -999;

  /** Load art dimensions metadata for proper sprite sizing. */
  async loadArtDimensions(mapPath: string): Promise<void> {
    const artPath = mapPath.replace(".json", "-art.json");
    try {
      const resp = await fetch(artPath);
      if (resp.ok) {
        this.artDimensions = await resp.json();
        console.log(
          `[SpriteRenderer] Loaded art dimensions: ${Object.keys(this.artDimensions).length} entries`,
        );
      }
    } catch {
      console.warn(`[SpriteRenderer] Could not load art dimensions from ${artPath}`);
    }
  }

  /** Place entity sprites from the map's statics/objects using the static registry. */
  updateEntities(): void {
    this.allEntityItems = this.getEntityItems();
    this.lastEntityCol = -999; // force rebuild on next updateNearbyEntities
  }

  /** Rebuild visible entity meshes around the player position. */
  updateNearbyEntities(playerCol: number, playerRow: number): void {
    // Only rebuild when the player moves more than 5 tiles from last rebuild
    const dx = Math.abs(playerCol - this.lastEntityCol);
    const dy = Math.abs(playerRow - this.lastEntityRow);
    if (dx < 5 && dy < 5) return;
    this.lastEntityCol = playerCol;
    this.lastEntityRow = playerRow;

    for (const mesh of this.entityMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.entityMeshes = [];

    const radius = SpriteRenderer.ENTITY_RADIUS;

    for (const item of this.allEntityItems) {
      if (Math.abs(item.col - playerCol) > radius || Math.abs(item.row - playerRow) > radius)
        continue;

      const typeDef = getStaticTile(item.typeId);

      // Determine sprite path and fallback color
      let spritePath: string | null = null;
      let color = 0xaaaaaa;

      if (item.graphicId != null) {
        spritePath = `/sprites/item/${item.graphicId}.png`;
      }
      if (typeDef) {
        if (!typeDef.sprite && (typeDef.category === "wall" || typeDef.category === "fence"))
          continue;
        color = typeDef.fallbackColor ?? 0xaaaaaa;
        if (!spritePath && typeDef.sprite) spritePath = `/sprites/${typeDef.sprite}.png`;
      }

      // Get art dimensions from metadata (or use defaults)
      const TILE_PX = 44;
      const artDims = item.graphicId != null ? this.artDimensions[String(item.graphicId)] : null;
      const artW = artDims ? artDims[0] : (typeDef?.width ?? 0.6) * TILE_PX;
      const artH = artDims ? artDims[1] : (typeDef?.renderHeight ?? 0.6) * TILE_PX;

      // Convert art pixel dimensions to world units (with debug multipliers)
      const dbg = getDebugParams();
      const sprW = (artW / TILE_PX) * dbg.spriteWidthMul;
      const sprH = (artH / TILE_PX) * dbg.spriteHeightMul;

      // Two-tier elevation: ground items snap to terrain surface,
      // elevated items (walls/roofs) ramp up so roofs sit above walls.
      const groundElev = this.getElevation(item.col, item.row);
      const groundY = groundElev * dbg.staticElevScale;
      const delta = Math.max(0, item.z - groundElev);
      const GROUND_THRESHOLD = 2;
      let layerY: number;
      if (delta <= GROUND_THRESHOLD) {
        layerY = delta * 0.005;
      } else {
        layerY = GROUND_THRESHOLD * 0.005 + (delta - GROUND_THRESHOLD) * dbg.elevatedScale;
      }
      const baseY = groundY + layerY;

      // All statics render as vertical billboards — UO art already has isometric perspective
      const geo = new THREE.PlaneGeometry(sprW, sprH);
      const mat = makeSpriteMaterial(spritePath, color);
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.set(item.col, baseY + sprH / 2 + dbg.spriteBaseOffset, item.row);
      mesh.rotation.y = this.fixedSpriteRotationY;

      // UO depth formula: (X + Y) for isometric position + Z for elevation
      // Higher col+row = further east/south = renders in front
      mesh.renderOrder =
        item.col + item.row + (127 + item.z) * 0.01 + ((item.itemHeight ?? 0) > 0 ? 0.005 : 0);
      mesh.userData = { tileCol: item.col, tileRow: item.row };

      this.scene.add(mesh);
      this.entityMeshes.push(mesh);
    }
  }

  /** Get entity items from either V1 objects or V2 statics (excluding wall-edge statics). */
  private getEntityItems(): {
    col: number;
    row: number;
    z: number;
    typeId: string;
    graphicId?: number;
    flags: number;
  }[] {
    if (this.gameMap.meta.version === 2) {
      const v2 = this.gameMap as GameMapV2;
      return v2.statics
        .filter((s) => !s.edge)
        .map((s) => ({
          col: s.col,
          row: s.row,
          z: s.z,
          typeId: s.staticId,
          graphicId: s.graphicId,
          itemHeight: s.itemHeight,
          flags: s.flags,
        }));
    }
    const v1 = this.gameMap as GameMap;
    return v1.objects.map((o) => ({ col: o.col, row: o.row, z: 0, typeId: o.typeId, flags: 0 }));
  }

  /** Get all interactive entity meshes for raycasting. */
  getEntityMeshes(): THREE.Mesh[] {
    return this.entityMeshes;
  }

  dispose(): void {
    this.scene.remove(this.playerMesh);
    this.playerMesh.geometry.dispose();
    for (const mesh of this.monsterMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    for (const mesh of this.entityMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
  }
}
