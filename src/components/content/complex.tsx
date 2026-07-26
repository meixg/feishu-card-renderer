import { useMemo, useState } from "react";

import type {
  ChartElement,
  CombinationImage,
  ImageCombinationElement,
  PersonElement,
  PersonListElement,
  TableColumn,
  TableElement,
} from "../../schema/components";
import { safePx } from "../../styles/safe";
import { useImageResource, usePersonResource } from "../../renderer/resources";
import { SafeMarkdown } from "../primitives/SafeText";
import { PreviewDialog, type PreviewItem } from "../primitives/PreviewDialog";

function ResolvedImage({ image, className = "" }: {
  image: CombinationImage; className?: string;
}): React.JSX.Element {
  const resource = useImageResource(image.img_key);
  const alt = image.alt?.content ?? "";
  if (resource?.status === "ready" && resource.value) {
    return <img className={className} src={resource.value} alt={alt} />;
  }
  return <span className="fcr-image-placeholder" role="img"
    aria-label={alt || "图片不可用"}
    data-state={resource?.status ?? "unavailable"}>{alt || "图片不可用"}</span>;
}

function CombinationContents({ images }: { images: CombinationImage[] }) {
  return <>{images.map((image, index) =>
    <ResolvedImage key={`${image.img_key ?? "missing"}:${index}`} image={image} />)}</>;
}

export function ImageCombination({ element }: {
  element: ImageCombinationElement;
}): React.JSX.Element {
  const images = (element.img_list ?? []).filter((item) =>
    item && typeof item === "object");
  const mode = ["double", "triple", "bisect", "trisect"].includes(
    String(element.combination_mode),
  ) ? element.combination_mode : "double";
  const previewItems: PreviewItem[] = images.map((image, index) => ({
    label: image.alt?.content || `图片 ${index + 1}`,
    content: <ResolvedImage image={image} />,
    thumbnail: <ResolvedImage image={image} />,
  }));
  const gallery = <div className={`fcr-image-combination fcr-combination-${mode}`}
    style={{ borderRadius: safePx(element.corner_radius) }}>
    <CombinationContents images={images} />
  </div>;
  return previewItems.length
    ? <PreviewDialog items={previewItems} label="打开图片组预览">{gallery}</PreviewDialog>
    : gallery;
}

function PersonView({ id, showAvatar, showName, size }: {
  id?: string; showAvatar: boolean; showName: boolean; size: string;
}): React.JSX.Element {
  const resource = usePersonResource(id);
  const person = resource?.status === "ready" ? resource.value : undefined;
  const state = resource?.status ?? "unavailable";
  return <span className={`fcr-person fcr-person-${size}`} data-state={state}>
    {showAvatar && (person?.avatarUrl
      ? <img src={person.avatarUrl} alt="" />
      : <span className="fcr-person-avatar" aria-hidden="true" />)}
    {showName && <span>{person?.name ?? (state === "loading" ? "加载中" : "人员不可用")}</span>}
    {!showName && <span className="fcr-sr-only">
      {person?.name ?? (state === "loading" ? "人员加载中" : "人员不可用")}
    </span>}
  </span>;
}

export function Person({ element }: { element: PersonElement }): React.JSX.Element {
  return <PersonView id={element.user_id} showAvatar={element.show_avatar !== false}
    showName={element.show_name !== false} size={element.size ?? "medium"} />;
}

export function PersonList({ element }: {
  element: PersonListElement;
}): React.JSX.Element {
  const people = (element.persons ?? []).filter((item) =>
    item && typeof item === "object");
  return <div className="fcr-person-list" style={element.lines && element.lines > 0
    ? { maxHeight: `${element.lines * 36}px` } : undefined}>
    {people.map((person, index) =>
      <PersonView key={`${person.id ?? "missing"}:${index}`} id={person.id}
        showAvatar={element.show_avatar !== false}
        showName={element.show_name !== false} size={element.size ?? "medium"} />)}
  </div>;
}

function formatCell(value: unknown, column: TableColumn): React.ReactNode {
  if (value === null || value === undefined) return "";
  if (column.data_type === "number" && typeof value === "number") {
    const precision = typeof column.format?.precision === "number" &&
      column.format.precision >= 0 && column.format.precision <= 10
      ? column.format.precision : undefined;
    const formatted = column.format?.separator
      ? value.toLocaleString("en-US", { minimumFractionDigits: precision,
        maximumFractionDigits: precision }) : precision === undefined
        ? String(value) : value.toFixed(precision);
    return `${column.format?.symbol ?? ""}${formatted}`;
  }
  if (column.data_type === "date" &&
    (typeof value === "string" || typeof value === "number")) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }
  if (column.data_type === "options" && Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").join(", ");
  }
  if (column.data_type === "persons") {
    const ids = Array.isArray(value) ? value : [value];
    return <span className="fcr-table-persons">
      {ids.filter((id): id is string => typeof id === "string").map((id, index) =>
        <PersonView key={`${id}:${index}`} id={id} showAvatar showName size="small" />)}
    </span>;
  }
  if ((column.data_type === "markdown" || column.data_type === "lark_md") &&
    typeof value === "string") return <SafeMarkdown content={value} />;
  if (typeof value === "string" || typeof value === "number" ||
    typeof value === "boolean") return String(value);
  return "";
}

export function Table({ element }: { element: TableElement }): React.JSX.Element {
  const columns = (element.columns ?? []).slice(0, 50);
  const rows = element.rows ?? [];
  const pageSize = Number.isInteger(element.page_size) &&
    Number(element.page_size) >= 1 && Number(element.page_size) <= 10
    ? Number(element.page_size) : 5;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const [page, setPage] = useState(0);
  const visible = rows.slice(page * pageSize, page * pageSize + pageSize);
  return <div className="fcr-table-wrap">
    <table className={`fcr-table fcr-row-${element.row_height ?? "medium"}`}>
      <thead><tr>{columns.map((column, index) =>
        <th key={`${column.name ?? "column"}:${index}`} scope="col"
          style={{ width: safePx(column.width) }}>{column.display_name ?? ""}</th>)}</tr></thead>
      <tbody>{visible.map((row, rowIndex) =>
        <tr key={page * pageSize + rowIndex}>{columns.map((column, columnIndex) =>
          <td key={`${column.name ?? "column"}:${columnIndex}`}>
            {column.name ? formatCell(row[column.name], column) : ""}
          </td>)}</tr>)}</tbody>
    </table>
    {pages > 1 && <nav className="fcr-table-pagination" aria-label="表格分页">
      <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>上一页</button>
      <span aria-live="polite">{page + 1} / {pages}</span>
      <button type="button" disabled={page + 1 === pages}
        onClick={() => setPage(page + 1)}>下一页</button>
    </nav>}
  </div>;
}

export function Chart({ element }: { element: ChartElement }): React.JSX.Element {
  const result = useMemo(() => <div className="fcr-chart-result"
    data-chart-result="safe" role="img" aria-label="图表安全渲染结果容器">
    图表渲染器待接入
  </div>, []);
  return element.preview === true
    ? <PreviewDialog label="打开图表预览"
      items={[{ label: "图表预览", content: result }]}>{result}</PreviewDialog>
    : result;
}
