import { visit } from "unist-util-visit";

// `![alt](./img.jpg "caption")` または `[![alt](./img.jpg "caption")](href)` の
// 単独段落を <figure><figcaption>caption</figcaption></figure> に変換する。
// キャプション(画像のtitle属性)が無い画像はそのまま通す。
function extractImageNode(node) {
  if (node.type === "image") return node;
  if (
    node.type === "link" &&
    node.children.length === 1 &&
    node.children[0].type === "image"
  ) {
    return node.children[0];
  }
  return undefined;
}

export default function remarkFigureCaption() {
  return (tree) => {
    visit(tree, "paragraph", (node, index, parent) => {
      if (!parent || index === undefined || node.children.length !== 1) {
        return;
      }

      const wrapped = node.children[0];
      const image = extractImageNode(wrapped);
      if (!image || !image.title) {
        return;
      }

      const caption = image.title;
      image.title = null;

      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "figure",
        attributes: [],
        children: [
          wrapped,
          {
            type: "mdxJsxFlowElement",
            name: "figcaption",
            attributes: [],
            children: [{ type: "text", value: caption }],
          },
        ],
      };
    });
  };
}
