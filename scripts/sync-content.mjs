#!/usr/bin/env node
// 記事コンテンツリポジトリ(hito-horobe-articles)を content/ に同期する。
// dev/build の前に自動実行される(package.json の predev/prebuild)。
import { existsSync, lstatSync, readlinkSync, rmSync, symlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

try {
  process.loadEnvFile();
} catch {
  // .env が無い場合は環境変数(CI等)のみで動作する
}

const REPO_URL = process.env.CONTENT_REPO_URL;
const BRANCH = process.env.CONTENT_REPO_BRANCH || "main";
const TOKEN = process.env.CONTENT_REPO_TOKEN;
const LOCAL_PATH = process.env.CONTENT_LOCAL_PATH;
const TARGET_DIR = fileURLToPath(new URL("../content", import.meta.url));

function authenticatedUrl(url, token) {
  if (!token || !url.startsWith("https://")) return url;
  return url.replace("https://", `https://x-access-token:${token}@`);
}

function run(args) {
  execFileSync("git", args, { stdio: "inherit" });
}

// 執筆中プレビュー用: CONTENT_LOCAL_PATHが設定されていれば、gitを使わず
// ローカルの記事リポジトリ作業コピーへシンボリックリンクを張る。
// コミット前の編集内容もそのままAstro devサーバーで確認できる。
function syncFromLocalPath() {
  const resolvedLocal = path.resolve(LOCAL_PATH);
  if (!existsSync(resolvedLocal)) {
    console.error(`[sync-content] CONTENT_LOCAL_PATH が見つかりません: ${resolvedLocal}`);
    process.exit(1);
  }

  if (existsSync(TARGET_DIR)) {
    const stat = lstatSync(TARGET_DIR);
    if (stat.isSymbolicLink() && readlinkSync(TARGET_DIR) === resolvedLocal) {
      console.log(`[sync-content] already symlinked to ${resolvedLocal}`);
      return;
    }
    rmSync(TARGET_DIR, { recursive: true, force: true });
  }

  symlinkSync(resolvedLocal, TARGET_DIR, "dir");
  console.log(`[sync-content] symlinked content -> ${resolvedLocal} (CONTENT_LOCAL_PATH)`);
}

function syncFromGit() {
  if (!REPO_URL) {
    console.error(
      "[sync-content] CONTENT_REPO_URL または CONTENT_LOCAL_PATH が設定されていません。.env.sample を参考に .env を用意してください。"
    );
    process.exit(1);
  }

  // CONTENT_LOCAL_PATHから通常のgit同期に切り替えた場合、残ったシンボリックリンクを消す
  if (existsSync(TARGET_DIR) && lstatSync(TARGET_DIR).isSymbolicLink()) {
    rmSync(TARGET_DIR, { force: true });
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
}

if (LOCAL_PATH) {
  syncFromLocalPath();
} else {
  syncFromGit();
}

console.log("[sync-content] done");
