import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import path from "path";

const root = path.resolve(__dirname, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, "");
  Object.assign(process.env, env);

  const isDev = mode === "development";

  const plugins: any[] = [react(), tailwind()];

  if (isDev) {
    // Only load dev plugins in dev mode
    const { default: honoDevPlugin } = require("./vite/plugins/hono-dev-plugin");
    const { default: runableAnalyticsPlugin } = require("./vite/plugins/runable-analytics-plugin");
    plugins.unshift(honoDevPlugin());
    plugins.push(runableAnalyticsPlugin());
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
