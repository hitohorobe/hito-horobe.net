#!/usr/bin/env node
// microCMSの全記事を取得し、hito-horobe-articles形式(MDX + frontmatter)に変換して
// 書き出す移行ツール。
//
// 使い方:
//   npm run migrate-from-microcms -- --target /path/to/hito-horobe-articles
//   npm run migrate-from-microcms -- --target /path/to/hito-horobe-articles --dry-run
//   npm run migrate-from-microcms -- --target /path/to/hito-horobe-articles --only some-slug
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "microcms-js-sdk";
import { stringify as stringifyYaml } from "yaml";
import { createHtmlToMdxConverter } from "./html-to-mdx.mjs";
import { downloadImage, extensionFromUrl, runWithConcurrency } from "./download-image.mjs";

try {
  process.loadEnvFile();
} catch {
  // .env が無い場合は環境変数のみで動作する
}

function parseArgs(argv) {
  const args = { target: undefined, dryRun: false, only: undefined, concurrency: 4 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--target") args.target = argv[++i];
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--only") args.only = argv[++i];
    else if (arg === "--concurrency") args.concurrency = Number(argv[++i]) || 4;
    else if (arg === "--help" || arg === "-h") args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`microCMS -> hito-horobe-articles 移行ツール

必須:
  --target <path>       書き出し先(hito-horobe-articlesのローカルクローンパス)

オプション:
  --dry-run             ファイル書き込み・画像ダウンロードをせず変換結果のみ表示
  --only <slug>          指定したslugの記事のみ処理する
  --concurrency <n>       画像ダウンロードの同時実行数(既定: 4)
`);
}

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.target) {
  printHelp();
  process.exit(args.help ? 0 : 1);
}

if (!process.env.MICROCMS_SERVICE_DOMAIN || !process.env.MICROCMS_API_KEY) {
  console.error(
    "MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が設定されていません(.env を確認してください)"
  );
  process.exit(1);
}

const client = createClient({
  serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN,
  apiKey: process.env.MICROCMS_API_KEY,
});

const warnings = [];
const summary = { total: 0, migrated: 0, skipped: 0, failed: 0 };

function padIndex(n) {
  return String(n).padStart(3, "0");
}

async function migrateArticle(article) {
  const slug = article.slug;
  const articleDir = path.join(args.target, "articles", slug);
  const imagesDir = path.join(articleDir, "images");
  const indexPath = path.join(articleDir, "index.mdx");

  if (!args.dryRun && existsSync(indexPath)) {
    console.log(`[skip] ${slug} (既に存在します)`);
    summary.skipped++;
    return;
  }

  if (!article.thumbnail?.url) {
    warnings.push(`${slug}: thumbnailが無いためスキップしました`);
    summary.failed++;
    return;
  }

  const category = article.category?.name;
  if (!category) {
    warnings.push(`${slug}: categoryが無いためスキップしました`);
    summary.failed++;
    return;
  }

  // 本文中の画像を集めつつMDX本文に変換する
  const pendingImages = [];
  let imageIndex = 0;
  const convert = createHtmlToMdxConverter({
    onImage: (remoteUrl) => {
      imageIndex++;
      const filename = `fig-${padIndex(imageIndex)}${extensionFromUrl(remoteUrl)}`;
      pendingImages.push({ remoteUrl, filename });
      return `./images/${filename}`;
    },
  });
  const body = convert(article.main_text);

  const thumbnailFilename = `thumbnail${extensionFromUrl(article.thumbnail.url)}`;

  const frontmatter = {
    title: article.title,
    slug,
    leadText: article.lead_text || undefined,
    category,
    tags: (article.tags ?? []).map((tag) => tag.name),
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    thumbnail: {
      src: `./images/${thumbnailFilename}`,
      alt: article.title,
    },
  };

  const fileContent = `---\n${stringifyYaml(frontmatter)}---\n\n${body}\n`;

  if (args.dryRun) {
    console.log(`[dry-run] ${slug}: 画像${pendingImages.length + 1}件, 本文${body.length}文字`);
    summary.migrated++;
    return;
  }

  await mkdir(imagesDir, { recursive: true });

  const downloads = [
    { remoteUrl: article.thumbnail.url, filename: thumbnailFilename },
    ...pendingImages,
  ];
  await runWithConcurrency(downloads, args.concurrency, async ({ remoteUrl, filename }) => {
    try {
      await downloadImage(remoteUrl, path.join(imagesDir, filename));
    } catch (error) {
      warnings.push(`${slug}: ${error.message}`);
    }
  });

  await writeFile(indexPath, fileContent, "utf-8");
  console.log(`[ok] ${slug} (画像${downloads.length}件)`);
  summary.migrated++;
}

async function main() {
  console.log(`[migrate] microCMSから記事を取得中...`);
  const articles = await client.getAllContents({ endpoint: "articles" });
  const targets = args.only ? articles.filter((a) => a.slug === args.only) : articles;

  if (args.only && targets.length === 0) {
    console.error(`slug "${args.only}" の記事が見つかりませんでした`);
    process.exit(1);
  }

  summary.total = targets.length;
  console.log(`[migrate] ${targets.length}件の記事を処理します${args.dryRun ? " (dry-run)" : ""}`);

  for (const article of targets) {
    try {
      await migrateArticle(article);
    } catch (error) {
      warnings.push(`${article.slug}: 予期しないエラー (${error.message})`);
      summary.failed++;
    }
  }

  console.log("\n=== 移行結果 ===");
  console.log(`対象: ${summary.total}件`);
  console.log(`成功: ${summary.migrated}件`);
  console.log(`スキップ(既存): ${summary.skipped}件`);
  console.log(`失敗: ${summary.failed}件`);
  if (warnings.length > 0) {
    console.log(`\n警告 (${warnings.length}件):`);
    warnings.forEach((w) => console.log(`  - ${w}`));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
