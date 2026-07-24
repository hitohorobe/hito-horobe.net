import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import ogs from "open-graph-scraper";

export type LinkPreview = {
  url: string;
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
};

// Astroのビルドパイプライン中では import.meta.url ベースの相対パス解決が
// (Viteによるバンドル/コピーの影響で) 想定通りにならないため、
// npm scriptsから実行される前提でprocess.cwd()(プロジェクトルート)を使う。
const CACHE_DIR = path.join(process.cwd(), ".cache", "link-preview");
const TIMEOUT_SECONDS = 8;
const RETRY_DELAY_MS = 1500;

const cachePathFor = (url: string) => {
  const hash = createHash("sha256").update(url).digest("hex");
  return path.join(CACHE_DIR, `${hash}.json`);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Astroのビルドは複数ページをある程度並行してレンダリングするため、
// スロットリング無しではAmazon等への同時アクセスが集中し、ボット判定による
// レート制限/一時ブロックを招きやすい。ビルド全体を通してOGP取得の同時実行数を
// 制限するための簡易セマフォ。
const MAX_CONCURRENT_FETCHES = 3;
let activeFetches = 0;
const waiters: (() => void)[] = [];

function acquireSlot(): Promise<void> {
  return new Promise((resolve) => {
    const tryAcquire = () => {
      if (activeFetches < MAX_CONCURRENT_FETCHES) {
        activeFetches++;
        resolve();
      } else {
        waiters.push(tryAcquire);
      }
    };
    tryAcquire();
  });
}

function releaseSlot() {
  activeFetches--;
  const next = waiters.shift();
  if (next) next();
}

// 外部サイトが返すOGP情報は信頼できないため、画像URLとして使う前に
// 妥当な絶対URLかどうかを検証する(壊れたページが返す不正な値をそのまま
// <img src>に流し込まない)。
const isValidImageUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

// AmazonなどはUser-Agentによって返すHTMLを変える(ボット判定)。
// 通常のUAだとog:imageタグ自体が無いページが返り、open-graph-scraperの
// フォールバック(ページ内のimgタグを片っ端から拾う)が働いて無関係な
// ナビゲーション画像等を誤検出してしまう。SNSクローラー向けUAを送ると
// 実際の商品画像を含む正規のog:imageタグが返るサイトが多いため、まず
// これで試し、失敗した場合のみ通常UAで再試行する。
// onlyGetOpenGraphInfo: true でフォールバックscrapingそのものを禁止し、
// 常に正規タグの値だけを使うようにする(誤画像を拾うリスクを構造的に防ぐ)。
const BOT_USER_AGENT = "Twitterbot/1.0";

async function tryFetchOnce(url: string) {
  for (const headers of [{ "user-agent": BOT_USER_AGENT }, undefined]) {
    try {
      const { error, result } = await ogs({
        url,
        timeout: TIMEOUT_SECONDS,
        onlyGetOpenGraphInfo: true,
        ...(headers ? { fetchOptions: { headers } } : {}),
      });
      if (!error && (result.ogTitle || result.twitterTitle)) {
        return result;
      }
    } catch {
      // 次の候補(通常UA)で再試行する
    }
  }
  return null;
}

// レート制限等の一時的な失敗は短時間で解消することが多いため、
// 両UAとも失敗した場合は間隔を空けてもう一度だけ試す。
async function fetchOgResult(url: string) {
  const first = await tryFetchOnce(url);
  if (first) return first;
  await sleep(RETRY_DELAY_MS);
  return tryFetchOnce(url);
}

// URLのOGP情報を取得する。取得できない/失敗した場合はnullを返す(呼び出し側で
// プレーンリンクにフォールバックさせ、ビルド全体を失敗させない)。
// ビルドのたびに同じURLへ再アクセスしないよう、成功結果は.cache/link-preview/に保存する
// (一時的な失敗を将来のビルドに引きずらないよう、失敗時はキャッシュに書き込まない)。
export const getLinkPreview = async (url: string): Promise<LinkPreview | null> => {
  const cachePath = cachePathFor(url);

  if (existsSync(cachePath)) {
    try {
      const cached = JSON.parse(await readFile(cachePath, "utf-8"));
      return cached;
    } catch {
      // 壊れたキャッシュは無視して再取得する
    }
  }

  await acquireSlot();
  let result;
  try {
    result = await fetchOgResult(url);
  } finally {
    releaseSlot();
  }

  if (!result) {
    return null;
  }

  const preview: LinkPreview = {
    url,
    title: result.ogTitle ?? result.twitterTitle ?? url,
    description: result.ogDescription ?? result.twitterDescription,
    image: isValidImageUrl(result.ogImage?.[0]?.url) ? result.ogImage[0].url : undefined,
    siteName: result.ogSiteName ?? new URL(url).hostname,
  };

  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(cachePath, JSON.stringify(preview));
  } catch {
    // キャッシュ書き込み失敗はビルドを止めるほどの問題ではないので無視する
  }

  return preview;
};
