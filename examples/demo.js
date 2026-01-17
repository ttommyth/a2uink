import { createA2uiInkRenderer } from "../src/index.js";
const renderer = createA2uiInkRenderer({
    onUserAction: (action) => {
        process.stdout.write(`\nUser action: ${JSON.stringify(action)}\n`);
    }
});
const surfaceId = "main";
renderer.handleMessage({
    type: "surfaceUpdate",
    surfaceId,
    rootComponentId: "root",
    components: [
        {
            id: "root",
            type: "Box",
            props: { direction: "column", padding: 1, borderStyle: "round" },
            children: { explicitList: ["title", "nameInput", "options", "submit"] }
        },
        {
            id: "title",
            type: "Text",
            props: { text: { path: "title" }, bold: true }
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
            id: "options",
            type: "Select",
            props: {
                items: { path: "options" },
                selectedIndex: { path: "selectedIndex", literalNumber: 0 },
                onSelect: { actionId: "optionSelect" }
            }
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
renderer.handleMessage({
    type: "dataModelUpdate",
    surfaceId,
    dataModel: {
        title: "A2UI Ink Demo",
        form: { name: "" },
        options: ["Alpha", "Beta", "Gamma"],
        selectedIndex: 0
    }
});
renderer.handleMessage({
    type: "beginRendering",
    surfaceId,
    catalogId: "standard"
});
