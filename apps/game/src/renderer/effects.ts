import * as THREE from "three";

const DAY_DURATION_MS = 1_200_000; // 20 real minutes = 1 game day

// Color palette for time of day (indexed by phase 0-3)
const SKY_COLORS = [
  new THREE.Color(0x1a1a3e), // night (midnight)
  new THREE.Color(0xffb347), // dawn
  new THREE.Color(0x87ceeb), // day (noon)
  new THREE.Color(0xff6b6b), // dusk
];

const LIGHT_COLORS = [
  new THREE.Color(0x334466), // night
  new THREE.Color(0xffd700), // dawn (warm gold)
  new THREE.Color(0xfff4e0), // day (warm white)
  new THREE.Color(0xff8c42), // dusk (orange)
];

const AMBIENT_INTENSITIES = [0.3, 0.6, 0.8, 0.5]; // night, dawn, day, dusk
const DIR_INTENSITIES = [0.2, 0.8, 1.2, 0.7];

/**
 * Day/night cycle that transitions light and sky colors over a 20-minute game day.
 */
export class DayNightCycle {
  private dirLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private scene: THREE.Scene;
  private elapsed = 0;
  private tempColor = new THREE.Color();

  constructor(
    dirLight: THREE.DirectionalLight,
    ambientLight: THREE.AmbientLight,
    scene: THREE.Scene,
  ) {
    this.dirLight = dirLight;
    this.ambientLight = ambientLight;
    this.scene = scene;
    // Start at dawn (25% into the cycle)
    this.elapsed = DAY_DURATION_MS * 0.25;
  }

  /** Get time of day as 0-1 (0=midnight, 0.5=noon). */
  getTimeOfDay(): number {
    return (this.elapsed % DAY_DURATION_MS) / DAY_DURATION_MS;
  }

  /** Update the cycle. Call each frame with delta time in ms. */
  update(deltaMs: number): void {
    this.elapsed += deltaMs;
    const t = this.getTimeOfDay();

    // Map t to 4 phases: night(0-0.25), dawn(0.25-0.5), day(0.5-0.75), dusk(0.75-1.0)
    const phase = t * 4;
    const phaseIndex = Math.floor(phase) % 4;
    const nextIndex = (phaseIndex + 1) % 4;
    const blend = phase - Math.floor(phase);

    // Interpolate sky color
    this.tempColor.copy(SKY_COLORS[phaseIndex]!).lerp(SKY_COLORS[nextIndex]!, blend);
    this.scene.background = this.tempColor.clone();
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(this.tempColor);
    }

    // Interpolate light color
    this.dirLight.color.copy(LIGHT_COLORS[phaseIndex]!).lerp(LIGHT_COLORS[nextIndex]!, blend);
    this.dirLight.intensity = lerp(
      DIR_INTENSITIES[phaseIndex]!,
      DIR_INTENSITIES[nextIndex]!,
      blend,
    );

    // Interpolate ambient
    this.ambientLight.intensity = lerp(
      AMBIENT_INTENSITIES[phaseIndex]!,
      AMBIENT_INTENSITIES[nextIndex]!,
      blend,
    );
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
