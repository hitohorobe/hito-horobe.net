import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import pagefind from "astro-pagefind";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import remarkFigureCaption from "./src/plugins/remark-figure-caption.mjs";
import remarkLinkCard from "./src/plugins/remark-link-card.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://hito-horobe.net",
  build: {
    format: "file",
    assets: "files",
  },
  integrations: [pagefind(), mdx()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkFigureCaption, remarkLinkCard],
    }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});