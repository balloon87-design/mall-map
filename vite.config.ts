import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: false,
  vite: {
    base: "/mall-map/",
  },
  tanstackStart: {
    server: { entry: "server" },
    prerender: {
      enabled: true,
      routes: ["/"],
    },
  },
});