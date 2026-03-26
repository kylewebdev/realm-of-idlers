/**
 * DOM-based floating damage/combat text.
 * Spawns text elements that float upward and fade out.
 */
export class DamageNumbers {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /** Spawn a floating damage number at a viewport-relative position. */
  spawn(text: string, screenX: number, screenY: number, color: string): void {
    const el = document.createElement("div");
    el.className = "damage-number";
    el.textContent = text;
    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    el.style.color = color;
    this.container.appendChild(el);

    // Remove after animation completes
    el.addEventListener("animationend", () => {
      el.remove();
    });
  }

  /** Spawn damage text at the center of the viewport (simplified positioning). */
  spawnAtCenter(text: string, color: string, offsetX = 0): void {
    const x = window.innerWidth / 2 + offsetX + (Math.random() - 0.5) * 40;
    const y = window.innerHeight / 2 - 20;
    this.spawn(text, x, y, color);
  }

  dispose(): void {
    const numbers = this.container.querySelectorAll(".damage-number");
    numbers.forEach((el) => el.remove());
  }
}
