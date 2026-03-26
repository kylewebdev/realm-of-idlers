import type { GameState } from "@realm-of-idlers/shared";
import { TICK_DURATION_MS } from "@realm-of-idlers/shared";
import { tick } from "./tick.js";
import { applyTickResult } from "./apply.js";
import { simulateOffline } from "./offline.js";
import type { TickContext, TickResult, OfflineSummary } from "./types.js";
import type { GameNotification } from "@realm-of-idlers/shared";

export interface GameLoopCallbacks {
  onTick: (result: TickResult, notifications: GameNotification[]) => void;
  onCatchUp?: (summary: OfflineSummary) => void;
}

/**
 * Game loop driven by requestAnimationFrame with a fixed-timestep
 * tick accumulator at 600ms intervals.
 *
 * Handles visibility changes: when the tab regains focus, runs
 * catch-up ticks via simulateOffline().
 */
export class GameLoop {
  private accumulator = 0;
  private lastFrameTime = 0;
  private running = false;
  private rafId = 0;
  private hiddenAt = 0;

  constructor(
    private getState: () => GameState,
    private setState: (state: GameState) => void,
    private ctx: TickContext,
    private callbacks: GameLoopCallbacks,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.frame);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.rafId);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  private frame = (timestamp: number): void => {
    if (!this.running) return;

    const delta = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    this.accumulator += delta;

    while (this.accumulator >= TICK_DURATION_MS) {
      this.accumulator -= TICK_DURATION_MS;
      const state = this.getState();
      const result = tick(state, this.ctx);
      const { newState, notifications } = applyTickResult(state, result);
      this.setState(newState);
      this.callbacks.onTick(result, notifications);
    }

    this.rafId = requestAnimationFrame(this.frame);
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.hiddenAt = Date.now();
    } else if (this.hiddenAt > 0) {
      // Tab regained focus — run catch-up ticks
      const elapsed = Date.now() - this.hiddenAt;
      const missedTicks = Math.floor(elapsed / TICK_DURATION_MS);
      this.hiddenAt = 0;

      if (missedTicks > 0) {
        const state = this.getState();
        const { newState, summary } = simulateOffline(state, missedTicks, this.ctx);
        this.setState(newState);
        this.callbacks.onCatchUp?.(summary);
      }

      // Reset accumulator so we don't double-count
      this.lastFrameTime = performance.now();
      this.accumulator = 0;
    }
  };
}
