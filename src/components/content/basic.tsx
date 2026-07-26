import type {
  DivElement,
  HrElement,
  ImageElement,
  MarkdownElement,
} from "../../schema/components";
import { useImageResource } from "../../renderer/resources";
import { safeBox, safePx } from "../../styles/safe";
import { SafeMarkdown, SafeText } from "../primitives/SafeText";

export function Div({ element }: { element: DivElement }): React.JSX.Element {
  return (
    <div className="fcr-div" style={{ margin: safeBox(element.margin, true) }}>
      {element.text && <SafeText text={element.text} />}
    </div>
  );
}

export function Markdown({ element }: { element: MarkdownElement }): React.JSX.Element {
  return (
    <div className="fcr-markdown">
      <SafeMarkdown content={element.content ?? ""} />
    </div>
  );
}

export function Hr({ element }: { element: HrElement }): React.JSX.Element {
  return <hr className="fcr-hr"
    style={{ margin: safeBox(element.margin, true) }} />;
}

export function Image({ element }: { element: ImageElement }): React.JSX.Element {
  const key = element.img_key;
  const current = useImageResource(key);
  const alt = element.alt?.content ?? "";
  const title = element.title?.content;
  if (current?.status === "ready" && current.value) {
    return <figure className="fcr-image" style={{
      margin: safeBox(element.margin, true),
      borderRadius: safePx(element.corner_radius),
    }}>
      <img src={current.value} alt={alt} title={title} />
      {title && <figcaption>{title}</figcaption>}
    </figure>;
  }
  return (
    <div className="fcr-image-placeholder" role="img"
      aria-label={alt || "图片不可用"}
      data-state={current?.status ?? "unavailable"}>
      {alt || "图片不可用"}
    </div>
  );
}
