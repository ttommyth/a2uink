import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text } from "ink";
import type { Key } from "ink";
import type { ActionDef, ResolvedNode } from "../types.js";
import type { CatalogRenderOptions } from "./types.js";
import { useFocusRegistry } from "../focus.js";
import { getItemLabel } from "./helpers.js";

export const A2uiRadioGroup: React.FC<{ node: ResolvedNode; options: CatalogRenderOptions }> = ({ node, options }) => {
  const focus = useFocusRegistry();
  const { register, unregister } = focus;
  const optionsList = (node.props.options ?? []) as Array<unknown>;
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
      const currentIndex = selectedRef.current;
      if (key.upArrow) {
        setSelectedIndex((current) => (current <= 0 ? optionsList.length - 1 : current - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((current) => (current + 1) % optionsList.length);
        return;
      }
      if ((key.return || input === " ") && action) {
        const value = optionsList[currentIndex];
        dispatchRef.current(action, nodeRef.current, value);
      }
    };
  }, [action, optionsList]);

  useEffect(() => {
    const handler = (input: string, key: Key) => handlerRef.current(input, key);
    register(node.instanceKey, handler);
    return () => unregister(node.instanceKey);
  }, [register, unregister, node.instanceKey]);

  const isFocused = focus.isFocused(node.instanceKey);
  const labels = useMemo(() => optionsList.map(getItemLabel), [optionsList]);

  return React.createElement(
    Box,
    { flexDirection: "column", borderStyle: "single", borderColor: isFocused ? "cyan" : "gray", paddingX: 1 },
    labels.map((label, index) =>
      React.createElement(
        Text,
        { key: `${node.instanceKey}_${index}`, inverse: isFocused && index === selectedIndex },
        `${index === selectedIndex ? "(o)" : "( )"} ${label}`
      )
    )
  );
};
