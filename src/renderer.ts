import React from "react";
import { Box, render, Text, useInput, useStdout } from "ink";
import type { Key } from "ink";
import type { ActionDef, A2uiServerMessage, A2uiUserAction, BoundValue, ComponentDef, DataModelEntry, RendererOptions, ResolvedNode } from "./types.js";
import { resolveBoundValue } from "./binding.js";
import { FocusProvider, useFocusRegistry } from "./focus.js";
import { buildResolvedTree } from "./tree.js";
import { renderNode } from "./catalog.js";

interface SurfaceState {
  surfaceId: string;
  catalogId?: string;
  rootComponentId?: string;
  components: Record<string, ComponentDef>;
  dataModel: Record<string, unknown>;
  renderReady: boolean;
}

export interface A2uiInkRenderer {
  handleMessage(message: A2uiServerMessage): void;
  dispose(): void;
}

export function createA2uiInkRenderer(options: RendererOptions = {}): A2uiInkRenderer {
  const surfaces = new Map<string, SurfaceState>();
  let inkInstance: ReturnType<typeof render> | null = null;

  const ensureSurface = (surfaceId: string): SurfaceState => {
    const existing = surfaces.get(surfaceId);
    if (existing) {
      return existing;
    }
    const created: SurfaceState = {
      surfaceId,
      components: {},
      dataModel: {},
      renderReady: false
    };
    surfaces.set(surfaceId, created);
    return created;
  };

  const renderSurfaces = () => {
    const surface = Array.from(surfaces.values()).find((entry) => entry.renderReady && entry.rootComponentId);

    const element = React.createElement(A2uiRoot, {
      surface: surface ?? null,
      onUserAction: options.onUserAction
    });

    if (!inkInstance) {
      const canPatchConsole = typeof console !== "undefined" && typeof console.Console === "function";
      const renderOptions: Parameters<typeof render>[1] = {
        exitOnCtrlC: options.exitOnCtrlC ?? true,
        patchConsole: options.patchConsole ?? canPatchConsole
      };

      if (options.stdin) {
        renderOptions.stdin = options.stdin;
      }
      if (options.stdout) {
        renderOptions.stdout = options.stdout;
      }
      if (options.stderr) {
        renderOptions.stderr = options.stderr;
      }

      inkInstance = render(element, renderOptions);
    } else {
      inkInstance.clear();
      inkInstance.rerender(element);
    }
  };

  const handleMessage = (message: A2uiServerMessage) => {
    switch (message.type) {
      case "beginRendering": {
        const surface = ensureSurface(message.surfaceId);
        surface.catalogId = message.catalogId;
        surface.renderReady = true;
        renderSurfaces();
        break;
      }
      case "surfaceUpdate": {
        const surface = ensureSurface(message.surfaceId);
        surface.rootComponentId = message.rootComponentId;
        surface.components = message.components.reduce<Record<string, ComponentDef>>(
          (acc: Record<string, ComponentDef>, component) => {
            const normalized = normalizeComponentDef(component);
            if (normalized) {
              acc[normalized.id] = normalized;
            }
            return acc;
          },
          {}
        );
        renderSurfaces();
        break;
      }
      case "dataModelUpdate": {
        const surface = ensureSurface(message.surfaceId);
        if (message.dataModel) {
          surface.dataModel = mergeDataModel(surface.dataModel, message.dataModel);
        } else if (message.contents) {
          surface.dataModel = applyDataModelUpdate(surface.dataModel, message.path, message.contents);
        }
        renderSurfaces();
        break;
      }
      case "deleteSurface": {
        surfaces.delete(message.surfaceId);
        renderSurfaces();
        break;
      }
      default:
        break;
    }
  };

  const dispose = () => {
    inkInstance?.unmount();
    inkInstance = null;
  };

  return { handleMessage, dispose };
}

const A2uiRoot: React.FC<{
  surface: SurfaceState | null;
  onUserAction?: (action: A2uiUserAction) => void;
}> = ({ surface, onUserAction }) => {
  if (!surface || !surface.rootComponentId) {
    return React.createElement(Text, null, "No surface");
  }

      const tree = buildResolvedTree(surface.components, surface.rootComponentId, surface.dataModel);
  if (!tree) {
    return React.createElement(Text, null, "Invalid surface");
  }

  return React.createElement(
    FocusProvider,
    null,
    React.createElement(FocusInputHandler),
    React.createElement(
      RootContainer,
      null,
      React.createElement(RenderTree, {
        surfaceId: surface.surfaceId,
        tree,
        dataModel: surface.dataModel,
        onUserAction
      })
    )
  );
};

