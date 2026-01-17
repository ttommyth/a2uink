import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text } from "ink";
import type { Key } from "ink";
import type { ActionDef, ResolvedNode } from "../types.js";
import type { CatalogRenderOptions } from "./types.js";
import { useFocusRegistry } from "../focus.js";

const BAR_WIDTH = 20;

export const A2uiSlider: React.FC<{ node: ResolvedNode; options: CatalogRenderOptions }> = ({ node, options }) => {
  const focus = useFocusRegistry();
  const { register, unregister } = focus;
  const min = coerceNumber(node.props.min, 0);
  const max = coerceNumber(node.props.max, 100);
  const step = coerceNumber(node.props.step, 1);
  const action = node.props.onChange as ActionDef | undefined;
  const initial = coerceNumber(node.props.value, min);
  const [value, setValue] = useState(initial);
  const valueRef = useRef(value);
  const nodeRef = useRef(node);
  const dispatchRef = useRef(options.dispatchAction);
  const handlerRef = useRef<(input: string, key: Key) => void>(() => undefined);

  useEffect(() => {
    if (valueRef.current !== initial) {
      setValue(clamp(initial, min, max));
    }
  }, [initial, min, max]);

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
    handlerRef.current = (_input: string, key: Key) => {
      if (!action) {
        return;
      }
      if (key.leftArrow) {
        const next = clamp(valueRef.current - step, min, max);
        setValue(next);
        dispatchRef.current(action, nodeRef.current, next);
      }
      if (key.rightArrow) {
        const next = clamp(valueRef.current + step, min, max);
        setValue(next);
        dispatchRef.current(action, nodeRef.current, next);
      }
    };
  }, [action, min, max, step]);

  useEffect(() => {
    const handler = (input: string, key: Key) => handlerRef.current(input, key);
    register(node.instanceKey, handler);
    return () => unregister(node.instanceKey);
  }, [register, unregister, node.instanceKey]);

  const isFocused = focus.isFocused(node.instanceKey);
  const label = node.props.label as string | undefined;
  const percentage = max === min ? 1 : (value - min) / (max - min);
  const filled = Math.max(0, Math.min(BAR_WIDTH, Math.round(percentage * BAR_WIDTH)));
  const bar = useMemo(() => {
    const fill = "█".repeat(filled);
    const empty = "░".repeat(BAR_WIDTH - filled);
    return `${fill}${empty}`;
  }, [filled]);

  return React.createElement(
    Box,
    { flexDirection: "column" },
    label ? React.createElement(Text, { dimColor: true }, label) : null,
    React.createElement(
      Box,
      null,
      React.createElement(Text, { color: isFocused ? "cyan" : undefined }, `${bar} ${value}`)
    )
  );
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function coerceNumber(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(number)) {
    return number;
  }
  return fallback;
}
