import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  publicDir: "public",
  server: {
    port: 5173,
    open: true,
  },
});