const FocusInputHandler: React.FC = () => {
  const focus = useFocusRegistry();

  useInput((input: string, key: Key) => {
    if (key.tab) {
      if (key.shift) {
        focus.focusPrev();
      } else {
        focus.focusNext();
      }
      return;
    }

    focus.handleKey(input, key);
  });

  return null;
};

const RootContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? undefined;
  const height = stdout?.rows ?? undefined;

  return React.createElement(Box, { width, height, flexDirection: "column" }, children);
};

const RenderTree: React.FC<{
  surfaceId: string;
  tree: ResolvedNode;
  dataModel: Record<string, unknown>;
  onUserAction?: (action: A2uiUserAction) => void;
}> = ({ surfaceId, tree, dataModel, onUserAction }) => {
  const dispatchAction = (action: ActionDef, node: ResolvedNode, value?: unknown) => {
    const context = {
      ...resolveActionContext(action.context, dataModel, node.bindingContext),
      ...(node.bindingContext?.index !== undefined ? { index: node.bindingContext.index } : {}),
      ...(node.bindingContext?.item !== undefined ? { item: node.bindingContext.item } : {})
    } as Record<string, unknown>;

    onUserAction?.({
      type: "userAction",
      surfaceId,
      componentId: node.id,
      actionId: action.actionId,
      context,
      value
    });
  };

  return renderNode(tree, { dispatchAction });
};

