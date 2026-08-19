import { defineConfig } from "vite";

// Le frontend (React) vit dans frontend/, le backend (Express) dans backend/,
// tous deux à côté l'un de l'autre sous career-web-react/ — voir README.md.
// On garde ici un seul package.json/node_modules pour tout le projet et une
// sortie de build inchangée (career-web-react/dist) pour ne rien casser des
// scripts ou déploiements existants qui s'attendaient à ce chemin.
export default defineConfig({
  root: "frontend",
  build: {
    outDir: "../dist",
    emptyOutDir: true
  }
});
