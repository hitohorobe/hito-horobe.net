import rss from '@astrojs/rss';
import { getArticles } from '../libs/microcms';

export async function GET(context) {
    // ブログ記事を取得
    const articleApiResponse = await getArticles();
    const articles = articleApiResponse.contents;
    return rss({
        // 出力されるXMLの`<title>`フィールド
        title: 'hito-horobe.net',
        // 出力されるXMLの`<description>`フィールド
        description: 'hito-horobe.net RSS Feed',
        // エンドポイントのコンテキストからプロジェクトの"site"を取得
        // https://docs.astro.build/ja/reference/api-reference/#contextsite
        site: context.site,
        // 出力されるXMLの<item>の
        // コンテンツコレクションやglobインポートを利用した例については「`items`の生成」セクションをご覧ください
        items: articles.map((article) => ({
            // <title>フィールド
            title: article.title,
            // <description>フィールド
            description: article.lead_text,
            // <link>フィールド
            link: `${context.site}articles/${article.slug}`,
            // <pubDate>フィールド
            pubDate: article.publishedAt,
            // (任意) <category>フィールド
            category: article.category,
            // (任意) <guid>フィールド
        })),
        // (任意) カスタムXMLを挿入
        customData: `<language>ja-JP</language>`,
  });
}