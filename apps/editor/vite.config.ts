import { defineConfig } from "vite-plus";
import path from "path";

export default defineConfig({
  server: {
    port: 5180,
    fs: {
      allow: [path.resolve(__dirname, "../..")],
    },
  },
  // Use the game's public dir so we can load map files and sprites
  publicDir: path.resolve(__dirname, "../game/public"),
});
