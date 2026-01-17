import React, { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";
import type { Key } from "ink";
import type { ActionDef, ResolvedNode } from "../types.js";
import type { CatalogRenderOptions } from "./types.js";
import { useFocusRegistry } from "../focus.js";

export const A2uiInput: React.FC<{ node: ResolvedNode; options: CatalogRenderOptions }> = ({ node, options }) => {
  const focus = useFocusRegistry();
  const { register, unregister } = focus;
  const action = node.props.onChange as ActionDef | undefined;
  const submitAction = node.props.onSubmit as ActionDef | undefined;
  const initial = (node.props.value ?? "") as string;
  const [value, setValue] = useState(initial);
  const valueRef = useRef(value);
  const nodeRef = useRef(node);
  const dispatchRef = useRef(options.dispatchAction);
  const handlerRef = useRef<(input: string, key: Key) => void>(() => undefined);

  useEffect(() => {
    if (valueRef.current !== initial) {
      setValue(initial);
    }
  }, [initial]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    nodeRef.current = node;
  }, [node]);

  useEffect(() => {
    dispatchRef.current = options.dispatchAction;
  }, [options.dispatchAction]);

  useEffect(() => {
    handlerRef.current = (input: string, key: Key) => {
      const currentValue = valueRef.current;
      if (key.return) {
        if (submitAction) {
          dispatchRef.current(submitAction, nodeRef.current, currentValue);
        }
        return;
      }

      if (key.backspace || key.delete) {
        const next = currentValue.slice(0, -1);
        setValue(next);
        if (action) {
          dispatchRef.current(action, nodeRef.current, next);
        }
        return;
      }

      if (input) {
        const next = `${currentValue}${input}`;
        setValue(next);
        if (action) {
          dispatchRef.current(action, nodeRef.current, next);
        }
      }
    };
  }, [action, submitAction]);

  useEffect(() => {
    const handler = (input: string, key: Key) => handlerRef.current(input, key);
    register(node.instanceKey, handler);
    return () => unregister(node.instanceKey);
  }, [register, unregister, node.instanceKey]);

  const isFocused = focus.isFocused(node.instanceKey);

  return React.createElement(
    Box,
    { borderStyle: "single", borderColor: isFocused ? "cyan" : "gray", paddingX: 1 },
    React.createElement(Text, { color: isFocused ? "cyan" : undefined }, value || " ")
  );
};
