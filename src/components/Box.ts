import React from "react";
import { Box } from "ink";
import type { ResolvedNode } from "../types.js";

export const A2uiBox: React.FC<{ node: ResolvedNode; children?: React.ReactNode }> = ({ node, children }) => {
  const props = node.props;
  return React.createElement(
    Box,
    {
      flexDirection: (props.direction as "row" | "column" | undefined) ?? "column",
      padding: props.padding as number | undefined,
      paddingX: props.paddingX as number | undefined,
      paddingY: props.paddingY as number | undefined,
      margin: props.margin as number | undefined,
      marginX: props.marginX as number | undefined,
      marginY: props.marginY as number | undefined,
      borderStyle: props.borderStyle as "single" | "double" | "round" | undefined,
      borderColor: props.borderColor as string | undefined,
      width: props.width as number | undefined,
      height: props.height as number | undefined,
      flexGrow: props.flexGrow as number | undefined,
      flexShrink: props.flexShrink as number | undefined,
      justifyContent: props.justifyContent as
        | "flex-start"
        | "flex-end"
        | "center"
        | "space-between"
        | "space-around"
        | undefined,
      alignItems: props.alignItems as
        | "flex-start"
        | "flex-end"
        | "center"
        | "stretch"
        | undefined
    },
    children
  );
};
