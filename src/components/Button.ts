import React, { useEffect, useRef } from "react";
import { Box, Text } from "ink";
import type { Key } from "ink";
import type { ActionDef, ResolvedNode } from "../types.js";
import type { CatalogRenderOptions } from "./types.js";
import { useFocusRegistry } from "../focus.js";

export const A2uiButton: React.FC<{ node: ResolvedNode; options: CatalogRenderOptions }> = ({ node, options }) => {
  const focus = useFocusRegistry();
  const { register, unregister } = focus;
  const label = (node.props.label ?? node.props.text ?? "Button") as string;
  const action = node.props.onPress as ActionDef | undefined;
  const isFocused = focus.isFocused(node.instanceKey);
  const nodeRef = useRef(node);
  const dispatchRef = useRef(options.dispatchAction);
  const handlerRef = useRef<(input: string, key: Key) => void>(() => undefined);

  useEffect(() => {
    nodeRef.current = node;
  }, [node]);

  useEffect(() => {
    dispatchRef.current = options.dispatchAction;
  }, [options.dispatchAction]);

  useEffect(() => {
    handlerRef.current = (input: string, key: Key) => {
      if (!action) {
        return;
      }
      if (key.return || input === " ") {
        dispatchRef.current(action, nodeRef.current);
      }
    };
  }, [action]);

  useEffect(() => {
    const handler = (input: string, key: Key) => handlerRef.current(input, key);
    register(node.instanceKey, handler);
    return () => unregister(node.instanceKey);
  }, [register, unregister, node.instanceKey]);

  return React.createElement(
    Box,
    { borderStyle: "round", borderColor: isFocused ? "cyan" : "gray", paddingX: 1 },
    React.createElement(Text, { inverse: isFocused, bold: true }, label)
  );
};
