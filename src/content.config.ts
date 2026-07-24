import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const articles = defineCollection({
  loader: glob({ pattern: "articles/*/index.mdx", base: "./content" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      slug: z.string(),
      leadText: z.string().optional(),
      category: z.string(),
      tags: z.array(z.string()).default([]),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      thumbnail: z.object({
        src: image(),
        alt: z.string().optional(),
      }),
    }),
});

export const collections = { articles };
