#!/usr/bin/env node
// 記事コンテンツリポジトリ(hito-horobe-articles)を content/ に同期する。
// dev/build の前に自動実行される(package.json の predev/prebuild)。
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

try {
  process.loadEnvFile();
} catch {
  // .env が無い場合は環境変数(CI等)のみで動作する
}

const REPO_URL = process.env.CONTENT_REPO_URL;
const BRANCH = process.env.CONTENT_REPO_BRANCH || "main";
const TOKEN = process.env.CONTENT_REPO_TOKEN;
const TARGET_DIR = fileURLToPath(new URL("../content", import.meta.url));

if (!REPO_URL) {
  console.error(
    "[sync-content] CONTENT_REPO_URL が設定されていません。.env.sample を参考に .env を用意してください。"
  );
  process.exit(1);
}

function authenticatedUrl(url, token) {
  if (!token || !url.startsWith("https://")) return url;
  return url.replace("https://", `https://x-access-token:${token}@`);
}

function run(args) {
  execFileSync("git", args, { stdio: "inherit" });
}

if (existsSync(TARGET_DIR)) {
  console.log(`[sync-content] updating ${TARGET_DIR} (branch: ${BRANCH})`);
  run(["-C", TARGET_DIR, "fetch", "--depth", "1", "origin", BRANCH]);
  run(["-C", TARGET_DIR, "reset", "--hard", "FETCH_HEAD"]);
} else {
  console.log(`[sync-content] cloning ${REPO_URL} (branch: ${BRANCH})`);
  run([
    "clone",
    "--depth",
    "1",
    "--branch",
    BRANCH,
    authenticatedUrl(REPO_URL, TOKEN),
    TARGET_DIR,
  ]);
}

console.log("[sync-content] done");
