import * as THREE from "three";
import type { TileCoord } from "@realm-of-idlers/shared";
import { worldToTile } from "@realm-of-idlers/shared";

/**
 * Convert a screen position to a tile coordinate via raycasting.
 *
 * Raycasts against terrain meshes first (accurate for elevated terrain),
 * then falls back to the ground plane if no terrain hit.
 *
 * @param mouseX - Normalized device coordinate X (-1 to 1)
 * @param mouseY - Normalized device coordinate Y (-1 to 1)
 * @param camera - The orthographic camera
 * @param raycaster - Reusable raycaster instance
 * @param groundPlane - The ground plane mesh (fallback)
 * @param terrainMeshes - Optional terrain heightmap meshes for accurate picking
 * @returns The tile coordinate under the mouse, or null if no intersection
 */
export function screenToTile(
  mouseX: number,
  mouseY: number,
  camera: THREE.OrthographicCamera,
  raycaster: THREE.Raycaster,
  groundPlane: THREE.Mesh,
  terrainMeshes?: THREE.Mesh[],
): TileCoord | null {
  raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

  // Try terrain meshes first for accurate elevated-terrain picking
  if (terrainMeshes && terrainMeshes.length > 0) {
    const hits = raycaster.intersectObjects(terrainMeshes, false);
    if (hits.length > 0) {
      const point = hits[0]!.point;
      return worldToTile({ x: point.x, y: point.y, z: point.z });
    }
  }

  // Fallback to flat ground plane
  const intersects = raycaster.intersectObject(groundPlane);
  if (intersects.length === 0) return null;

  const point = intersects[0]!.point;
  return worldToTile({ x: point.x, y: point.y, z: point.z });
}
