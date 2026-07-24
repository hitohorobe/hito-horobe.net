import TurndownService from "turndown";

// microCMSのリッチテキスト(HTML)をMDX本文に変換する。
// <figure>(img / a+img / img+figcaption / a+img+figcaption)は
// `![alt](パス "caption")` 形式のMarkdown画像記法に変換する。
// caption(figcaption)はtitle属性として埋め込み、サイト側のremarkプラグインで
// <figure><figcaption>に復元される。
//
// onImage(remoteUrl) は変換中に見つかった画像ごとに呼ばれ、
// 本文中に埋め込むべきローカル相対パス(例: "./images/fig-001.jpg")を返す想定。
export function createHtmlToMdxConverter({ onImage }) {
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  const escapeTitle = (text) => text.replace(/"/g, '\\"');

  // 長いURLをそのままリンクテキストにすると改行できず表示が崩れるため、
  // タイトルが無い埋め込みリンクはホスト名だけを表示テキストにする。
  const hostnameLabel = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  turndown.addRule("figure", {
    filter: "figure",
    replacement: (_content, node) => {
      const img = node.querySelector("img");
      if (!img) return "";

      const src = img.getAttribute("src");
      if (!src) return "";

      const alt = img.getAttribute("alt") ?? "";
      const a = node.querySelector("a");
      const figcaption = node.querySelector("figcaption");
      const caption = figcaption?.textContent?.trim();

      const localSrc = onImage(src);
      const titlePart = caption ? ` "${escapeTitle(caption)}"` : "";
      const imageMd = `![${alt}](${localSrc}${titlePart})`;

      if (a?.getAttribute("href")) {
        return `\n\n[${imageMd}](${a.getAttribute("href")})\n\n`;
      }
      return `\n\n${imageMd}\n\n`;
    },
  });

  // <figure>に包まれていない裸の<img>(念のためのフォールバック)。
  // <figure>配下のimgは祖先を辿って除外し、"figure"ルールとの二重処理を防ぐ。
  turndown.addRule("bareImage", {
    filter: (node) => node.nodeName === "IMG" && !node.closest("figure"),
    replacement: (_content, node) => {
      const src = node.getAttribute("src");
      if (!src) return "";
      const alt = node.getAttribute("alt") ?? "";
      const localSrc = onImage(src);
      return `![${alt}](${localSrc})`;
    },
  });

  // microCMSリッチテキストの「リンク埋め込み」(Iframely)。
  // 実体はJSで後からリッチカード化される空の<a>なので、素のMarkdownリンクにする。
  turndown.addRule("iframelyEmbed", {
    filter: (node) =>
      node.nodeName === "DIV" && node.classList?.contains("iframely-embed"),
    replacement: (_content, node) => {
      const href = node.querySelector("a[href]")?.getAttribute("href");
      if (!href) return "";
      return `\n\n[${hostnameLabel(href)}](${href})\n\n`;
    },
  });

  // microCMSリッチテキストの「ブログカード」埋め込み(hatenablog-parts.comのiframe)。
  // iframeのsrcクエリからリンク先URLを復元し、Markdownリンクにする。
  turndown.addRule("blogCardEmbed", {
    filter: (node) =>
      node.nodeName === "IFRAME" && node.classList?.contains("embed-blogcard"),
    replacement: (_content, node) => {
      const src = node.getAttribute("src");
      const title = node.getAttribute("title")?.trim();
      let href = src;
      try {
        href = new URL(src).searchParams.get("url") ?? src;
      } catch {
        // srcが絶対URLとして解釈できない場合はそのまま使う
      }
      if (!href) return "";
      return `\n\n[${title || hostnameLabel(href)}](${href})\n\n`;
    },
  });

  return (html) => turndown.turndown(html ?? "").trim();
}
