import React, { useEffect, useRef } from "react";
import { Text } from "ink";
import type { Key } from "ink";
import type { ActionDef, ResolvedNode } from "../types.js";
import type { CatalogRenderOptions } from "./types.js";
import { useFocusRegistry } from "../focus.js";

export const A2uiButton: React.FC<{ node: ResolvedNode; options: CatalogRenderOptions }> = ({ node, options }) => {
  const focus = useFocusRegistry();
  const { register, unregister } = focus;
  const label =
    resolveLabel(node.props.label ?? node.props.text) ?? resolveLabelFromChildren(node.children) ?? "Button";
  const action = (node.props.onPress ?? node.props.action) as ActionDef | undefined;
  const isFocused = focus.isFocused(node.instanceKey);
  const focusPrefix = isFocused ? "▶ " : "  ";
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

  return React.createElement(Text, { inverse: isFocused, bold: true }, `${focusPrefix}${label}`);
};

function resolveLabel(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.literalString === "string") {
      return record.literalString;
    }
    if (typeof record.text === "string") {
      return record.text;
    }
    if (record.text && typeof record.text === "object") {
      const textRecord = record.text as Record<string, unknown>;
      if (typeof textRecord.literalString === "string") {
        return textRecord.literalString;
      }
      if (typeof textRecord.text === "string") {
        return textRecord.text;
      }
    }
    if (typeof record.label === "string") {
      return record.label;
    }
  }

  return undefined;
}

function resolveLabelFromChildren(children: ResolvedNode[]): string | undefined {
  const textChild = children.find((child) => child.type === "Text" && child.props?.text !== undefined);
  if (!textChild) {
    return undefined;
  }
  return resolveLabel(textChild.props.text);
}
