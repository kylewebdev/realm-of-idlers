import { uiStore } from "../ui/store.js";
import type { TabId } from "../ui/store.js";

/**
 * Setup keyboard hotkeys for tab switching and modal toggles.
 *
 * Returns a cleanup function to remove event listeners.
 */
export function setupKeyboard(onTogglePanel: (panel: string) => void): () => void {
  const tabKeys: Record<string, TabId> = {
    i: "inventory",
    s: "skills",
    e: "equipment",
  };

  const onKeyDown = (event: KeyboardEvent) => {
    // Ignore if typing in an input field
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key in tabKeys) {
      uiStore.getState().setTab(tabKeys[key]!);
      return;
    }

    if (key === "q") {
      onTogglePanel("quests");
    }
  };

  window.addEventListener("keydown", onKeyDown);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
  };
}
