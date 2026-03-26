import "./style.css";
import { init } from "./bridge.js";

init().catch((err) => {
  console.error("Failed to initialize game:", err);
});
