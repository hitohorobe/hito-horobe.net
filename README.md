# hito-horobe.net
Astro製のブログです
https://hito-horobe.net

記事コンテンツは [hito-horobe-articles](https://github.com/hitohorobe/hito-horobe-articles) リポジトリで管理しています。`npm run dev` / `npm run build` の前に自動的にcloneされます(`scripts/sync-content.mjs`、`.env.sample` 参照)。

microCMSからの移行ツールは `scripts/migrate-from-microcms/` にあります(`npm run migrate-from-microcms -- --target <path>`)。
