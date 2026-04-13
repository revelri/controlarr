import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@controlarr/core": path.resolve(__dirname, "packages/core/src/index.ts"),
      "@controlarr/radarr": path.resolve(__dirname, "packages/radarr/src/index.ts"),
      "@controlarr/sonarr": path.resolve(__dirname, "packages/sonarr/src/index.ts"),
      "@controlarr/prowlarr": path.resolve(__dirname, "packages/prowlarr/src/index.ts"),
      "@controlarr/bazarr": path.resolve(__dirname, "packages/bazarr/src/index.ts"),
      "@controlarr/jellyseerr": path.resolve(__dirname, "packages/jellyseerr/src/index.ts"),
    },
  },
  test: {
    globals: true,
    testTimeout: 15_000,
    setupFiles: ["dotenv/config"],
  },
});
