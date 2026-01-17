import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text } from "ink";
import type { Key } from "ink";
import type { ActionDef, ResolvedNode } from "../types.js";
import type { CatalogRenderOptions } from "./types.js";
import { useFocusRegistry } from "../focus.js";
import { getItemLabel } from "./helpers.js";

export const A2uiSelect: React.FC<{ node: ResolvedNode; options: CatalogRenderOptions }> = ({ node, options }) => {
  const focus = useFocusRegistry();
  const { register, unregister } = focus;
  const items = (node.props.items ?? []) as Array<unknown>;
  const action = node.props.onSelect as ActionDef | undefined;
  const initialIndex = (node.props.selectedIndex ?? 0) as number;
  const [index, setIndex] = useState(initialIndex);
  const nodeRef = useRef(node);
  const dispatchRef = useRef(options.dispatchAction);
  const indexRef = useRef(index);
  const itemsRef = useRef(items);
  const handlerRef = useRef<(input: string, key: Key) => void>(() => undefined);

  useEffect(() => {
    if (indexRef.current !== initialIndex) {
      setIndex(initialIndex);
    }
  }, [initialIndex]);

  useEffect(() => {
    nodeRef.current = node;
  }, [node]);

  useEffect(() => {
    dispatchRef.current = options.dispatchAction;
  }, [options.dispatchAction]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    handlerRef.current = (input: string, key: Key) => {
      const currentItems = itemsRef.current;
      const currentIndex = indexRef.current;
      if (key.upArrow) {
        setIndex((current) => (current <= 0 ? currentItems.length - 1 : current - 1));
        return;
      }
      if (key.downArrow) {
        setIndex((current) => (current + 1) % currentItems.length);
        return;
      }
      if (key.return && action) {
        const value = currentItems[currentIndex];
        dispatchRef.current(action, nodeRef.current, value);
      }
      if (input === " " && action) {
        const value = currentItems[currentIndex];
        dispatchRef.current(action, nodeRef.current, value);
      }
    };
  }, [action]);

  useEffect(() => {
    const handler = (input: string, key: Key) => handlerRef.current(input, key);
    register(node.instanceKey, handler);
    return () => unregister(node.instanceKey);
  }, [register, unregister, node.instanceKey]);

  const isFocused = focus.isFocused(node.instanceKey);
  const labels = useMemo(() => items.map(getItemLabel), [items]);

  const label = node.props.label as string | undefined;

  return React.createElement(
    Box,
    { flexDirection: "column" },
    label ? React.createElement(Text, { dimColor: true }, label) : null,
    React.createElement(
      Box,
      { flexDirection: "column" },
      labels.map((itemLabel, itemIndex) =>
        React.createElement(
          Text,
          { key: `${node.instanceKey}_${itemIndex}`, inverse: isFocused && itemIndex === index },
          `${isFocused && itemIndex === index ? "▶ " : "  "}${itemLabel}`
        )
      )
    )
  );
};
