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
 */
export function createScene(canvas: HTMLCanvasElement): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // sky blue

  // Orthographic camera — isometric 2:1 angle
  const aspect = window.innerWidth / window.innerHeight;
  const viewSize = 20;
  const camera = new THREE.OrthographicCamera(
    -viewSize * aspect,
    viewSize * aspect,
    viewSize,
    -viewSize,
    0.1,
    1000,
  );

  // Position camera at isometric angle
  camera.position.set(30, 40, 30);
  camera.lookAt(0, 0, 0);

  // Lights
  const dirLight = new THREE.DirectionalLight(0xfff4e0, 1.2);
  dirLight.position.set(20, 30, 10);
  scene.add(dirLight);

  const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
  scene.add(ambientLight);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Ground plane for raycasting (invisible, large)
  const groundGeometry = new THREE.PlaneGeometry(200, 200);
  const groundMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = 0;
  scene.add(groundPlane);

  const raycaster = new THREE.Raycaster();

  const ctx: SceneContext = { scene, camera, renderer, raycaster, groundPlane };

  // Handle window resize
  window.addEventListener("resize", () => resizeCamera(ctx));

  return ctx;
}

/** Update camera and renderer on window resize. */
export function resizeCamera(ctx: SceneContext): void {
  const aspect = window.innerWidth / window.innerHeight;
  const viewSize = 20;
  ctx.camera.left = -viewSize * aspect;
  ctx.camera.right = viewSize * aspect;
  ctx.camera.top = viewSize;
  ctx.camera.bottom = -viewSize;
  ctx.camera.updateProjectionMatrix();
  ctx.renderer.setSize(window.innerWidth, window.innerHeight);
}
