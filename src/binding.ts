import type { BindingContext, BoundValue } from "./types.js";

const literalKeys = [
  "literalString",
  "literalNumber",
  "literalBoolean",
  "literalObject",
  "literalArray"
] as const;

export function resolveBoundValue(
  boundValue: BoundValue | undefined,
  dataModel: Record<string, unknown>,
  context?: BindingContext
): unknown {
  if (!boundValue) {
    return undefined;
  }

  if (boundValue.path) {
    const resolved = getPathValue(boundValue.path, dataModel, context);
    if (resolved !== undefined) {
      return resolved;
    }
    if (context?.item !== undefined) {
      const fromItem = getPathValueFromRoot(boundValue.path, context.item);
      if (fromItem !== undefined) {
        return fromItem;
      }
    }
  }

  for (const key of literalKeys) {
    if (key in boundValue) {
      return boundValue[key];
    }
  }

  return undefined;
}

export function resolveProps(
  props: Record<string, unknown>,
  dataModel: Record<string, unknown>,
  context?: BindingContext
): Record<string, unknown> {
  return resolvePropsWithBindings(props, dataModel, context).props;
}

export function resolvePropsWithBindings(
  props: Record<string, unknown>,
  dataModel: Record<string, unknown>,
  context?: BindingContext
): { props: Record<string, unknown>; boundProps: Record<string, BoundValue> } {
  const resolved: Record<string, unknown> = {};
  const boundProps: Record<string, BoundValue> = {};
  for (const [key, value] of Object.entries(props)) {
    if (isBoundValue(value)) {
      const boundValue = value as BoundValue;
      resolved[key] = resolveBoundValue(boundValue, dataModel, context);
      boundProps[key] = boundValue;
    } else {
      resolved[key] = value;
    }
  }
  return { props: resolved, boundProps };
}

function isBoundValue(value: unknown): value is BoundValue {
  if (!value || typeof value !== "object") {
    return false;
  }

  if ("path" in value) {
    return true;
  }

  return literalKeys.some((key) => key in (value as BoundValue));
}

function getPathValue(
  path: string,
  dataModel: Record<string, unknown>,
  context?: BindingContext
): unknown {
  const normalized = normalizePath(path);
  if (normalized === "") {
    return dataModel;
  }

  const parts = normalized.split(".");
  const root = resolveContextRoot(parts[0], context, dataModel);
  const startIndex = root === dataModel ? 0 : 1;

  return getPathValueFromParts(root, parts, startIndex);
}

function getPathValueFromRoot(path: string, root: unknown): unknown {
  const normalized = normalizePath(path);
  if (normalized === "") {
    return root;
  }
  const parts = normalized.split(".");
  return getPathValueFromParts(root, parts, 0);
}

function getPathValueFromParts(root: unknown, parts: string[], startIndex: number): unknown {
  let current: unknown = root;
  for (let i = startIndex; i < parts.length; i += 1) {
    if (current && typeof current === "object" && parts[i] in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[parts[i]];
    } else {
      return undefined;
    }
  }
  return current;
}

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }

  const withoutPrefix = trimmed.replace(/^\$\.?/, "");
  if (withoutPrefix.startsWith("/")) {
    return withoutPrefix.replace(/^\/+/, "").replace(/\//g, ".");
  }

  if (withoutPrefix.includes("/")) {
    return withoutPrefix.replace(/\//g, ".");
  }

  return withoutPrefix;
}

function resolveContextRoot(
  firstPart: string,
  context: BindingContext | undefined,
  dataModel: Record<string, unknown>
): unknown {
  if (firstPart === "item" && context?.item !== undefined) {
    return context.item;
  }

  if (firstPart === "index" && context?.index !== undefined) {
    return context.index;
  }

  return dataModel;
}

export function setBoundValue(
  path: string,
  dataModel: Record<string, unknown>,
  context: BindingContext | undefined,
  value: unknown
): Record<string, unknown> {
  const normalized = normalizePath(path);
  if (!normalized) {
    if (isPlainObject(value)) {
      return { ...dataModel, ...value };
    }
    return dataModel;
  }

  const parts = normalized.split(".");
  const root = resolveContextRoot(parts[0], context, dataModel);
  const startIndex = root === dataModel ? 0 : 1;
  setPathValueFromParts(root, parts, startIndex, value);
  return dataModel;
}

function setPathValueFromParts(root: unknown, parts: string[], startIndex: number, value: unknown): void {
  if (!root || typeof root !== "object") {
    return;
  }
  let current = root as Record<string, unknown>;
  for (let i = startIndex; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
