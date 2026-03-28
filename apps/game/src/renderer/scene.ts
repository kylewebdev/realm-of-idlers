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
 * Camera sees ~16 tiles wide.
 */
export function createScene(canvas: HTMLCanvasElement, mapSize = 256): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = null; // Disabled — was hiding terrain on large maps

  // Orthographic camera — isometric angle
  const aspect = window.innerWidth / window.innerHeight;
  const viewSize = 8;
  const halfMap = mapSize / 2;
  const camera = new THREE.OrthographicCamera(
    -viewSize * aspect,
    viewSize * aspect,
    viewSize,
    -viewSize,
    0.1,
    400,
  );

  // Isometric camera angle: ~35.26° elevation (standard isometric)
  camera.position.set(halfMap + 20, 28, halfMap + 20);
  camera.lookAt(halfMap, 0, halfMap);

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
  const planeSize = mapSize * 2;
  const groundGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
  const groundMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.set(halfMap, 0, halfMap);
  scene.add(groundPlane);

  const raycaster = new THREE.Raycaster();

  const ctx: SceneContext = { scene, camera, renderer, raycaster, groundPlane };

  window.addEventListener("resize", () => resizeCamera(ctx));

  return ctx;
}

/** Update camera and renderer on window resize. */
export function resizeCamera(ctx: SceneContext): void {
  const aspect = window.innerWidth / window.innerHeight;
  const viewSize = 8;
  ctx.camera.left = -viewSize * aspect;
  ctx.camera.right = viewSize * aspect;
  ctx.camera.top = viewSize;
  ctx.camera.bottom = -viewSize;
  ctx.camera.updateProjectionMatrix();
  ctx.renderer.setSize(window.innerWidth, window.innerHeight);
}
