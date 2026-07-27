import type {
  DivElement,
  HrElement,
  ImageElement,
  MarkdownElement,
} from "../../schema/components";
import { useImageResource } from "../../renderer/resources";
import { safeBox, safePx } from "../../styles/safe";
import { SafeText } from "../primitives/SafeText";
import { MarkdownContent } from "./MarkdownContent";
import { useRendererContext } from "../../renderer/context";
import { safeRgba } from "../../styles/safe";

const NATIVE_TEXT_SIZES: Readonly<Record<string, string>> = {
  notation: "var(--fcr-markdown-font-size-notation)",
  normal: "var(--fcr-markdown-font-size)",
  heading: "var(--fcr-markdown-font-size-heading)",
};
const STANDARD_ICON_COLORS: Readonly<Record<string, string>> = {
  blue: "#3370ff", wathet: "#3cc8ff", turquoise: "#00b8a9",
  green: "#34c724", yellow: "#f5b500", orange: "#ff8800",
  red: "#f54a45", carmine: "#f01d94", violet: "#8f48d9",
  purple: "#7b67ee", indigo: "#5b65f5", grey: "#646a73",
};
const STANDARD_ICON_GLYPHS: Readonly<Record<string, string>> = {
  info_outlined: "i",
  check_outlined: "✓",
  warning_outlined: "!",
};

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

function MarkdownIcon({ icon }: { icon: NonNullable<MarkdownElement["icon"]> }) {
  const resource = useImageResource(
    icon.tag === "custom_icon" ? icon.img_key : undefined,
  );
  if (icon.tag === "custom_icon") {
    return resource?.status === "ready" && resource.value
      ? <img className="fcr-markdown-icon" src={resource.value} alt="" />
      : <span className="fcr-markdown-icon fcr-markdown-icon-placeholder"
          aria-hidden="true" />;
  }
  return <span className="fcr-markdown-icon fcr-markdown-standard-icon"
    data-icon-token={icon.token} aria-hidden="true">
      {STANDARD_ICON_GLYPHS[icon.token] ?? "◆"}
    </span>;
}

export function Div({ element }: { element: DivElement }): React.JSX.Element {
  return (
    <div className="fcr-div" style={{ margin: safeBox(element.margin, true) }}>
      {element.text && <SafeText text={element.text} />}
    </div>
  );
}

export function Markdown({ element, path }: {
  element: MarkdownElement;
  path: string;
}): React.JSX.Element {
  const { markdownAnalyses, cardStyle, device, colorScheme } =
    useRendererContext();
  const analysis = markdownAnalyses.get(path);
  const textSizes = record(cardStyle.text_size);
  const definition = record(textSizes?.[element.text_size ?? "normal"]);
  const configuredSize = definition?.[device] ?? definition?.default;
  const fontSize = NATIVE_TEXT_SIZES[String(configuredSize)] ??
    NATIVE_TEXT_SIZES[element.text_size ?? "normal"] ??
    NATIVE_TEXT_SIZES.normal;
  const colors = record(cardStyle.color);
  const iconColorName = element.icon?.tag === "standard_icon"
    ? element.icon.color : undefined;
  const colorDefinition = record(colors?.[iconColorName ?? ""]);
  const iconColor = safeRgba(colorDefinition?.[
    colorScheme === "dark" ? "dark_mode" : "light_mode"
  ]) ?? STANDARD_ICON_COLORS[iconColorName ?? ""];
  return (
    <div className="fcr-markdown" data-text-size={element.text_size}
      data-text-align={element.text_align}
      style={{
        margin: safeBox(element.margin, true),
        textAlign: element.text_align,
        fontSize,
        "--fcr-markdown-icon-color": iconColor,
      } as React.CSSProperties}>
      {element.icon && <MarkdownIcon icon={element.icon} />}
      <div className="fcr-markdown-content">
        {analysis
          ? <MarkdownContent analysis={analysis} />
          : element.content ?? ""}
      </div>
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
