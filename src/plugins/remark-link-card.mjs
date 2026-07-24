import { visit } from "unist-util-visit";

// 段落がリンク1つだけで構成されている場合(note.comのようにURLを単独行で
// 貼り付けた場合、または移行済み記事の「ホスト名だけのリンク」)に、
// <LinkCard url="..." /> に変換する。
// 画像へのリンク(`[![alt](img)](href)`)はremark-figure-captionに任せるため対象外。
function containsImage(node) {
  if (node.type === "image") return true;
  return (node.children ?? []).some(containsImage);
}

export default function remarkLinkCard() {
  return (tree) => {
    visit(tree, "paragraph", (node, index, parent) => {
      if (!parent || index === undefined || node.children.length !== 1) {
        return;
      }

      const link = node.children[0];
      if (link.type !== "link" || !link.url || containsImage(link)) {
        return;
      }

      const attributes = [{ type: "mdxJsxAttribute", name: "url", value: link.url }];
      // リンクのtitle属性で "small" を指定すると小型カードになる(画像キャプションと同じ仕組み)。
      // 未指定/それ以外の値の場合はLinkCard側のデフォルト(大型)が使われる。
      if (link.title?.trim().toLowerCase() === "small") {
        attributes.push({ type: "mdxJsxAttribute", name: "variant", value: "small" });
      }

      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "LinkCard",
        attributes,
        children: [],
      };
    });
  };
}
