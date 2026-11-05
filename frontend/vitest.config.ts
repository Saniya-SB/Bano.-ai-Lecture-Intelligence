import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname),
  test: {
    root: path.resolve(__dirname),
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
