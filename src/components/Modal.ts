import React from "react";
import { Box, Text } from "ink";
import type { ResolvedNode } from "../types.js";

export const A2uiModal: React.FC<{ node: ResolvedNode; children?: React.ReactNode }> = ({ node, children }) => {
  const title = (node.props.title ?? node.props.label ?? "") as string;
  const description = (node.props.description ?? node.props.text ?? "") as string;

  return React.createElement(
    Box,
    {
      flexDirection: "column",
      paddingX: 2,
      paddingY: 1,
      marginTop: 1
    },
    title ? React.createElement(Text, { bold: true }, title) : null,
    description ? React.createElement(Text, { dimColor: true }, description) : null,
    children
  );
};
