import React from "react";
import { Box, Text } from "ink";
import type { ResolvedNode } from "../types.js";
import { formatRow, getColumnWidths, normalizeRow, getItemLabel } from "./helpers.js";

export const A2uiTable: React.FC<{ node: ResolvedNode }> = ({ node }) => {
  const columns = (node.props.columns ?? []) as Array<unknown>;
  const rows = (node.props.rows ?? []) as Array<unknown>;
  const columnInfo = columns.map((column, index) => {
    if (column && typeof column === "object") {
      const record = column as Record<string, unknown>;
      const key = record.key ?? record.id ?? record.name ?? record.label ?? record.header ?? String(index);
      const label = record.header ?? record.label ?? record.text ?? record.name ?? record.key ?? String(index);
      return { key: String(key), label: String(label) };
    }
    return { key: String(index), label: getItemLabel(column) };
  });

  const columnLabels = columnInfo.map((column) => column.label);
  const normalizedRows = rows.map((row) => {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      const record = row as Record<string, unknown>;
      return columnInfo.map((column) => getItemLabel(record[column.key]));
    }
    return normalizeRow(row, columns.length);
  });
  const widths = getColumnWidths(columnLabels, normalizedRows);

  const header = formatRow(columnLabels, widths);
  const body = normalizedRows.map((row) => formatRow(row, widths));

  return React.createElement(
    Box,
    { flexDirection: "column" },
    React.createElement(Text, { bold: true }, header),
    ...body.map((line, index) => React.createElement(Text, { key: `${node.instanceKey}_row_${index}` }, line))
  );
};
