import * as THREE from "three";
import { tileToWorld } from "@realm-of-idlers/shared";
import type { GameMap, MapSpawnZone } from "@realm-of-idlers/world";
import { getGround, getObjectType } from "@realm-of-idlers/world";

/** Half-height of the player sprite. */
const PLAYER_HALF_HEIGHT = 0.6;

const loader = new THREE.TextureLoader();

/**
 * Create a sprite material that attempts to load a texture.
 * If the texture file is missing (404), falls back to a solid color.
 */
function makeSpriteMaterial(
  textureName: string | null,
  fallbackColor: number,
): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({
    color: fallbackColor,
    side: THREE.DoubleSide,
  });

  if (textureName) {
    loader.load(
      `/sprites/${textureName}.png`,
      (tex) => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.map = tex;
        mat.color.set(0xffffff);
        mat.transparent = true;
        mat.alphaTest = 0.5;
        mat.depthWrite = false;
        mat.needsUpdate = true;
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
 */
export class SpriteRenderer {
  private playerMesh: THREE.Mesh;
  private scene: THREE.Scene;
  private camera: THREE.Camera | null = null;
  private gameMap: GameMap;
  private monsterMeshes: THREE.Mesh[] = [];
  private entityMeshes: THREE.Mesh[] = [];

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

  constructor(scene: THREE.Scene, gameMap: GameMap) {
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

    const ground = getGround(this.gameMap, col, row);
    const elevation = ground?.elevation ?? 0;
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

  /** Set camera reference for billboarding. */
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
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

    // Billboard all sprites to face the camera
    if (this.camera) {
      this.billboardToCamera(this.playerMesh);
      for (const mesh of this.entityMeshes) {
        this.billboardToCamera(mesh);
      }
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
      const ground = getGround(this.gameMap, centerCol, centerRow);
      const pos = tileToWorld(centerCol, centerRow, ground?.elevation ?? 0);
      const mesh = new THREE.Mesh(monsterGeo, monsterMat);
      mesh.position.set(pos.x, pos.y + 0.4, pos.z);
      this.scene.add(mesh);
      this.monsterMeshes.push(mesh);
    }
  }

  /** Place entity sprites from the map's object list using the object registry. */
  updateEntities(): void {
    for (const mesh of this.entityMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.entityMeshes = [];

    for (const obj of this.gameMap.objects) {
      const typeDef = getObjectType(obj.typeId);
      const w = typeDef?.width ?? 0.6;
      const h = typeDef?.height ?? 0.6;
      const color = typeDef?.fallbackColor ?? 0xaaaaaa;
      const sprite = typeDef?.sprite ?? null;

      const geo = new THREE.PlaneGeometry(w, h);
      const mat = makeSpriteMaterial(sprite, color);
      const mesh = new THREE.Mesh(geo, mat);

      const ground = getGround(this.gameMap, obj.col, obj.row);
      const pos = tileToWorld(obj.col, obj.row, ground?.elevation ?? 0);
      mesh.position.set(pos.x, pos.y + h / 2, pos.z);
      mesh.userData = { tileCol: obj.col, tileRow: obj.row };

      this.scene.add(mesh);
      this.entityMeshes.push(mesh);
    }
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
