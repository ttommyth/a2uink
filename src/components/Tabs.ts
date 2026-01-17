import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text } from "ink";
import type { Key } from "ink";
import type { ActionDef, ResolvedNode } from "../types.js";
import type { CatalogRenderOptions } from "./types.js";
import { useFocusRegistry } from "../focus.js";
import { getItemLabel } from "./helpers.js";

export const A2uiTabs: React.FC<{ node: ResolvedNode; options: CatalogRenderOptions }> = ({ node, options }) => {
  const focus = useFocusRegistry();
  const { register, unregister } = focus;
  const tabs = (node.props.tabs ?? []) as Array<unknown>;
  const action = node.props.onChange as ActionDef | undefined;
  const selectedProp = (node.props.selectedIndex ?? 0) as number;
  const [selectedIndex, setSelectedIndex] = useState(selectedProp);
  const selectedRef = useRef(selectedIndex);
  const nodeRef = useRef(node);
  const dispatchRef = useRef(options.dispatchAction);
  const handlerRef = useRef<(input: string, key: Key) => void>(() => undefined);

  useEffect(() => {
    if (selectedRef.current !== selectedProp) {
      setSelectedIndex(selectedProp);
    }
  }, [selectedProp]);

  useEffect(() => {
    selectedRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    nodeRef.current = node;
  }, [node]);

  useEffect(() => {
    dispatchRef.current = options.dispatchAction;
  }, [options.dispatchAction]);

  useEffect(() => {
    handlerRef.current = (input: string, key: Key) => {
      if (key.leftArrow) {
        setSelectedIndex((current) => (current <= 0 ? tabs.length - 1 : current - 1));
        return;
      }
      if (key.rightArrow) {
        setSelectedIndex((current) => (current + 1) % tabs.length);
        return;
      }
      if ((key.return || input === " ") && action) {
        const value = tabs[selectedRef.current];
        dispatchRef.current(action, nodeRef.current, value);
      }
    };
  }, [action, tabs]);

  useEffect(() => {
    const handler = (input: string, key: Key) => handlerRef.current(input, key);
    register(node.instanceKey, handler);
    return () => unregister(node.instanceKey);
  }, [register, unregister, node.instanceKey]);

  const isFocused = focus.isFocused(node.instanceKey);
  const labels = useMemo(() => tabs.map(getItemLabel), [tabs]);
  const activeChild = node.children[selectedIndex];

  return React.createElement(
    Box,
    { flexDirection: "column", borderStyle: "single", borderColor: isFocused ? "cyan" : "gray", paddingX: 1 },
    React.createElement(
      Box,
      { flexDirection: "row" },
      labels.map((label, index) =>
        React.createElement(
          Text,
          { key: `${node.instanceKey}_tab_${index}`, inverse: isFocused && index === selectedIndex },
          ` ${label} `
        )
      )
    ),
    activeChild ? options.renderNode(activeChild) : null
  );
};
