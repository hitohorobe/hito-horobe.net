import { createClient } from "microcms-js-sdk";
import type { MicroCMSQueries } from "microcms-js-sdk";

// 環境変数
if (
  import.meta.env["MICROCMS_SERVICE_DOMAIN"] === undefined ||
  import.meta.env["MICROCMS_API_KEY"] === undefined
) {
  throw new Error(
    "Please set environment variables: MICROCMS_SERVICE_DOMAIN and MICROCMS_API_KEY"
  );
}

export const client = createClient({
  serviceDomain: import.meta.env["MICROCMS_SERVICE_DOMAIN"],
  apiKey: import.meta.env["MICROCMS_API_KEY"],
});

// type definition
export type Category = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    publishedAt: Date;
    revisedAt: Date;
    name: string;
}

export type CategoryResponse = {
    totalCount: number;
    offset: number;
    limit: number;
    contents: Category[];
    }

export type Tag = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    publishedAt: Date;
    revisedAt: Date;
    name: string;
}

export type TagResponse = {
    totalCount: number;
    offset: number;
    limit: number;
    contents: Tag[];
}

export type Thumbnail = {
    url: string;
    height: number;
    width: number;
}

export type Article = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date;
  revisedAt: Date;
  title: string;
  main_text: string;
  lead_text?: string;
  slug: string;
  thumbnail: Thumbnail;
  category: Category
  tags: Tag[]

}

export type ArticleResponse = {
  totalCount: number;
  offset: number;
  limit: number;
  contents: Article[];
}

// API endpoints
const endpointArticles = "articles";
const endpointCategories = "categories";
const endpointTags = "tags";

// fetch from CMS
export const getArticles = async (queries?: MicroCMSQueries) => {
  return await client.get<ArticleResponse>({
    endpoint: endpointArticles,
    queries,
  });
}

export const getArticleDetail = async (
  contentId: string,
  queries?: MicroCMSQueries
) => {
  return await client.getListDetail<Article>({
    endpoint: endpointArticles,
    contentId,
    queries,
  });
}

export const getCategories = async (queries?: MicroCMSQueries) => {
  return await client.get<CategoryResponse>({
    endpoint: endpointCategories,
    queries,
  });
}

export const getTags = async (queries?: MicroCMSQueries) => {
  return await client.get<TagResponse>({
    endpoint: endpointTags,
    queries,
  });
}