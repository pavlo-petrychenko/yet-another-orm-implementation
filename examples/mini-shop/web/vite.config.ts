import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The Fastify API from the mini-shop example. Override with VITE_API_TARGET
// when the API runs somewhere other than http://localhost:3000.
const apiTarget = process.env.VITE_API_TARGET ?? "http://localhost:3000";

// All browser requests go to /api/* and are proxied to the API with the /api
// prefix stripped, so the frontend needs no CORS changes on the server.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
