import React from "react";
import { Box, Text } from "ink";
import type { ResolvedNode } from "../types.js";
import { formatRow, getColumnWidths, normalizeRow, getItemLabel } from "./helpers.js";

export const A2uiTable: React.FC<{ node: ResolvedNode }> = ({ node }) => {
  const columns = (node.props.columns ?? []) as Array<unknown>;
  const rows = (node.props.rows ?? []) as Array<unknown>;
  const columnLabels = columns.map(getItemLabel);
  const normalizedRows = rows.map((row) => normalizeRow(row, columns.length));
  const widths = getColumnWidths(columnLabels, normalizedRows);

  const header = formatRow(columnLabels, widths);
  const body = normalizedRows.map((row) => formatRow(row, widths));

  return React.createElement(
    Box,
    { flexDirection: "column", borderStyle: "single", borderColor: "gray", paddingX: 1 },
    React.createElement(Text, { bold: true }, header),
    ...body.map((line, index) => React.createElement(Text, { key: `${node.instanceKey}_row_${index}` }, line))
  );
};
