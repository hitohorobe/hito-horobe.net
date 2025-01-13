import { defineConfig } from 'astro/config';
import pagefind from "astro-pagefind";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: "https://hito-horobe.net",
  build: {
    format: "file"
  },
  integrations: [pagefind(), tailwind()],
  image: {
    domains: ["images.microcms-assets.io"]
  }
});