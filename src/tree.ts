import type { BindingContext, ComponentDef, ResolvedNode } from "./types.js";
import { resolveBoundValue, resolvePropsWithBindings } from "./binding.js";

export function buildResolvedTree(
  components: Record<string, ComponentDef>,
  rootId: string,
  dataModel: Record<string, unknown>
): ResolvedNode | null {
  const root = components[rootId];
  if (!root) {
    return null;
  }

  return buildNode(root, components, dataModel, undefined, rootId);
}

function buildNode(
  component: ComponentDef,
  components: Record<string, ComponentDef>,
  dataModel: Record<string, unknown>,
  context: BindingContext | undefined,
  instanceKey: string
): ResolvedNode {
  const { props, boundProps } = resolvePropsWithBindings(component.props ?? {}, dataModel, context);
  const children: ResolvedNode[] = [];

  if (component.children?.explicitList) {
    for (const childId of component.children.explicitList) {
      const child = components[childId];
      if (!child) {
        continue;
      }
      children.push(buildNode(child, components, dataModel, context, childId));
    }
  }

  if (component.children?.template) {
    const template = component.children.template;
    const binding = typeof template.dataBinding === "string" ? { path: template.dataBinding } : template.dataBinding;
    const items = resolveBoundValue(binding, dataModel, context);
    if (Array.isArray(items)) {
      items.forEach((item, index) => {
        const templateComponent = components[template.componentId];
        if (!templateComponent) {
          return;
        }
        const childContext: BindingContext = { item, index, parent: context };
        const key = `${template.componentId}__${index}`;
        children.push(buildNode(templateComponent, components, dataModel, childContext, key));
      });
    }
  }

  return {
    id: component.id,
    type: component.type,
    props,
    boundProps,
    children,
    instanceKey,
    bindingContext: context
  };
}
