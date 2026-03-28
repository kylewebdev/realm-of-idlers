import * as THREE from "three";
import { tileToWorld } from "@realm-of-idlers/shared";

// Standard isometric: direction (1, √2, 1) gives ~35.26° elevation angle.
// Scale factor 20 keeps the camera well above any terrain.
const CAMERA_OFFSET = new THREE.Vector3(20, 28, 20);

/** Exponential ease speed — lower = softer trail behind the player. */
const CAMERA_EASE_SPEED = 4;

/**
 * Smooth camera that eases toward the target position each frame.
 * Uses frame-rate-independent exponential interpolation.
 */
export class SmoothCamera {
  private camera: THREE.OrthographicCamera;
  private target = new THREE.Vector3();
  private lookTarget = new THREE.Vector3();
  private currentLook = new THREE.Vector3();
  private lastTime = 0;

  constructor(camera: THREE.OrthographicCamera) {
    this.camera = camera;
    this.lastTime = performance.now();
  }

  /** Set the target tile position to follow. */
  setTarget(col: number, row: number, elevation = 0): void {
    const worldPos = tileToWorld(col, row, elevation);
    this.target.set(
      worldPos.x + CAMERA_OFFSET.x,
      worldPos.y + CAMERA_OFFSET.y,
      worldPos.z + CAMERA_OFFSET.z,
    );
    this.lookTarget.set(worldPos.x, worldPos.y, worldPos.z);
  }

  /** Ease camera toward target. Call each frame. */
  update(): void {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    const t = 1 - Math.exp(-CAMERA_EASE_SPEED * dt);
    this.camera.position.lerp(this.target, t);
    this.currentLook.lerp(this.lookTarget, t);
    this.camera.lookAt(this.currentLook);
  }

  /** Snap camera to target immediately (for initial positioning). */
  snap(): void {
    this.camera.position.copy(this.target);
    this.currentLook.copy(this.lookTarget);
    this.camera.lookAt(this.lookTarget);
    this.lastTime = performance.now();
  }
}
