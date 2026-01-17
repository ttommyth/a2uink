import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Spacer, Text } from "ink";
import type { Key } from "ink";
import type { ActionDef, ResolvedNode } from "./types.js";
import { useFocusRegistry } from "./focus.js";

export interface CatalogRenderOptions {
  dispatchAction: (action: ActionDef, node: ResolvedNode, value?: unknown) => void;
}

export function renderNode(
  node: ResolvedNode,
  options: CatalogRenderOptions
): React.ReactElement {
  const { type } = node;

  switch (type) {
    case "Text":
      return React.createElement(A2uiText, { key: node.instanceKey, node });
    case "Box":
      return React.createElement(A2uiBox, { key: node.instanceKey, node, options });
    case "Spacer":
      return React.createElement(Spacer, { key: node.instanceKey });
    case "Input":
      return React.createElement(A2uiInput, { key: node.instanceKey, node, options });
    case "Button":
      return React.createElement(A2uiButton, { key: node.instanceKey, node, options });
    case "Select":
      return React.createElement(A2uiSelect, { key: node.instanceKey, node, options });
    default:
      return React.createElement(Text, { key: node.instanceKey }, `Unsupported: ${type}`);
  }
}

const A2uiText: React.FC<{ node: ResolvedNode }> = ({ node }) => {
  const props = node.props;
  const text = (props.text ?? props.value ?? "") as string;

  return React.createElement(
    Text,
    {
      color: props.color as string | undefined,
      backgroundColor: props.backgroundColor as string | undefined,
      bold: props.bold as boolean | undefined,
      dimColor: props.dim as boolean | undefined,
      italic: props.italic as boolean | undefined,
      underline: props.underline as boolean | undefined
    },
    text
  );
};

const A2uiBox: React.FC<{ node: ResolvedNode; options: CatalogRenderOptions }> = ({ node, options }) => {
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
    node.children.map((child: ResolvedNode) => renderNode(child, options))
  );
};

const A2uiButton: React.FC<{ node: ResolvedNode; options: CatalogRenderOptions }> = ({ node, options }) => {
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
    { borderStyle: "round", borderColor: isFocused ? "cyan" : undefined, paddingX: 1 },
    React.createElement(Text, { inverse: isFocused }, label)
  );
};

const A2uiInput: React.FC<{ node: ResolvedNode; options: CatalogRenderOptions }> = ({ node, options }) => {
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
    null,
    React.createElement(Text, { color: isFocused ? "cyan" : undefined }, value || " ")
  );
};

const A2uiSelect: React.FC<{ node: ResolvedNode; options: CatalogRenderOptions }> = ({ node, options }) => {
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

  return React.createElement(
    Box,
    { flexDirection: "column" },
    labels.map((label, itemIndex) =>
      React.createElement(
        Text,
        { key: `${node.instanceKey}_${itemIndex}`, inverse: isFocused && itemIndex === index },
        label
      )
    )
  );
};

function getItemLabel(item: unknown): string {
  if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
    return String(item);
  }

  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    const label = record.label ?? record.text ?? record.name;
    if (label) {
      return String(label);
    }
  }

  return JSON.stringify(item);
}
