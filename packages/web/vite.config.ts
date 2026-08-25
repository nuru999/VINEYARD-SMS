import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  const plugins: any[] = [react(), tailwind()];

  if (isDev) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: honoDevPlugin } = require("./vite/plugins/hono-dev-plugin");
      plugins.unshift(honoDevPlugin());
    } catch {
      // Development can still start without the Hono helper plugin.
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