function resolveActionContext(
  context: Record<string, unknown> | undefined,
  dataModel: Record<string, unknown>,
  bindingContext: ResolvedNode["bindingContext"]
): Record<string, unknown> {
  if (!context) {
    return {};
  }
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (isBoundValueLike(value)) {
      resolved[key] = resolveBoundValue(value as BoundValue, dataModel, bindingContext);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

function isBoundValueLike(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  return (
    "path" in (value as Record<string, unknown>) ||
    "literalString" in (value as Record<string, unknown>) ||
    "literalNumber" in (value as Record<string, unknown>) ||
    "literalBoolean" in (value as Record<string, unknown>) ||
    "literalObject" in (value as Record<string, unknown>) ||
    "literalArray" in (value as Record<string, unknown>)
  );
}

function mergeDataModel(
  base: Record<string, unknown>,
  update: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(update)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = mergeDataModel(result[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeComponentDef(component: unknown): ComponentDef | null {
  if (!component || typeof component !== "object") {
    return null;
  }

  const record = component as Record<string, unknown>;
  if (typeof record.id !== "string") {
    return null;
  }

  if (typeof record.type === "string") {
    const normalizedProps = normalizeBoundValuesDeep(record.props as Record<string, unknown> | undefined) as
      | Record<string, unknown>
      | undefined;
    if (normalizedProps) {
      if (normalizedProps.action && !normalizedProps.onPress && record.type === "Button") {
        normalizedProps.onPress = normalizeAction(normalizedProps.action);
        delete normalizedProps.action;
      }
      if (
        normalizedProps.action &&
        !normalizedProps.onChange &&
        (record.type === "Input" || record.type === "TextField" || record.type === "DateTimeInput")
      ) {
        normalizedProps.onChange = normalizeAction(normalizedProps.action);
        delete normalizedProps.action;
      }
      if (normalizedProps.action && !normalizedProps.onChange && (record.type === "Checkbox" || record.type === "CheckBox")) {
        normalizedProps.onChange = normalizeAction(normalizedProps.action);
        delete normalizedProps.action;
      }
    }

    return {
      id: record.id,
      type: record.type,
      props: normalizedProps,
      children: normalizeChildren(record.children as ComponentDef["children"] | undefined)
    };
  }

  if (record.component && typeof record.component === "object") {
    const [type, props] = extractComponentType(record.component as Record<string, unknown>);
    if (!type) {
      return null;
    }
    const { normalizedType, normalizedProps, children } = normalizeComponentShape(type, props);
    if (!normalizedType) {
      return null;
    }
    return {
      id: record.id,
      type: normalizedType,
      props: normalizedProps,
      children
    };
  }

  return null;
}

function extractComponentType(componentObject: Record<string, unknown>): [string | null, Record<string, unknown>] {
  if (typeof componentObject.type === "string") {
    return [componentObject.type, (componentObject.props as Record<string, unknown>) ?? {}];
  }

  const entries = Object.entries(componentObject);
  if (entries.length === 1) {
    const [type, props] = entries[0];
    return [type, (props as Record<string, unknown>) ?? {}];
  }

  const candidate = entries.find(([key, value]) => typeof key === "string" && typeof value === "object");
  if (candidate) {
    return [candidate[0], (candidate[1] as Record<string, unknown>) ?? {}];
  }

  return [null, {}];
}

function normalizeComponentShape(type: string, props: Record<string, unknown>) {
  const nextProps = normalizeBoundValuesDeep({ ...(props ?? {}) }) as Record<string, unknown>;
  let children = undefined as ComponentDef["children"] | undefined;

  if (nextProps.children) {
    children = normalizeChildren(nextProps.children as ComponentDef["children"]);
    delete nextProps.children;
  }

  if (nextProps.child) {
    children = normalizeChildren({ explicitList: [nextProps.child as string] });
    delete nextProps.child;
  }

  if (nextProps.action && !nextProps.onPress && type === "Button") {
    nextProps.onPress = normalizeAction(nextProps.action);
    delete nextProps.action;
  }

  if (nextProps.action && !nextProps.onChange && (type === "Input" || type === "TextField" || type === "DateTimeInput")) {
    nextProps.onChange = normalizeAction(nextProps.action);
    delete nextProps.action;
  }

  if (nextProps.action && !nextProps.onChange && (type === "Checkbox" || type === "CheckBox")) {
    nextProps.onChange = normalizeAction(nextProps.action);
    delete nextProps.action;
  }

  if (type === "Text" && nextProps.usageHint && nextProps.bold === undefined) {
    const hint = String(nextProps.usageHint).toLowerCase();
    if (hint === "h1" || hint === "h2" || hint === "h3") {
      nextProps.bold = true;
    }
  }

  if (type === "Row" || type === "Column") {
    const direction = type === "Row" ? "row" : "column";
    const alignItems = mapAlignment(nextProps.alignment as string | undefined);
    const justifyContent = mapDistribution(nextProps.distribution as string | undefined);
    return {
      normalizedType: "Box",
      normalizedProps: {
        ...nextProps,
        direction,
        alignItems,
        justifyContent
      },
      children
    };
  }

  if (type === "Card") {
    return {
      normalizedType: "Box",
      normalizedProps: {
        direction: "column",
        borderStyle: "round",
        padding: 1,
        ...nextProps
      },
      children
    };
  }

  if (type === "Divider") {
    return {
      normalizedType: "Divider",
      normalizedProps: nextProps,
      children: undefined
    };
  }

  if (type === "Icon") {
    return {
      normalizedType: "Text",
      normalizedProps: {
        text: resolveIconText(nextProps.name)
      },
      children: undefined
    };
  }

  if (type === "Image") {
    return {
      normalizedType: "Image",
      normalizedProps: nextProps,
      children: undefined
    };
  }

  if (type === "TextField") {
    const textValue = nextProps.value ?? nextProps.text;
    return {
      normalizedType: "TextField",
      normalizedProps: {
        label: nextProps.label,
        value: textValue,
        placeholder: nextProps.placeholder ?? resolveLiteralString(nextProps.label),
        onChange: nextProps.onChange ?? normalizeAction(nextProps.action)
      },
      children: undefined
    };
  }

  if (type === "CheckBox") {
    return {
      normalizedType: "Checkbox",
      normalizedProps: {
        label: nextProps.label,
        checked: nextProps.checked ?? nextProps.value,
        onChange: nextProps.onChange ?? normalizeAction(nextProps.action)
      },
      children: undefined
    };
  }

  if (type === "MultipleChoice") {
    return {
      normalizedType: "MultipleChoice",
      normalizedProps: {
        label: nextProps.label,
        items: normalizeMultipleChoiceOptions(nextProps.options ?? []),
        onSelect: normalizeAction(nextProps.action)
      },
      children: undefined
    };
  }

  if (type === "Slider") {
    return {
      normalizedType: "Slider",
      normalizedProps: {
        label: nextProps.label,
        min: nextProps.min ?? nextProps.minValue,
        max: nextProps.max ?? nextProps.maxValue,
        step: nextProps.step,
        value: nextProps.value,
        onChange: nextProps.onChange ?? normalizeAction(nextProps.action)
      },
      children: undefined
    };
  }

  if (type === "Tabs") {
    const tabItems = Array.isArray(nextProps.tabItems) ? nextProps.tabItems : [];
    const tabLabels = tabItems.map((item) => resolveLiteralString((item as Record<string, unknown>)?.title) ?? "Tab");
    if (!children && tabItems.length) {
      const childIds = tabItems
        .map((item) => (item as Record<string, unknown>)?.child)
        .filter((entry): entry is string => typeof entry === "string");
      if (childIds.length) {
        children = { explicitList: childIds };
      }
    }
    return {
      normalizedType: "Tabs",
      normalizedProps: {
        tabs: tabLabels,
        selectedIndex: nextProps.selectedIndex ?? 0,
        onChange: nextProps.onChange ?? normalizeAction(nextProps.action)
      },
      children
    };
  }

  if (type === "DateTimeInput") {
    return {
      normalizedType: "DateTimeInput",
      normalizedProps: {
        label: nextProps.label,
        value: nextProps.value ?? nextProps.text,
        placeholder: nextProps.placeholder ?? resolveLiteralString(nextProps.label),
        onChange: nextProps.onChange ?? normalizeAction(nextProps.action),
        onSubmit: nextProps.onSubmit
      },
      children: undefined
    };
  }

  if (type === "Modal") {
    return {
      normalizedType: "Modal",
      normalizedProps: nextProps,
      children
    };
  }


  return {
    normalizedType: type,
    normalizedProps: nextProps,
    children
  };
}

function normalizeChildren(children: ComponentDef["children"] | undefined): ComponentDef["children"] | undefined {
  if (!children || typeof children !== "object") return children;
  const record = children as Record<string, unknown>;
  if (Array.isArray(record.explicitList)) {
    return { explicitList: record.explicitList as string[] };
  }
  if (record.template && typeof record.template === "object") {
    const template = record.template as Record<string, unknown>;
    const dataBinding = template.dataBinding;
    return {
      template: {
        componentId: template.componentId as string,
        dataBinding: typeof dataBinding === "string" ? dataBinding : (dataBinding as Record<string, unknown>)
      }
    };
  }
  return children;
}

function normalizeAction(action: unknown): ActionDef | undefined {
  if (!action || typeof action !== "object") return undefined;
  const record = action as Record<string, unknown>;
  if (record.actionId && typeof record.actionId === "string") {
    return { actionId: record.actionId, context: record.context as Record<string, unknown> };
  }
  if (record.name && typeof record.name === "string") {
    return {
      actionId: record.name,
      context: normalizeActionContext(record.context)
    };
  }
  return undefined;
}

function normalizeActionContext(context: unknown): Record<string, unknown> | undefined {
  if (!context) return undefined;
  if (Array.isArray(context)) {
    const result: Record<string, unknown> = {};
    context.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const record = entry as Record<string, unknown>;
      if (!record.key) return;
      result[String(record.key)] = record.value ?? record.literal ?? record;
    });
    return result;
  }
  if (typeof context === "object") {
    return context as Record<string, unknown>;
  }
  return undefined;
}

function normalizeBoundValuesDeep(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return value as Record<string, unknown> | undefined;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeBoundValuesDeep(item)) as unknown as Record<string, unknown>;
  }
  if (isBoundValueLike(value)) {
    return value as Record<string, unknown>;
  }
  const result: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    result[key] = normalizeBoundValuesDeep(entry);
  });
  return result;
}

