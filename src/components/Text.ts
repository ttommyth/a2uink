import React from "react";
import { Text } from "ink";
import type { ResolvedNode } from "../types.js";

export const A2uiText: React.FC<{ node: ResolvedNode }> = ({ node }) => {
  const props = node.props;
  const text = (props.text ?? props.value ?? "") as string;

  return React.createElement(
    Text,
    {
      color: props.color as string | undefined,
      backgroundColor: props.backgroundColor as string | undefined,
      bold: (props.bold as boolean | undefined) ?? true,
      dimColor: props.dim as boolean | undefined,
      italic: props.italic as boolean | undefined,
      underline: props.underline as boolean | undefined
    },
    text
  );
};
