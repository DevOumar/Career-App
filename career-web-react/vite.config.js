import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

// Version affichée dans le centre d'aide admin (source unique : package.json).
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// Le frontend (React) vit dans frontend/, le backend (Express) dans backend/,
// tous deux à côté l'un de l'autre sous career-web-react/ — voir README.md.
// On garde ici un seul package.json/node_modules pour tout le projet et une
// sortie de build inchangée (career-web-react/dist) pour ne rien casser des
// scripts ou déploiements existants qui s'attendaient à ce chemin.
export default defineConfig({
  root: "frontend",
  define: {
    __APP_VERSION__: JSON.stringify(version)
  },
  envDir: "..",
  server: {
    port: 5174,
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true
  }
});
