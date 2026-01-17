import React, { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";
import type { Key } from "ink";
import type { ActionDef, ResolvedNode } from "../types.js";
import type { CatalogRenderOptions } from "./types.js";
import { useFocusRegistry } from "../focus.js";

export const A2uiDateTimeInput: React.FC<{ node: ResolvedNode; options: CatalogRenderOptions }> = ({ node, options }) => {
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
  const valuePathRef = useRef<string | undefined>((node.boundProps?.value as { path?: string } | undefined)?.path);
  const debounceMsRef = useRef<number>(resolveDebounceMs(node.props.debounceMs));
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCursor, setShowCursor] = useState(true);

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
    valuePathRef.current = (node.boundProps?.value as { path?: string } | undefined)?.path;
    debounceMsRef.current = resolveDebounceMs(node.props.debounceMs);
  }, [node]);

  useEffect(() => {
    dispatchRef.current = options.dispatchAction;
  }, [options.dispatchAction]);

  useEffect(() => {
    const scheduleChange = (next: string) => {
      if (!action) {
        return;
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      const debounceMs = debounceMsRef.current;
      if (!debounceMs) {
        dispatchRef.current(action, nodeRef.current, next);
        return;
      }
      debounceTimeoutRef.current = setTimeout(() => {
        dispatchRef.current(action, nodeRef.current, next);
        debounceTimeoutRef.current = null;
      }, debounceMs);
    };

    handlerRef.current = (input: string, key: Key) => {
      const currentValue = valueRef.current;
      if (key.return) {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
          debounceTimeoutRef.current = null;
        }
        if (submitAction) {
          dispatchRef.current(submitAction, nodeRef.current, currentValue);
        }
        return;
      }

      if (key.backspace || key.delete) {
        const next = currentValue.slice(0, -1);
        setValue(next);
        if (valuePathRef.current && options.updateLocalDataModel) {
          options.updateLocalDataModel(valuePathRef.current, next, nodeRef.current);
        }
        scheduleChange(next);
        return;
      }

      if (input) {
        const next = `${currentValue}${input}`;
        setValue(next);
        if (valuePathRef.current && options.updateLocalDataModel) {
          options.updateLocalDataModel(valuePathRef.current, next, nodeRef.current);
        }
        scheduleChange(next);
      }
    };
  }, [action, submitAction]);

  useEffect(
    () => () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    const handler = (input: string, key: Key) => handlerRef.current(input, key);
    register(node.instanceKey, handler);
    return () => unregister(node.instanceKey);
  }, [register, unregister, node.instanceKey]);

  const isFocused = focus.isFocused(node.instanceKey);
  useEffect(() => {
    if (!isFocused) {
      setShowCursor(false);
      return;
    }
    setShowCursor(true);
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, [isFocused]);

  const displayValue = value || " ";
  const cursor = isFocused && showCursor ? "▌" : " ";
  const focusPrefix = isFocused ? "▶ " : "  ";
  const label = node.props.label as string | undefined;
  const placeholder = node.props.placeholder as string | undefined;

  return React.createElement(
    Box,
    { flexDirection: "column" },
    label ? React.createElement(Text, { dimColor: true }, label) : null,
    React.createElement(
      Box,
      null,
      React.createElement(
        Text,
        { color: isFocused ? "cyan" : undefined },
        `${focusPrefix}${displayValue}${cursor}${placeholder && !value ? ` (${placeholder})` : ""}`
      )
    )
  );
};

function resolveDebounceMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  if (Number.isFinite(parsed)) {
    return Math.max(0, parsed);
  }
  return 500;
}
