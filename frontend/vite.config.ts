import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";
import { APP_NAME, APP_DESCRIPTION } from "./lib/app-config";

const root = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  server: {
    port: 3000,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": root,
      "~": `${root}src/`,
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
    }),
    viteReact(),
    nitro(),
    VitePWA({
      registerType: "autoUpdate",
      // No index.html in the TanStack Start/Nitro setup for auto-injection to
      // rewrite — the SW is registered manually in src/routes/__root.tsx.
      injectRegister: false,
      // The plugin defaults to vite's build.outDir ("dist"), but Nitro serves
      // .output/public — without this, sw.js is generated where nothing serves it.
      outDir: ".output/public",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: APP_DESCRIPTION,
        theme_color: "#4f46e5",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
});
