import React from "react";
import { Box, render, Text, useInput, useStdout } from "ink";
import type { Key } from "ink";
import type { ActionDef, A2uiServerMessage, A2uiUserAction, ComponentDef, RendererOptions, ResolvedNode } from "./types.js";
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
          (acc: Record<string, ComponentDef>, component: ComponentDef) => {
          acc[component.id] = component;
          return acc;
          },
          {}
        );
        renderSurfaces();
        break;
      }
      case "dataModelUpdate": {
        const surface = ensureSurface(message.surfaceId);
        surface.dataModel = mergeDataModel(surface.dataModel, message.dataModel);
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
  onUserAction?: (action: A2uiUserAction) => void;
}> = ({ surfaceId, tree, onUserAction }) => {
  const dispatchAction = (action: ActionDef, node: ResolvedNode, value?: unknown) => {
    const context = {
      ...(action.context ?? {}),
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
