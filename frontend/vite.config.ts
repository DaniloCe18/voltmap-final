import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En local, /api se proxea al backend: el navegador solo ve un origen
// (igual que en Render con el rewrite /api/* → backend).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
