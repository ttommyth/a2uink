import React, { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";
import type { Key } from "ink";
import type { ActionDef, ResolvedNode } from "../types.js";
import type { CatalogRenderOptions } from "./types.js";
import { useFocusRegistry } from "../focus.js";

export const A2uiCheckbox: React.FC<{ node: ResolvedNode; options: CatalogRenderOptions }> = ({ node, options }) => {
  const focus = useFocusRegistry();
  const { register, unregister } = focus;
  const label = (node.props.label ?? node.props.text ?? "") as string;
  const checkedProp = (node.props.checked ?? false) as boolean;
  const action = node.props.onChange as ActionDef | undefined;
  const [checked, setChecked] = useState(checkedProp);
  const checkedRef = useRef(checked);
  const nodeRef = useRef(node);
  const dispatchRef = useRef(options.dispatchAction);
  const handlerRef = useRef<(input: string, key: Key) => void>(() => undefined);

  useEffect(() => {
    if (checkedRef.current !== checkedProp) {
      setChecked(checkedProp);
    }
  }, [checkedProp]);

  useEffect(() => {
    checkedRef.current = checked;
  }, [checked]);

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
        const next = !checkedRef.current;
        setChecked(next);
        dispatchRef.current(action, nodeRef.current, next);
      }
    };
  }, [action]);

  useEffect(() => {
    const handler = (input: string, key: Key) => handlerRef.current(input, key);
    register(node.instanceKey, handler);
    return () => unregister(node.instanceKey);
  }, [register, unregister, node.instanceKey]);

  const isFocused = focus.isFocused(node.instanceKey);
  const mark = checked ? "[x]" : "[ ]";
  const focusPrefix = isFocused ? "▶ " : "  ";

  return React.createElement(
    Box,
    { borderStyle: "single", borderColor: isFocused ? "cyan" : "gray", paddingX: 1 },
    React.createElement(Text, { color: isFocused ? "cyan" : undefined, inverse: isFocused }, `${focusPrefix}${mark} ${label}`)
  );
};
