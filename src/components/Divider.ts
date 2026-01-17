import React from "react";
import Divider from "ink-divider";
import type { ResolvedNode } from "../types.js";

export const A2uiDivider: React.FC<{ node: ResolvedNode }> = ({ node }) => {
  const title = (node.props.title ?? node.props.label ?? node.props.text ?? "") as string;
  return React.createElement(Divider, title ? { title } : undefined);
};
