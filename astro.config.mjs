import { defineConfig } from 'astro/config';
import pagefind from "astro-pagefind";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://hito-horobe.net",
  build: {
    format: "file",
    assets: "files",
  },
  integrations: [pagefind()],
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    domains: ["images.microcms-assets.io"]
  }
});