import React from "react";
import { Text } from "ink";
import type { ResolvedNode } from "../types.js";
import type { CatalogRenderOptions } from "./types.js";
import { A2uiText } from "./Text.js";
import { A2uiBox } from "./Box.js";
import { A2uiButton } from "./Button.js";
import { A2uiInput } from "./Input.js";
import { A2uiSelect } from "./Select.js";
import { A2uiCheckbox } from "./Checkbox.js";
import { A2uiRadioGroup } from "./RadioGroup.js";
import { A2uiList } from "./List.js";
import { A2uiTabs } from "./Tabs.js";
import { A2uiTable } from "./Table.js";
import { A2uiSlider } from "./Slider.js";
import { A2uiModal } from "./Modal.js";
import { A2uiImage } from "./Image.js";
import { A2uiDivider } from "./Divider.js";
import { A2uiSpacer } from "./Spacer.js";

export function renderNode(node: ResolvedNode, options: Omit<CatalogRenderOptions, "renderNode">): React.ReactElement {
  const optionsWithRender: CatalogRenderOptions = {
    ...options,
    renderNode: (child) => renderNode(child, options)
  };

  switch (node.type) {
    case "Text":
      return React.createElement(A2uiText, { key: node.instanceKey, node });
    case "Box":
      return React.createElement(
        A2uiBox,
        { key: node.instanceKey, node },
        node.children.map((child: ResolvedNode) => renderNode(child, options))
      );
    case "Spacer":
      return React.createElement(A2uiSpacer, { key: node.instanceKey, node });
    case "Input":
      return React.createElement(A2uiInput, { key: node.instanceKey, node, options: optionsWithRender });
    case "TextField":
      return React.createElement(A2uiInput, { key: node.instanceKey, node, options: optionsWithRender });
    case "Button":
      return React.createElement(A2uiButton, { key: node.instanceKey, node, options: optionsWithRender });
    case "Select":
      return React.createElement(A2uiSelect, { key: node.instanceKey, node, options: optionsWithRender });
    case "MultipleChoice":
      return React.createElement(A2uiSelect, { key: node.instanceKey, node, options: optionsWithRender });
    case "Checkbox":
      return React.createElement(A2uiCheckbox, { key: node.instanceKey, node, options: optionsWithRender });
    case "RadioGroup":
      return React.createElement(A2uiRadioGroup, { key: node.instanceKey, node, options: optionsWithRender });
    case "List":
      return React.createElement(A2uiList, { key: node.instanceKey, node });
    case "Tabs":
      return React.createElement(A2uiTabs, { key: node.instanceKey, node, options: optionsWithRender });
    case "Table":
      return React.createElement(A2uiTable, { key: node.instanceKey, node });
    case "Divider":
      return React.createElement(A2uiDivider, { key: node.instanceKey, node });
    case "Slider":
      return React.createElement(A2uiSlider, { key: node.instanceKey, node, options: optionsWithRender });
    case "Modal":
      return React.createElement(
        A2uiModal,
        { key: node.instanceKey, node },
        node.children.map((child: ResolvedNode) => renderNode(child, options))
      );
    case "Image":
      return React.createElement(A2uiImage, { key: node.instanceKey, node });
    default:
      return React.createElement(Text, { key: node.instanceKey, dimColor: true }, `Unsupported: ${node.type}`);
  }
}
