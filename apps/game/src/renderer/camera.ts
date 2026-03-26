import * as THREE from "three";
import { tileToWorld } from "@realm-of-idlers/shared";

const CAMERA_OFFSET = new THREE.Vector3(20, 25, 20);
const LERP_FACTOR = 0.08;

/**
 * Smooth camera that lerps toward the target position each frame.
 */
export class SmoothCamera {
  private camera: THREE.OrthographicCamera;
  private target = new THREE.Vector3();
  private lookTarget = new THREE.Vector3();

  constructor(camera: THREE.OrthographicCamera) {
    this.camera = camera;
  }

  /** Set the target tile position to follow. */
  setTarget(col: number, row: number): void {
    const worldPos = tileToWorld(col, row, 0);
    this.target.set(worldPos.x + CAMERA_OFFSET.x, CAMERA_OFFSET.y, worldPos.z + CAMERA_OFFSET.z);
    this.lookTarget.set(worldPos.x, 0, worldPos.z);
  }

  /** Lerp camera toward target. Call each frame. */
  update(): void {
    this.camera.position.lerp(this.target, LERP_FACTOR);
    // Smoothly update lookAt by interpolating a temporary target
    const currentLook = new THREE.Vector3();
    this.camera.getWorldDirection(currentLook);
    this.camera.lookAt(this.lookTarget);
  }

  /** Snap camera to target immediately (for initial positioning). */
  snap(): void {
    this.camera.position.copy(this.target);
    this.camera.lookAt(this.lookTarget);
  }
}
