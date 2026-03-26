import * as THREE from "three";

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  raycaster: THREE.Raycaster;
  groundPlane: THREE.Mesh;
}

/**
 * Create the Three.js scene with isometric orthographic camera,
 * lights, and a ground plane for raycasting.
 *
 * Coordinate system: X/Z = ground plane (1 unit per tile), Y = up.
 * Map is 64×64 units. Camera sees ~30 tiles wide.
 */
export function createScene(canvas: HTMLCanvasElement): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 60, 120);

  // Orthographic camera — isometric angle
  const aspect = window.innerWidth / window.innerHeight;
  const viewSize = 15;
  const camera = new THREE.OrthographicCamera(
    -viewSize * aspect,
    viewSize * aspect,
    viewSize,
    -viewSize,
    0.1,
    200,
  );

  // Position camera above and behind, looking down at isometric angle
  camera.position.set(32 + 20, 25, 32 + 20);
  camera.lookAt(32, 0, 32);

  // Lights
  const dirLight = new THREE.DirectionalLight(0xfff4e0, 1.2);
  dirLight.position.set(50, 30, 20);
  scene.add(dirLight);

  const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
  scene.add(ambientLight);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Ground plane for raycasting (invisible, covers entire map)
  const groundGeometry = new THREE.PlaneGeometry(128, 128);
  const groundMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.set(32, 0, 32); // center on map
  scene.add(groundPlane);

  const raycaster = new THREE.Raycaster();

  const ctx: SceneContext = { scene, camera, renderer, raycaster, groundPlane };

  window.addEventListener("resize", () => resizeCamera(ctx));

  return ctx;
}

/** Update camera and renderer on window resize. */
export function resizeCamera(ctx: SceneContext): void {
  const aspect = window.innerWidth / window.innerHeight;
  const viewSize = 15;
  ctx.camera.left = -viewSize * aspect;
  ctx.camera.right = viewSize * aspect;
  ctx.camera.top = viewSize;
  ctx.camera.bottom = -viewSize;
  ctx.camera.updateProjectionMatrix();
  ctx.renderer.setSize(window.innerWidth, window.innerHeight);
}