function resolveLiteralString(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.literalString === "string") {
    return record.literalString;
  }
  return undefined;
}

function normalizeMultipleChoiceOptions(options: unknown): unknown {
  if (!Array.isArray(options)) {
    return options;
  }
  return options.map((option) => {
    if (!option || typeof option !== "object") {
      return option;
    }
    const record = option as Record<string, unknown>;
    const label = resolveLiteralString(record.label) ?? record.label;
    return {
      ...record,
      label
    };
  });
}

function resolveIconText(nameBinding: unknown): { literalString?: string; path?: string } {
  const map: Record<string, string> = {
    flight: "✈",
    airplane: "✈",
    plane: "✈",
    calendar: "📅",
    time: "⏰",
    favorite: "★",
    star: "★"
  };

  if (!nameBinding || typeof nameBinding !== "object") {
    return { literalString: "•" };
  }

  const record = nameBinding as Record<string, unknown>;
  if (typeof record.literalString === "string") {
    const key = record.literalString.toLowerCase();
    return { literalString: map[key] ?? record.literalString };
  }

  if (typeof record.path === "string") {
    return { path: record.path };
  }

  return { literalString: "•" };
}

function mapAlignment(alignment?: string): "flex-start" | "flex-end" | "center" | "stretch" | undefined {
  if (!alignment) return undefined;
  const normalized = alignment.toLowerCase();
  switch (normalized) {
    case "start":
    case "flexstart":
    case "flex-start":
      return "flex-start";
    case "end":
    case "flexend":
    case "flex-end":
      return "flex-end";
    case "center":
      return "center";
    case "stretch":
      return "stretch";
    default:
      return undefined;
  }
}

