/**
 * Setup keyboard hotkeys for panel toggles.
 *
 * Returns a cleanup function to remove event listeners.
 */
export function setupKeyboard(onTogglePanel: (panel: string) => void): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    // Ignore if typing in an input field
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case "i":
        onTogglePanel("inventory");
        break;
      case "s":
        onTogglePanel("skills");
        break;
      case "q":
        onTogglePanel("quests");
        break;
    }
  };

  window.addEventListener("keydown", onKeyDown);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
  };
}
