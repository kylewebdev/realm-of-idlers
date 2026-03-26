import * as THREE from "three";
import { tileToWorld } from "@realm-of-idlers/shared";
import type { SpawnZone, TileMap } from "@realm-of-idlers/world";
import { getTile } from "@realm-of-idlers/world";

/** Half-height of the player box — used to sit the sprite on top of terrain. */
const PLAYER_HALF_HEIGHT = 0.6;

/** Colors and sizes for resource node entities by activity prefix. */
const RESOURCE_STYLES: Record<
  string,
  { color: number; width: number; height: number; depth: number }
> = {
  "chop-normal-tree": { color: 0x2d8a4e, width: 0.5, height: 1.0, depth: 0.5 }, // green
  "chop-oak-tree": { color: 0x1b5e30, width: 0.6, height: 1.2, depth: 0.6 }, // dark green
  "mine-copper": { color: 0xc87533, width: 0.5, height: 0.5, depth: 0.5 }, // copper orange
  "mine-tin": { color: 0xb0b0b0, width: 0.5, height: 0.5, depth: 0.5 }, // silver-grey
  "mine-iron": { color: 0x6b3a2a, width: 0.5, height: 0.5, depth: 0.5 }, // dark brown
  "fish-shrimp": { color: 0x5599cc, width: 0.4, height: 0.3, depth: 0.4 }, // light blue
  "fish-trout": { color: 0x3377aa, width: 0.5, height: 0.4, depth: 0.5 }, // deeper blue
};

/** Colors for structure entities. */
const STRUCTURE_COLORS: Record<string, number> = {
  shop: 0xcccc33, // yellow
  bank: 0xdaa520, // gold
  forge: 0xff6633, // orange-red
  "cooking-range": 0xcc6644, // warm brown
};

/**
 * Renders player, monster, NPC, and resource node sprites as colored box placeholders.
 */
export class SpriteRenderer {
  private playerMesh: THREE.Mesh;
  private scene: THREE.Scene;
  private tiles: TileMap;
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

  constructor(scene: THREE.Scene, tiles: TileMap) {
    this.scene = scene;
    this.tiles = tiles;
    // Player: blue box
    const playerGeo = new THREE.BoxGeometry(0.6, 1.2, 0.6);
    const playerMat = new THREE.MeshLambertMaterial({ color: 0x3366cc });
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
    // Start from where the sprite actually is right now — no visual jump
    this.prevX = this.playerMesh.position.x;
    this.prevY = this.playerMesh.position.y;
    this.prevZ = this.playerMesh.position.z;

    const tile = getTile(this.tiles, col, row);
    const elevation = tile?.elevation ?? 0;
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

  /** Smoothly interpolate the player sprite between tiles each frame. */
  update(deltaMs: number): void {
    if (this.moveProgress < 1) {
      this.moveProgress = Math.min(1, this.moveProgress + deltaMs / this.moveDelayMs);
      // Linear interpolation — constant speed between tiles for smooth continuous motion
      const t = this.moveProgress;
      this.playerMesh.position.x = this.prevX + (this.targetX - this.prevX) * t;
      this.playerMesh.position.y = this.prevY + (this.targetY - this.prevY) * t;
      this.playerMesh.position.z = this.prevZ + (this.targetZ - this.prevZ) * t;
    }
  }

  /** Place monster sprites at spawn zone centers. */
  updateSpawnZones(zones: SpawnZone[]): void {
    // Clear existing
    for (const mesh of this.monsterMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.monsterMeshes = [];

    const monsterGeo = new THREE.BoxGeometry(0.5, 0.8, 0.5);
    const monsterMat = new THREE.MeshLambertMaterial({ color: 0xcc3333 });

    for (const zone of zones) {
      if (zone.tiles.length === 0) continue;
      // Place at center of zone
      const centerTile = zone.tiles[Math.floor(zone.tiles.length / 2)]!;
      const tile = getTile(this.tiles, centerTile.col, centerTile.row);
      const pos = tileToWorld(centerTile.col, centerTile.row, tile?.elevation ?? 0);
      const mesh = new THREE.Mesh(monsterGeo, monsterMat);
      mesh.position.set(pos.x, pos.y + 0.4, pos.z);
      this.scene.add(mesh);
      this.monsterMeshes.push(mesh);
    }
  }

  /** Place entity sprites for structures and resource nodes. */
  updateEntities(tiles: TileMap): void {
    for (const mesh of this.entityMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.entityMeshes = [];

    for (let row = 0; row < tiles.length; row++) {
      for (let col = 0; col < tiles[row]!.length; col++) {
        const tile = getTile(tiles, col, row);
        if (!tile) continue;

        if (tile.structure) {
          const color = STRUCTURE_COLORS[tile.structure] ?? 0xcccc33;
          const geo = new THREE.BoxGeometry(0.5, 1.0, 0.5);
          const mat = new THREE.MeshLambertMaterial({ color });
          const mesh = new THREE.Mesh(geo, mat);
          const pos = tileToWorld(col, row, tile.elevation);
          mesh.position.set(pos.x, pos.y + 0.5, pos.z);
          mesh.userData = { tileCol: col, tileRow: row };
          this.scene.add(mesh);
          this.entityMeshes.push(mesh);
        }

        if (tile.resourceNode) {
          const style = RESOURCE_STYLES[tile.resourceNode.activityId];
          const w = style?.width ?? 0.4;
          const h = style?.height ?? 0.6;
          const d = style?.depth ?? 0.4;
          const color = style?.color ?? 0xaaaaaa;
          const geo = new THREE.BoxGeometry(w, h, d);
          const mat = new THREE.MeshLambertMaterial({ color });
          const mesh = new THREE.Mesh(geo, mat);
          const pos = tileToWorld(col, row, tile.elevation);
          mesh.position.set(pos.x, pos.y + h / 2, pos.z);
          mesh.userData = { tileCol: col, tileRow: row };
          this.scene.add(mesh);
          this.entityMeshes.push(mesh);
        }
      }
    }
  }

  /** Get all interactive entity meshes for raycasting. Each has userData.tileCol/tileRow. */
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
