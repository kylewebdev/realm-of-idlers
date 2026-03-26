import { uiStore } from "../store.js";

export function createEventLog(container: HTMLElement): () => void {
  container.innerHTML = `<div class="log-entries"></div>`;
  const entriesEl = container.querySelector(".log-entries")!;
  let lastLength = 0;

  function update() {
    const { eventLog } = uiStore.getState();
    if (eventLog.length === lastLength) return;

    // Only append new entries
    for (let i = lastLength; i < eventLog.length; i++) {
      const entry = document.createElement("div");
      entry.className = "log-entry";
      entry.textContent = eventLog[i]!;
      entriesEl.appendChild(entry);
    }
    lastLength = eventLog.length;

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  update();
  return uiStore.subscribe(update);
}
