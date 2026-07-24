import { getCollection, getEntry, render } from "astro:content";
import type { CollectionEntry } from "astro:content";

export type Article = CollectionEntry<"articles">["data"] & {
  id: string;
};

const toArticle = (entry: CollectionEntry<"articles">): Article => ({
  id: entry.id,
  ...entry.data,
});

// 記事一覧を公開日の新しい順に返す
export const getArticles = async (): Promise<Article[]> => {
  const entries = await getCollection("articles");
  return entries
    .map(toArticle)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
};

// slugから記事本文(レンダリング済みComponent込み)を取得する
export const getArticleBySlug = async (slug: string) => {
  const entry = await getEntry("articles", slug);
  if (!entry) return undefined;
  const { Content } = await render(entry);
  return { article: toArticle(entry), Content };
};

// 記事一覧から重複のないカテゴリ一覧を導出する
export const getCategories = async (): Promise<string[]> => {
  const articles = await getArticles();
  return [...new Set(articles.map((article) => article.category))];
};

// 記事一覧から重複のないタグ一覧を導出する
export const getTags = async (): Promise<string[]> => {
  const articles = await getArticles();
  return [...new Set(articles.flatMap((article) => article.tags))];
};
