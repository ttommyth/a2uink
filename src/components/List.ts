import React, { useMemo } from "react";
import { Box, Text } from "ink";
import type { ResolvedNode } from "../types.js";
import { getItemLabel } from "./helpers.js";

export const A2uiList: React.FC<{ node: ResolvedNode }> = ({ node }) => {
  const items = (node.props.items ?? []) as Array<unknown>;
  const labels = useMemo(() => items.map(getItemLabel), [items]);

  return React.createElement(
    Box,
    { flexDirection: "column" },
    labels.map((label, index) => React.createElement(Text, { key: `${node.instanceKey}_${index}` }, `• ${label}`))
  );
};