function mapDistribution(distribution?: string):
  | "flex-start"
  | "flex-end"
  | "center"
  | "space-between"
  | "space-around"
  | undefined {
  if (!distribution) return undefined;
  const normalized = distribution.toLowerCase();
  switch (normalized) {
    case "spacebetween":
    case "space-between":
      return "space-between";
    case "spacearound":
    case "space-around":
      return "space-around";
    case "center":
      return "center";
    case "start":
    case "flexstart":
    case "flex-start":
      return "flex-start";
    case "end":
    case "flexend":
    case "flex-end":
      return "flex-end";
    default:
      return undefined;
  }
}

function applyDataModelUpdate(
  existing: Record<string, unknown>,
  path: string | undefined,
  contents: DataModelEntry[]
): Record<string, unknown> {
  const next = { ...(existing ?? {}) };
  const updatedValue = buildValueFromContents(contents);
  const parts = normalizePath(path);

  if (!parts.length) {
    if (isPlainObject(updatedValue)) {
      return { ...next, ...updatedValue };
    }
    return (updatedValue as Record<string, unknown>) ?? next;
  }

  let cursor: Record<string, unknown> = next;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = updatedValue;
  return next;
}

function normalizePath(path?: string): string[] {
  if (!path || path === "/") {
    return [];
  }
  const trimmed = String(path).replace(/^\/+/, "");
  if (!trimmed) {
    return [];
  }
  return trimmed.split("/").filter(Boolean);
}

function buildValueFromContents(contents: DataModelEntry[] | unknown): unknown {
  if (!Array.isArray(contents)) {
    return contents;
  }
  const result: Record<string, unknown> = {};
  contents.forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      return;
    }
    result[entry.key] = extractTypedValue(entry);
  });
  return result;
}

function extractTypedValue(entry: DataModelEntry): unknown {
  if ("valueString" in entry) return entry.valueString;
  if ("valueNumber" in entry) return entry.valueNumber;
  if ("valueBoolean" in entry) return entry.valueBoolean;
  if ("valueNull" in entry) return null;
  if ("valueMap" in entry) return buildValueFromContents(entry.valueMap ?? []);
  if ("valueArray" in entry) return normalizeValueArray(entry.valueArray ?? []);
  if ("value" in entry) return entry.value;
  return undefined;
}

function normalizeValueArray(valueArray: Array<DataModelEntry | unknown>): unknown[] {
  return valueArray.map((item) => {
    if (item && typeof item === "object" && "key" in (item as Record<string, unknown>)) {
      return extractTypedValue(item as DataModelEntry);
    }
    if (item && typeof item === "object" && ("valueString" in (item as Record<string, unknown>) || "valueNumber" in (item as Record<string, unknown>) || "valueBoolean" in (item as Record<string, unknown>) || "valueMap" in (item as Record<string, unknown>) || "valueArray" in (item as Record<string, unknown>) || "valueNull" in (item as Record<string, unknown>))) {
      return extractTypedValue(item as DataModelEntry);
    }
    return item as unknown;
  });
}
