import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  const plugins: any[] = [react(), tailwind()];

  if (isDev) {
    // Dynamically import dev-only plugins to avoid issues in production build
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: honoDevPlugin } = require("./vite/plugins/hono-dev-plugin");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: runableAnalyticsPlugin } = require("./vite/plugins/runable-analytics-plugin");
      plugins.unshift(honoDevPlugin());
      plugins.push(runableAnalyticsPlugin());
    } catch {
      // Dev plugins not available, skip
    }
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src/web"),
      },
    },
    server: {
      port: 4200,
      allowedHosts: true,
      hmr: { overlay: false },
    },
  };
});
