export type A2uiServerMessage =
  | BeginRenderingMessage
  | SurfaceUpdateMessage
  | DataModelUpdateMessage
  | DeleteSurfaceMessage;

export interface BeginRenderingMessage {
  type: "beginRendering";
  surfaceId: string;
  catalogId?: string;
}

export interface SurfaceUpdateMessage {
  type: "surfaceUpdate";
  surfaceId: string;
  rootComponentId: string;
  components: Array<ComponentDef | A2uiComponentInstance>;
}

export interface DataModelUpdateMessage {
  type: "dataModelUpdate";
  surfaceId: string;
  dataModel?: Record<string, unknown>;
  path?: string;
  contents?: DataModelEntry[];
}

export interface DeleteSurfaceMessage {
  type: "deleteSurface";
  surfaceId: string;
}

export interface A2uiUserAction {
  type: "userAction";
  surfaceId: string;
  componentId: string;
  actionId: string;
  context?: Record<string, unknown>;
  value?: unknown;
}

export interface RendererOptions {
  stdout?: NodeJS.WriteStream;
  stderr?: NodeJS.WriteStream;
  stdin?: NodeJS.ReadStream;
  exitOnCtrlC?: boolean;
  patchConsole?: boolean;
  onUserAction?: (action: A2uiUserAction) => void;
}

export interface ComponentDef {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: ChildrenDef;
}

export interface A2uiComponentInstance {
  id: string;
  component: Record<string, unknown>;
}

export interface ChildrenDef {
  explicitList?: string[];
  template?: {
    componentId: string;
    dataBinding: BoundValue | string;
  };
}

export interface DataModelEntry {
  key: string;
  valueString?: string;
  valueNumber?: number;
  valueBoolean?: boolean;
  valueNull?: boolean;
  valueMap?: DataModelEntry[];
  valueArray?: Array<DataModelEntry | unknown>;
  value?: unknown;
}

export type BoundValue = {
  path?: string;
  literalString?: string;
  literalNumber?: number;
  literalBoolean?: boolean;
  literalObject?: Record<string, unknown>;
  literalArray?: unknown[];
};

export interface ActionDef {
  actionId: string;
  context?: Record<string, unknown>;
}

export interface BindingContext {
  item?: unknown;
  index?: number;
  parent?: BindingContext;
}

export interface ResolvedNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
  boundProps?: Record<string, BoundValue>;
  children: ResolvedNode[];
  instanceKey: string;
  bindingContext?: BindingContext;
}
