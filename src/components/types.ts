import type { ReactElement } from "react";
import type { ActionDef, ResolvedNode } from "../types.js";

export interface CatalogRenderOptions {
  dispatchAction: (action: ActionDef, node: ResolvedNode, value?: unknown) => void;
  updateLocalDataModel?: (path: string, value: unknown, node: ResolvedNode) => void;
  renderNode: (node: ResolvedNode) => ReactElement;
}
