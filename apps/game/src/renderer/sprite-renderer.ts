import * as THREE from "three";
import { tileToWorld } from "@realm-of-idlers/shared";
import type { SpawnZone, TileMap } from "@realm-of-idlers/world";
import { getTile } from "@realm-of-idlers/world";

/**
 * Renders player, monster, and NPC sprites as colored box placeholders.
 * Will be replaced with billboard sprite sheets in Step 11.
 */
export class SpriteRenderer {
  private playerMesh: THREE.Mesh;
  private scene: THREE.Scene;
  private monsterMeshes: THREE.Mesh[] = [];
  private npcMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    // Player: blue box
    const playerGeo = new THREE.BoxGeometry(0.6, 1.2, 0.6);
    const playerMat = new THREE.MeshLambertMaterial({ color: 0x3366cc });
    this.playerMesh = new THREE.Mesh(playerGeo, playerMat);
    this.playerMesh.position.y = 0.6;
    scene.add(this.playerMesh);
  }

  /** Move the player sprite to a tile position. */
  setPlayerPosition(col: number, row: number): void {
    const pos = tileToWorld(col, row, 0);
    this.playerMesh.position.set(pos.x, 0.6, pos.z);
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
      const pos = tileToWorld(centerTile.col, centerTile.row, 0);
      const mesh = new THREE.Mesh(monsterGeo, monsterMat);
      mesh.position.set(pos.x, 0.4, pos.z);
      this.scene.add(mesh);
      this.monsterMeshes.push(mesh);
    }
  }

  /** Place NPC sprites at town structure locations. */
  updateStructures(tiles: TileMap): void {
    for (const mesh of this.npcMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.npcMeshes = [];

    const npcGeo = new THREE.BoxGeometry(0.5, 1.0, 0.5);
    const npcMat = new THREE.MeshLambertMaterial({ color: 0xcccc33 });

    for (let row = 0; row < tiles.length; row++) {
      for (let col = 0; col < tiles[row]!.length; col++) {
        const tile = getTile(tiles, col, row);
        if (tile?.structure) {
          const pos = tileToWorld(col, row, 0);
          const mesh = new THREE.Mesh(npcGeo, npcMat);
          mesh.position.set(pos.x, 0.5, pos.z);
          this.scene.add(mesh);
          this.npcMeshes.push(mesh);
        }
      }
    }
  }

  dispose(): void {
    this.scene.remove(this.playerMesh);
    this.playerMesh.geometry.dispose();
    for (const mesh of this.monsterMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    for (const mesh of this.npcMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
  }
}
