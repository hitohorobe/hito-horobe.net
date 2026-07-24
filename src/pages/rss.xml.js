import rss from '@astrojs/rss';
import { getArticles } from '../libs/content';

export async function GET(context) {
    // ブログ記事を取得
    const articles = await getArticles();
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
            description: article.leadText,
            // <link>フィールド
            link: `${context.site}articles/${article.slug}`,
            // <pubDate>フィールド
            pubDate: article.publishedAt,
            // (任意) <category>フィールド (@astrojs/rssはcategories(配列)を受け取る)
            categories: [article.category, ...article.tags],
            // (任意) <guid>フィールド
        })),
        // (任意) カスタムXMLを挿入
        customData: `<language>ja-JP</language>`,
  });
}