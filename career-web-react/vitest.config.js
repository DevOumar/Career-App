import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.js", "server/stripeService.js"],
      exclude: ["src/lib/__tests__/**", "server/__tests__/**", "src/lib/liveInterview.js", "src/lib/inMemoryDb.js"]
    }
  }
});
