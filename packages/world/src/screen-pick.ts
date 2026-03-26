import * as THREE from "three";
import type { TileCoord } from "@realm-of-idlers/shared";
import { worldToTile } from "@realm-of-idlers/shared";

/**
 * Convert a screen position to a tile coordinate via raycasting.
 *
 * @param mouseX - Normalized device coordinate X (-1 to 1)
 * @param mouseY - Normalized device coordinate Y (-1 to 1)
 * @param camera - The orthographic camera
 * @param raycaster - Reusable raycaster instance
 * @param groundPlane - The ground plane mesh to intersect
 * @returns The tile coordinate under the mouse, or null if no intersection
 */
export function screenToTile(
  mouseX: number,
  mouseY: number,
  camera: THREE.OrthographicCamera,
  raycaster: THREE.Raycaster,
  groundPlane: THREE.Mesh,
): TileCoord | null {
  raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
  const intersects = raycaster.intersectObject(groundPlane);

  if (intersects.length === 0) return null;

  const point = intersects[0]!.point;
  return worldToTile({ x: point.x, y: point.y, z: point.z });
}
