import * as THREE from "three";
import { tileToWorld } from "@realm-of-idlers/shared";

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  lifetime: number;
  age: number;
  active: boolean;
}

const POOL_SIZE = 64;
const PARTICLE_COLORS = {
  wood: 0x8b6914,
  ore: 0xff6600,
  fish: 0x3399ff,
  levelup: 0xffd700,
};

/**
 * Simple particle system with object pooling for gather/level-up effects.
 */
export class ParticleSystem {
  private pool: Particle[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const geo = new THREE.SphereGeometry(0.08, 4, 4);

    for (let i = 0; i < POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({
        mesh,
        velocity: new THREE.Vector3(),
        lifetime: 0,
        age: 0,
        active: false,
      });
    }
  }

  /** Spawn particles for a gathering action completion. */
  spawnGatherParticle(col: number, row: number, type: "wood" | "ore" | "fish"): void {
    const pos = tileToWorld(col, row, 0);
    const color = PARTICLE_COLORS[type];
    for (let i = 0; i < 5; i++) {
      this.spawn(pos.x, pos.z, color, 0.8);
    }
  }

  /** Spawn a burst of gold particles for level-up. */
  spawnLevelUpParticle(col: number, row: number): void {
    const pos = tileToWorld(col, row, 0);
    for (let i = 0; i < 10; i++) {
      this.spawn(pos.x, pos.z, PARTICLE_COLORS.levelup, 1.2);
    }
  }

  /** Update all active particles. Call each frame. */
  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const p of this.pool) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.lifetime) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      // Move
      p.mesh.position.x += p.velocity.x * dt;
      p.mesh.position.y += p.velocity.y * dt;
      p.mesh.position.z += p.velocity.z * dt;
      // Fade
      const alpha = 1 - p.age / p.lifetime;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
    }
  }

  dispose(): void {
    for (const p of this.pool) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    this.pool = [];
  }

  private spawn(x: number, z: number, color: number, lifetime: number): void {
    const p = this.pool.find((p) => !p.active);
    if (!p) return;

    p.active = true;
    p.age = 0;
    p.lifetime = lifetime;
    p.mesh.visible = true;
    p.mesh.position.set(x + (Math.random() - 0.5) * 0.5, 0.5, z + (Math.random() - 0.5) * 0.5);
    p.velocity.set((Math.random() - 0.5) * 2, 1.5 + Math.random(), (Math.random() - 0.5) * 2);
    (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
  }
}
