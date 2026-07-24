import { writeFile } from "node:fs/promises";

const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function extensionFromUrl(url) {
  try {
    const { pathname } = new URL(url);
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    return match ? `.${match[1].toLowerCase()}` : ".jpg";
  } catch {
    return ".jpg";
  }
}

// remoteUrlの画像をdestPathへダウンロードする。失敗時は数回リトライする。
export async function downloadImage(remoteUrl, destPath) {
  let lastError;
  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    try {
      const res = await fetch(remoteUrl);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      await writeFile(destPath, buffer);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_COUNT) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }
  throw new Error(
    `画像のダウンロードに失敗しました: ${remoteUrl} -> ${destPath} (${lastError?.message})`
  );
}

// 同時実行数を制限しつつ配列を処理する
export async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function runNext() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, runNext);
  await Promise.all(workers);
  return results;
}
