import { Fragment, type ReactNode } from "react";

import {
  MARKDOWN_LIMITS,
  type MarkdownNode,
} from "../../markdown/bounded";

type TableBudget = { tableNodes: number };

export function MarkdownTable({
  node,
  budget,
  renderCell,
}: {
  node: MarkdownNode;
  budget: TableBudget;
  renderCell: (cell: MarkdownNode) => ReactNode;
}): React.JSX.Element {
  const rows = node.children ?? [];
  const align = node.align ?? [];
  const header = rows[0];
  const body = rows.slice(1, MARKDOWN_LIMITS.tableRows + 1);
  budget.tableNodes += 1;

  const renderRow = (row: MarkdownNode, headerRow: boolean) => {
    budget.tableNodes += 1;
    if (budget.tableNodes > MARKDOWN_LIMITS.tableNodes) return null;
    return <tr>{row.children
      ?.slice(0, MARKDOWN_LIMITS.tableColumns)
      .map((cell, index) => {
        budget.tableNodes += 1;
        if (budget.tableNodes > MARKDOWN_LIMITS.tableNodes) return null;
        const style = align[index]
          ? { textAlign: align[index] ?? undefined }
          : undefined;
        return headerRow
          ? <th key={index} scope="col" style={style}>
              {renderCell(cell)}
            </th>
          : <td key={index} style={style}>
              {renderCell(cell)}
            </td>;
      })}</tr>;
  };

  return <div className="fcr-markdown-table-wrap" tabIndex={0}>
    <table>
      {header && <thead>{renderRow(header, true)}</thead>}
      <tbody>{body.map((row, index) => (
        <Fragment key={index}>{renderRow(row, false)}</Fragment>
      ))}</tbody>
    </table>
  </div>;
}
