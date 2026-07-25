#!/usr/bin/env node
// 記事本文中のAmazon商品URL(短縮URLのamzn.to/a.coは対象外)に
// アフィリエイトタグ(tag=hito-horobe-22)を付与する。
// microCMS移行時にアフィリエイトタグが失われていたための復旧用ツール。
//
// 使い方:
//   node scripts/fix-amazon-affiliate-links.mjs --target /path/to/hito-horobe-articles
//   node scripts/fix-amazon-affiliate-links.mjs --target /path/to/hito-horobe-articles --dry-run
import { readFile, writeFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import path from "node:path";

const AFFILIATE_TAG = "hito-horobe-22";
// [alt](URL) / [alt](URL "title") のURL部分にマッチする(非貪欲、閉じ括弧・空白の手前まで)
const LINK_DEST_RE = /\]\((https?:\/\/[^\s)]+)((?:\s+"[^"]*")?)\)/g;

function parseArgs(argv) {
  const args = { target: undefined, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--target") args.target = argv[++i];
    else if (argv[i] === "--dry-run") args.dryRun = true;
  }
  return args;
}

function isTargetAmazonUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    // amzn.to, a.co 等の短縮URLは対象外。amazon.co.jp (www有無問わず) のみ対象。
    return u.hostname === "amazon.co.jp" || u.hostname === "www.amazon.co.jp";
  } catch {
    return false;
  }
}

function addAffiliateTag(rawUrl) {
  const u = new URL(rawUrl);
  if (u.searchParams.has("tag")) {
    return { url: rawUrl, changed: false };
  }
  u.searchParams.set("tag", AFFILIATE_TAG);
  return { url: u.toString(), changed: true };
}

function findMdxFiles(articlesDir) {
  const files = [];
  for (const slug of readdirSync(articlesDir, { withFileTypes: true })) {
    if (!slug.isDirectory()) continue;
    const mdxPath = path.join(articlesDir, slug.name, "index.mdx");
    files.push(mdxPath);
  }
  return files;
}

async function processFile(filePath, { dryRun }) {
  const original = await readFile(filePath, "utf-8").catch(() => null);
  if (original === null) return null;

  let updatedCount = 0;
  let skippedTaggedCount = 0;

  const updated = original.replace(LINK_DEST_RE, (match, url, titlePart) => {
    if (!isTargetAmazonUrl(url)) return match;
    const { url: newUrl, changed } = addAffiliateTag(url);
    if (!changed) {
      skippedTaggedCount++;
      return match;
    }
    updatedCount++;
    return `](${newUrl}${titlePart})`;
  });

  if (updatedCount > 0 && !dryRun) {
    await writeFile(filePath, updated, "utf-8");
  }

  return { updatedCount, skippedTaggedCount };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.target) {
    console.error("使い方: node scripts/fix-amazon-affiliate-links.mjs --target <hito-horobe-articlesのパス> [--dry-run]");
    process.exit(1);
  }

  const articlesDir = path.join(args.target, "articles");
  const files = findMdxFiles(articlesDir);

  let totalUpdated = 0;
  let totalSkippedTagged = 0;
  let filesChanged = 0;

  for (const file of files) {
    const result = await processFile(file, args);
    if (!result) continue;
    if (result.updatedCount > 0) {
      filesChanged++;
      console.log(`[${args.dryRun ? "dry-run" : "ok"}] ${path.basename(path.dirname(file))}: ${result.updatedCount}件タグ付与`);
    }
    totalUpdated += result.updatedCount;
    totalSkippedTagged += result.skippedTaggedCount;
  }

  console.log("\n=== 結果 ===");
  console.log(`対象ファイル: ${files.length}件`);
  console.log(`変更ファイル: ${filesChanged}件`);
  console.log(`タグ付与: ${totalUpdated}件`);
  console.log(`既にタグ付き(スキップ): ${totalSkippedTagged}件`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
