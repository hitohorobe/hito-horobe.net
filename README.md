# hito-horobe.net
Astro製のブログです
https://hito-horobe.net

記事コンテンツは [hito-horobe-articles](https://github.com/hitohorobe/hito-horobe-articles) リポジトリで管理しています。`npm run dev` / `npm run build` の前に自動的にcloneされます(`scripts/sync-content.mjs`、`.env.sample` 参照)。

## 記事執筆中のプレビュー

`hito-horobe-articles` をこのリポジトリと兄弟ディレクトリとしてcloneし、`.env` に以下を設定すると、gitクローンの代わりにローカル作業コピーへシンボリックリンクが張られ、コミット前の編集内容もそのまま `npm run dev` でホットリロード確認できます。

```
CONTENT_LOCAL_PATH=../hito-horobe-articles
```

## URL埋め込み(リンクカード)

記事本文中の単独行のURLは、ビルド時にOGP情報を取得してリンクカード表示になります(`src/plugins/remark-link-card.mjs`, `src/components/LinkCard.astro`)。取得結果は `.cache/link-preview/` にキャッシュされ、2回目以降のビルドは高速化されます。

microCMSからの移行ツールは `scripts/migrate-from-microcms/` にあります(`npm run migrate-from-microcms -- --target <path>`)。
