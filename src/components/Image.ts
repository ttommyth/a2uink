import React from "react";
import { Box, Text } from "ink";
import type { ResolvedNode } from "../types.js";

export const A2uiImage: React.FC<{ node: ResolvedNode }> = ({ node }) => {
  const label = (node.props.label ?? node.props.alt ?? "") as string;
  const url = (node.props.url ?? "") as string;

  return React.createElement(
    Box,
    { flexDirection: "column" },
    label ? React.createElement(Text, { dimColor: true }, label) : null,
    React.createElement(Text, { color: "cyan" }, url ? `[Image] ${url}` : "[Image]")
  );
};
