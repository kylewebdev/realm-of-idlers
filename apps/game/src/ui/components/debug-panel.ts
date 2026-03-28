import { gameStore, createNewGameState, deleteSave, saveGame } from "@realm-of-idlers/state";

export function createDebugPanel(container: HTMLElement): () => void {
  container.innerHTML = `
    <div class="debug-panel">
      <h3>Debug</h3>
      <div class="debug-info"></div>
      <div class="debug-actions">
        <div class="debug-row">
          <label>Teleport to:</label>
          <input type="number" id="debug-col" placeholder="col" style="width:50px" />
          <input type="number" id="debug-row" placeholder="row" style="width:50px" />
          <button id="debug-teleport">Go</button>
        </div>
        <div class="debug-row">
          <button id="debug-teleport-town">Teleport to Town</button>
        </div>
        <div class="debug-row">
          <button id="debug-reset">Reset Character (Delete Save)</button>
        </div>
      </div>
    </div>
  `;

  const infoEl = container.querySelector(".debug-info")!;
  const colInput = container.querySelector("#debug-col") as HTMLInputElement;
  const rowInput = container.querySelector("#debug-row") as HTMLInputElement;

  container.querySelector("#debug-teleport")!.addEventListener("click", () => {
    const col = parseInt(colInput.value, 10);
    const row = parseInt(rowInput.value, 10);
    if (Number.isFinite(col) && Number.isFinite(row)) {
      teleport(col, row);
    }
  });

  container.querySelector("#debug-teleport-town")!.addEventListener("click", () => {
    teleport(115, 115);
  });

  container.querySelector("#debug-reset")!.addEventListener("click", async () => {
    if (!confirm("Delete save and reset character? This cannot be undone.")) return;
    await deleteSave();
    const fresh = createNewGameState("Player");
    gameStore.getState().loadState(fresh);
    await saveGame(gameStore.getState());
    window.location.reload();
  });

  function teleport(col: number, row: number) {
    gameStore.getState().updatePlayer({ position: { col, row } });
    gameStore.getState().setAction({ type: "idle" });
    void saveGame(gameStore.getState());
  }

  function update() {
    const state = gameStore.getState();
    const pos = state.player.position;
    const action = state.actionQueue[0];
    infoEl.innerHTML = `
      <div><strong>Position:</strong> col=${pos.col}, row=${pos.row}</div>
      <div><strong>Action:</strong> ${action?.type ?? "none"}</div>
      <div><strong>Gold:</strong> ${state.player.gold}</div>
      <div><strong>Save version:</strong> ${state.version}</div>
    `;
  }

  update();
  const unsub = gameStore.subscribe(update);
  return unsub;
}
