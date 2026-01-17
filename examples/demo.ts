import { createA2uiInkRenderer } from "../src/index.js";
import { inspect } from "node:util";

process.on("uncaughtException", (error) => {
  process.stderr.write(`\nUncaught exception: ${error instanceof Error ? error.stack : JSON.stringify(error)}\n`);
});

process.on("unhandledRejection", (reason) => {
  process.stderr.write(`\nUnhandled rejection: ${reason instanceof Error ? reason.stack : JSON.stringify(reason)}\n`);
});

const renderer = createA2uiInkRenderer({
  onUserAction: (action) => {
    process.stderr.write(`\nUser action: ${JSON.stringify(action)}\n`);
  }
});

const surfaceId = "main";

const safeHandleMessage = (message: Parameters<typeof renderer.handleMessage>[0]) => {
  try {
    renderer.handleMessage(message);
  } catch (error) {
    process.stderr.write(`\nRenderer error: ${inspect(error, { depth: 5 })}\n`);
    process.stderr.write(`stdout.isTTY=${process.stdout?.isTTY} stderr.isTTY=${process.stderr?.isTTY}\n`);
    throw error;
  }
};

safeHandleMessage({
  type: "surfaceUpdate",
  surfaceId,
  rootComponentId: "root",
  components: [
    {
      id: "root",
      type: "Box",
      props: { direction: "column", padding: 1, borderStyle: "round" },
      children: {
        explicitList: [
          "title",
          "rootSpacer1",
          "inputSection",
          "rootSpacer2",
          "choiceSection",
          "rootSpacer3",
          "contentSection",
          "rootSpacer4",
          "submit"
        ]
      }
    },
    {
      id: "title",
      type: "Text",
      props: { text: { path: "title" }, bold: true }
    },
    {
      id: "rootSpacer1",
      type: "Spacer"
    },
    {
      id: "inputSection",
      type: "Box",
      props: { direction: "column", borderStyle: "single", paddingX: 1, paddingY: 0 },
      children: { explicitList: ["inputLabel", "nameInput"] }
    },
    {
      id: "inputLabel",
      type: "Text",
      props: { text: "Input" }
    },
    {
      id: "nameInput",
      type: "Input",
      props: {
        value: { path: "form.name", literalString: "" },
        onChange: { actionId: "nameChange" },
        onSubmit: { actionId: "nameSubmit" }
      }
    },
    {
      id: "rootSpacer2",
      type: "Spacer"
    },
    {
      id: "choiceSection",
      type: "Box",
      props: { direction: "column", borderStyle: "single", paddingX: 1, paddingY: 0 },
      children: { explicitList: ["checkbox", "radioLabel", "radioGroup", "selectLabel", "options"] }
    },
    {
      id: "checkbox",
      type: "Checkbox",
      props: {
        label: "Enable feature",
        checked: { path: "flags.enabled", literalBoolean: false },
        onChange: { actionId: "toggleFeature" }
      }
    },
    {
      id: "radioLabel",
      type: "Text",
      props: { text: "RadioGroup" }
    },
    {
      id: "radioGroup",
      type: "RadioGroup",
      props: {
        options: { path: "radioOptions" },
        selectedIndex: { path: "selectedRadio", literalNumber: 0 },
        onChange: { actionId: "radioChange" }
      }
    },
    {
      id: "selectLabel",
      type: "Text",
      props: { text: "Select" }
    },
    {
      id: "options",
      type: "Select",
      props: {
        items: { path: "options" },
        selectedIndex: { path: "selectedIndex", literalNumber: 0 },
        onSelect: { actionId: "optionSelect" }
      }
    },
    {
      id: "rootSpacer3",
      type: "Spacer"
    },
    {
      id: "contentSection",
      type: "Box",
      props: { direction: "column", borderStyle: "single", paddingX: 1, paddingY: 0 },
      children: { explicitList: ["listLabel", "simpleList", "tabsLabel", "tabs", "tableLabel", "table"] }
    },
    {
      id: "listLabel",
      type: "Text",
      props: { text: "List" }
    },
    {
      id: "simpleList",
      type: "List",
      props: {
        items: { path: "listItems" }
      }
    },
    {
      id: "tabsLabel",
      type: "Text",
      props: { text: "Tabs" }
    },
    {
      id: "tabs",
      type: "Tabs",
      props: {
        tabs: { path: "tabs" },
        selectedIndex: { path: "selectedTab", literalNumber: 0 },
        onChange: { actionId: "tabChange" }
      },
      children: {
        explicitList: ["tabPanelA", "tabPanelB", "tabPanelC"]
      }
    },
    {
      id: "tabPanelA",
      type: "Text",
      props: { text: "Panel A content" }
    },
    {
      id: "tabPanelB",
      type: "Text",
      props: { text: "Panel B content" }
    },
    {
      id: "tabPanelC",
      type: "Text",
      props: { text: "Panel C content" }
    },
    {
      id: "tableLabel",
      type: "Text",
      props: { text: "Table" }
    },
    {
      id: "table",
      type: "Table",
      props: {
        columns: { path: "table.columns" },
        rows: { path: "table.rows" }
      }
    },
    {
      id: "rootSpacer4",
      type: "Spacer"
    },
    {
      id: "submit",
      type: "Button",
      props: {
        text: "Submit",
        onPress: { actionId: "submit" }
      }
    }
  ]
});

safeHandleMessage({
  type: "dataModelUpdate",
  surfaceId,
  dataModel: {
    title: "A2UI Ink Demo",
    form: { name: "" },
    flags: { enabled: false },
    radioOptions: ["Low", "Medium", "High"],
    selectedRadio: 1,
    listItems: ["Item A", "Item B", "Item C"],
    options: ["Alpha", "Beta", "Gamma"],
    selectedIndex: 0,
    tabs: ["Tab A", "Tab B", "Tab C"],
    selectedTab: 0,
    table: {
      columns: ["Name", "Status"],
      rows: [
        ["Service A", "OK"],
        ["Service B", "Warn"],
        ["Service C", "Down"]
      ]
    }
  }
});

safeHandleMessage({
  type: "beginRendering",
  surfaceId,
  catalogId: "standard"
});
