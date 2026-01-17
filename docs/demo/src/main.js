import "./styles.css";
import "xterm/css/xterm.css";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { PassThrough } from "stream";
import { createA2uiInkRenderer } from "../../../src/index.ts";

window.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll(".section");
  const jsonEditor = document.getElementById("jsonEditor");
  const renderBtn = document.getElementById("renderBtn");
  const loadExampleBtn = document.getElementById("loadExample");
  const clearTerminalBtn = document.getElementById("clearTerminal");
  const actionsLog = document.getElementById("actionsLog");
  const terminalContainer = document.getElementById("terminal");

  let term = null;
  let fitAddon = null;
  let renderer = null;
  let stdout = null;
  let stderr = null;
  let stdin = null;
  let currentSurfaceId = "demo";

  setupNavigation();
  setupTerminal();
  setupPlayground();

  if (window.location.hash) {
    navigateToSection(window.location.hash.slice(1));
  }

  function setupNavigation() {
    navLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const sectionId = link.dataset.section;
        navigateToSection(sectionId);
        window.history.pushState(null, "", `#${sectionId}`);
      });
    });

    window.addEventListener("popstate", () => {
      if (window.location.hash) {
        navigateToSection(window.location.hash.slice(1));
      }
    });
  }

  function navigateToSection(sectionId) {
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.section === sectionId);
    });

    sections.forEach((section) => {
      section.classList.toggle("active", section.id === sectionId);
    });

    window.scrollTo(0, 0);

    if (sectionId === "playground" && fitAddon) {
      setTimeout(() => fitAddon.fit(), 100);
    }
  }

  function setupTerminal() {
    if (!terminalContainer) return;

    term = new Terminal({
      theme: {
        background: "#000000",
        foreground: "#eaeaea",
        cursor: "#00d9ff",
        cursorAccent: "#000000",
        selection: "rgba(0, 217, 255, 0.3)",
        black: "#000000",
        red: "#ff4757",
        green: "#00ff88",
        yellow: "#ffd700",
        blue: "#00d9ff",
        magenta: "#7b2cbf",
        cyan: "#00d9ff",
        white: "#eaeaea",
        brightBlack: "#6c757d",
        brightRed: "#ff6b81",
        brightGreen: "#00ff88",
        brightYellow: "#ffd700",
        brightBlue: "#00d9ff",
        brightMagenta: "#a855f7",
        brightCyan: "#00d9ff",
        brightWhite: "#ffffff"
      },
      fontFamily: '"Fira Code", "Consolas", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback: 2000,
      convertEol: true
    });

    fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalContainer);

    setTimeout(() => {
      fitAddon.fit();
      connectInkRenderer();
      renderJSON();
    }, 50);

    window.addEventListener("resize", () => {
      if (fitAddon) {
        fitAddon.fit();
      }
    });

    terminalContainer.addEventListener("click", () => {
      term.focus();
    });
  }

  function connectInkRenderer() {
    if (!term) return;

    stdout = new PassThrough();
    stderr = new PassThrough();
    stdin = new PassThrough();

    stdout.isTTY = true;
    stderr.isTTY = true;
    stdin.isTTY = true;

    stdout.columns = term.cols;
    stdout.rows = term.rows;
    stderr.columns = term.cols;
    stderr.rows = term.rows;

    stdin.setRawMode = () => {};
    stdin.resume = () => {};
    stdin.pause = () => {};

    stdout.on("data", (chunk) => {
      term.write(chunk.toString());
    });

    stderr.on("data", (chunk) => {
      term.write(`\x1b[31m${chunk.toString()}\x1b[0m`);
    });

    term.onData((data) => {
      stdin.write(data);
    });

    term.onResize(({ cols, rows }) => {
      stdout.columns = cols;
      stdout.rows = rows;
      stderr.columns = cols;
      stderr.rows = rows;
      stdout.emit("resize");
      stderr.emit("resize");
      stdin.emit("resize");
    });

    renderer = createA2uiInkRenderer({
      stdout,
      stderr,
      stdin,
      exitOnCtrlC: false,
      onUserAction: (action) => {
        logAction(action.type, action.componentId, action);
      }
    });
  }

  function setupPlayground() {
    if (renderBtn) {
      renderBtn.addEventListener("click", renderJSON);
    }

    if (loadExampleBtn) {
      loadExampleBtn.addEventListener("click", () => {
        loadExample();
        renderJSON();
      });
    }

    if (clearTerminalBtn) {
      clearTerminalBtn.addEventListener("click", () => {
        if (term) {
          term.clear();
        }
      });
    }

    if (jsonEditor) {
      jsonEditor.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          renderJSON();
        }
      });
    }
  }

  function renderJSON() {
    if (!renderer || !jsonEditor) return;

    const rawInput = jsonEditor.value;
    const parsed = parseInput(rawInput);
    if (!parsed.ok) {
      writeError(parsed.error);
      return;
    }

    const normalized = normalizeInput(parsed.value);
    if (!normalized.ok) {
      writeError(normalized.error);
      return;
    }

    const { surfaceId, rootComponentId, catalogId, components, dataModel } = normalized.value;

    if (!components.length) {
      writeError("No components found. Provide a surfaceUpdate or a components array.");
      return;
    }

    currentSurfaceId = surfaceId;

    renderer.handleMessage({
      type: "surfaceUpdate",
      surfaceId: currentSurfaceId,
      rootComponentId,
      components
    });

    renderer.handleMessage({
      type: "dataModelUpdate",
      surfaceId: currentSurfaceId,
      dataModel
    });

    renderer.handleMessage({
      type: "beginRendering",
      surfaceId: currentSurfaceId,
      catalogId
    });
  }

  function parseInput(rawInput) {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      return { ok: false, error: "Input is empty." };
    }

    try {
      return { ok: true, value: JSON.parse(trimmed) };
    } catch (error) {
      const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (!lines.length) {
        return { ok: false, error: "Input is empty." };
      }
      try {
        const messages = lines.map((line) => JSON.parse(line));
        return { ok: true, value: messages };
      } catch (jsonlError) {
        return { ok: false, error: `Invalid JSON or JSONL: ${error.message}` };
      }
    }
  }

  function normalizeInput(input) {
    if (Array.isArray(input)) {
      return normalizeMessages(input);
    }

    if (hasA2uiEnvelope(input)) {
      return normalizeMessages([input]);
    }

    if (input && input.components && Array.isArray(input.components)) {
      const components = applyComponentFixups(normalizeComponents(input.components));
      return {
        ok: true,
        value: {
          surfaceId: input.surfaceId || "demo",
          rootComponentId: input.rootComponentId || "root",
          catalogId: input.catalogId,
          components,
          dataModel: input.dataModel || {}
        }
      };
    }

    return {
      ok: false,
      error: "Unsupported input. Provide a components array, A2UI JSONL, or A2UI message object."
    };
  }

  function hasA2uiEnvelope(input) {
    if (!input || typeof input !== "object") return false;
    return (
      "surfaceUpdate" in input ||
      "dataModelUpdate" in input ||
      "beginRendering" in input ||
      input.type === "surfaceUpdate" ||
      input.type === "dataModelUpdate" ||
      input.type === "beginRendering"
    );
  }

  function normalizeMessages(messages) {
    let surfaceId = "demo";
    let rootComponentId = "root";
    let catalogId;
    const components = [];
    let dataModel = {};

    for (const message of messages) {
      if (!message || typeof message !== "object") {
        continue;
      }

      if (message.surfaceUpdate || message.type === "surfaceUpdate") {
        const payload = message.surfaceUpdate ?? message;
        if (payload.surfaceId) {
          surfaceId = payload.surfaceId;
        }
        if (Array.isArray(payload.components)) {
          components.push(...normalizeComponents(payload.components));
        }
      }

      if (message.dataModelUpdate || message.type === "dataModelUpdate") {
        const payload = message.dataModelUpdate ?? message;
        if (payload.surfaceId) {
          surfaceId = payload.surfaceId;
        }
        if (payload.dataModel && typeof payload.dataModel === "object") {
          dataModel = { ...dataModel, ...payload.dataModel };
        } else if (payload.contents) {
          dataModel = applyDataModelUpdate(dataModel, payload.path, payload.contents);
        }
      }

      if (message.beginRendering || message.type === "beginRendering") {
        const payload = message.beginRendering ?? message;
        if (payload.surfaceId) {
          surfaceId = payload.surfaceId;
        }
        rootComponentId = payload.rootComponentId || payload.root || rootComponentId;
        catalogId = payload.catalogId ?? catalogId;
      }
    }

    return {
      ok: true,
      value: {
        surfaceId,
        rootComponentId,
        catalogId,
        components: applyComponentFixups(components),
        dataModel
      }
    };
  }

  function normalizeComponents(componentList) {
    return componentList
      .map((component) => normalizeComponent(component))
      .filter(Boolean);
  }

  function normalizeComponent(component) {
    if (!component || typeof component !== "object" || !component.id) {
      return null;
    }

    if (component.type) {
      return {
        ...component,
        props: normalizeBoundValuesDeep(component.props ?? {}),
        children: normalizeChildren(component.children)
      };
    }

    if (component.component && typeof component.component === "object") {
      const [type, props] = extractComponentType(component.component);
      if (!type) {
        return null;
      }
      const { normalizedType, normalizedProps, children } = normalizeComponentShape(type, props);
      if (!normalizedType) {
        return null;
      }
      return {
        id: component.id,
        type: normalizedType,
        props: normalizedProps,
        children
      };
    }

    return null;
  }

  function extractComponentType(componentObject) {
    const entries = Object.entries(componentObject);
    if (!entries.length) {
      return [null, null];
    }
    const [type, props] = entries[0];
    return [type, props ?? {}];
  }

  function normalizeComponentShape(type, props) {
    const nextProps = normalizeBoundValuesDeep({ ...(props ?? {}) });
    let children = undefined;

    if (nextProps.children) {
      children = normalizeChildren(nextProps.children);
      delete nextProps.children;
    }

    if (nextProps.child) {
      children = normalizeChildren({ explicitList: [nextProps.child] });
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
      if (hint === "body" || hint === "caption") {
        nextProps.bold = false;
      }
    }

    if (type === "Row" || type === "Column") {
      const direction = type === "Row" ? "row" : "column";
      const alignItems = mapAlignment(nextProps.alignment);
      const justifyContent = mapDistribution(nextProps.distribution);
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

    if (type === "List") {
      return {
        normalizedType: "Box",
        normalizedProps: {
          direction: "column",
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
      const labelText = resolveLiteralString(nextProps.label);
      const textValue = nextProps.value ?? nextProps.text;
      return {
        normalizedType: "TextField",
        normalizedProps: {
          label: nextProps.label,
          value: textValue,
          placeholder: nextProps.placeholder ?? labelText,
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
          checked: nextProps.checked,
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
          min: nextProps.min,
          max: nextProps.max,
          step: nextProps.step,
          value: nextProps.value,
          onChange: nextProps.onChange ?? normalizeAction(nextProps.action)
        },
        children: undefined
      };
    }

    if (type === "DateTimeInput") {
      const labelText = resolveLiteralString(nextProps.label);
      const textValue = nextProps.value ?? nextProps.text;
      return {
        normalizedType: "DateTimeInput",
        normalizedProps: {
          label: nextProps.label,
          value: textValue,
          placeholder: nextProps.placeholder ?? labelText,
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

  function normalizeChildren(children) {
    if (!children || typeof children !== "object") return children;
    if (children.explicitList && Array.isArray(children.explicitList)) {
      return { explicitList: children.explicitList };
    }
    if (children.template) {
      const binding = normalizeTemplateBinding(children.template.dataBinding);
      return {
        template: {
          componentId: children.template.componentId,
          dataBinding: binding
        }
      };
    }
    return children;
  }

  function normalizeTemplateBinding(binding) {
    if (typeof binding === "string") {
      return { path: normalizePathString(binding) };
    }
    return normalizeBoundValuesDeep(binding);
  }

  function normalizeAction(action) {
    if (!action || typeof action !== "object") return action;
    if (action.actionId) return action;
    if (!action.name) return action;
    return {
      actionId: action.name,
      context: normalizeActionContext(action.context)
    };
  }

  function normalizeActionContext(context) {
    if (!context) return undefined;
    if (Array.isArray(context)) {
      const result = {};
      context.forEach((entry) => {
        if (!entry || typeof entry !== "object" || !entry.key) {
          return;
        }
        result[entry.key] = normalizeBoundValuesDeep(entry.value ?? entry.literal ?? entry);
      });
      return result;
    }
    if (typeof context === "object") {
      return normalizeBoundValuesDeep(context);
    }
    return context;
  }

  function resolveLiteralString(value) {
    if (!value || typeof value !== "object") {
      return undefined;
    }
    if ("literalString" in value) {
      return value.literalString;
    }
    return undefined;
  }

  function normalizeBoundValuesDeep(value) {
    if (Array.isArray(value)) {
      return value.map((item) => normalizeBoundValuesDeep(item));
    }
    if (!value || typeof value !== "object") {
      return value;
    }

    if (isBoundValueLike(value)) {
      const next = { ...value };
      if (typeof next.path === "string") {
        next.path = normalizePathString(next.path);
      }
      return next;
    }

    const result = {};
    Object.entries(value).forEach(([key, entry]) => {
      result[key] = normalizeBoundValuesDeep(entry);
    });
    return result;
  }

  function isBoundValueLike(value) {
    if (!value || typeof value !== "object") return false;
    return (
      "path" in value ||
      "literalString" in value ||
      "literalNumber" in value ||
      "literalBoolean" in value ||
      "literalObject" in value ||
      "literalArray" in value
    );
  }

  function normalizePathString(path) {
    const trimmed = String(path).trim();
    if (!trimmed || trimmed === "/") return "";
    const withoutPrefix = trimmed.replace(/^\$\.?/, "");
    if (withoutPrefix.startsWith("/")) {
      return withoutPrefix.replace(/^\/+/, "").replace(/\//g, ".");
    }
    return withoutPrefix;
  }

  function normalizeMultipleChoiceOptions(options) {
    if (!Array.isArray(options)) {
      return options;
    }
    return options.map((option) => {
      if (!option || typeof option !== "object") {
        return option;
      }
      const label = resolveLiteralString(option.label) ?? option.label;
      return {
        ...option,
        label
      };
    });
  }

  function applyComponentFixups(componentList) {
    const map = new Map(componentList.map((component) => [component.id, component]));
    componentList.forEach((component) => {
      if (component.type !== "Button") return;
      if (component.props?.label || component.props?.text) return;
      const childId = component.children?.explicitList?.[0];
      if (!childId) return;
      const child = map.get(childId);
      if (!child || child.type !== "Text" || !child.props?.text) return;
      component.props = { ...component.props, label: child.props.text };
    });
    return componentList;
  }

  function resolveIconText(nameBinding) {
    const map = {
      flight: "✈",
      airplane: "✈",
      plane: "✈",
      calendar: "📅",
      time: "⏰"
    };

    if (!nameBinding || typeof nameBinding !== "object") {
      return { literalString: "•" };
    }

    if (nameBinding.literalString) {
      const key = String(nameBinding.literalString).toLowerCase();
      return { literalString: map[key] ?? nameBinding.literalString };
    }

    if (nameBinding.path) {
      return { path: nameBinding.path };
    }

    return { literalString: "•" };
  }

  function mapAlignment(alignment) {
    if (!alignment) return undefined;
    const normalized = String(alignment).toLowerCase();
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

  function mapDistribution(distribution) {
    if (!distribution) return undefined;
    const normalized = String(distribution).toLowerCase();
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

  function applyDataModelUpdate(existing, path, contents) {
    const next = { ...(existing ?? {}) };
    const updatedValue = buildValueFromContents(contents);
    const parts = normalizePath(path);

    if (!parts.length) {
      if (updatedValue && typeof updatedValue === "object" && !Array.isArray(updatedValue)) {
        return { ...next, ...updatedValue };
      }
      return updatedValue ?? next;
    }

    let cursor = next;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      if (!cursor[key] || typeof cursor[key] !== "object") {
        cursor[key] = {};
      }
      cursor = cursor[key];
    }
    cursor[parts[parts.length - 1]] = updatedValue;
    return next;
  }

  function normalizePath(path) {
    if (!path || path === "/") {
      return [];
    }
    const trimmed = String(path).replace(/^\/+/, "");
    if (!trimmed) {
      return [];
    }
    return trimmed.split("/").filter(Boolean);
  }

  function buildValueFromContents(contents) {
    if (!Array.isArray(contents)) {
      return contents;
    }
    const result = {};
    contents.forEach((entry) => {
      if (!entry || typeof entry !== "object") {
        return;
      }
      if (!("key" in entry)) {
        return;
      }
      result[entry.key] = extractTypedValue(entry);
    });
    return result;
  }

  function extractTypedValue(entry) {
    if ("valueString" in entry) return entry.valueString;
    if ("valueNumber" in entry) return entry.valueNumber;
    if ("valueBoolean" in entry) return entry.valueBoolean;
    if ("valueNull" in entry) return null;
    if ("valueMap" in entry) return buildValueFromContents(entry.valueMap);
    if ("valueArray" in entry) return normalizeValueArray(entry.valueArray);
    if ("value" in entry) return entry.value;
    return undefined;
  }

  function normalizeValueArray(valueArray) {
    if (!Array.isArray(valueArray)) {
      return valueArray;
    }
    return valueArray.map((item) => {
      if (item && typeof item === "object" && ("valueString" in item || "valueNumber" in item || "valueBoolean" in item || "valueMap" in item || "valueArray" in item || "valueNull" in item)) {
        return extractTypedValue(item);
      }
      if (item && typeof item === "object" && "key" in item) {
        return extractTypedValue(item);
      }
      return item;
    });
  }

  function writeError(message) {
    if (!term) return;
    term.write("\x1b[31m" + message + "\x1b[0m\r\n");
  }

  function logAction(type, componentId, data = {}) {
    if (!actionsLog) return;

    const placeholder = actionsLog.querySelector(".placeholder");
    if (placeholder) placeholder.remove();

    const entry = document.createElement("div");
    entry.className = "action-entry";
    entry.innerHTML = `
      <span class="action-type">${type}</span> →
      <span class="action-component">${componentId}</span>
      ${Object.keys(data).length ? ` <code>${JSON.stringify(data)}</code>` : ""}
    `;
    actionsLog.appendChild(entry);
    actionsLog.scrollTop = actionsLog.scrollHeight;
  }

  function loadExample() {
    const example = {
      surfaceId: "demo",
      rootComponentId: "root",
      components: [
        {
          id: "root",
          type: "Box",
          props: {
            direction: "column",
            padding: 1,
            borderStyle: "round"
          },
          children: {
            explicitList: ["title", "spacer1", "inputSection", "spacer2", "statusSection", "submit"]
          }
        },
        {
          id: "title",
          type: "Text",
          props: {
            text: { path: "title" },
            bold: true
          }
        },
        { id: "spacer1", type: "Spacer" },
        {
          id: "inputSection",
          type: "Box",
          props: { direction: "column", borderStyle: "single", paddingX: 1 },
          children: { explicitList: ["nameLabel", "nameInput", "checkbox"] }
        },
        {
          id: "nameLabel",
          type: "Text",
          props: { text: { literalString: "Enter your name:" } }
        },
        {
          id: "nameInput",
          type: "Input",
          props: {
            value: { path: "form.name" },
            placeholder: "Your name here",
            onChange: { actionId: "nameChange" },
            onSubmit: { actionId: "nameSubmit" }
          }
        },
        {
          id: "checkbox",
          type: "Checkbox",
          props: {
            label: "Subscribe to newsletter",
            checked: { path: "form.subscribe" },
            onChange: { actionId: "toggleSubscribe" }
          }
        },
        { id: "spacer2", type: "Spacer" },
        {
          id: "statusSection",
          type: "Box",
          props: { direction: "column", borderStyle: "single", paddingX: 1 },
          children: { explicitList: ["statusLabel", "statusTable"] }
        },
        {
          id: "statusLabel",
          type: "Text",
          props: { text: { literalString: "System Status:" } }
        },
        {
          id: "statusTable",
          type: "Table",
          props: {
            columns: { path: "status.columns" },
            rows: { path: "status.rows" }
          }
        },
        { id: "submit", type: "Button", props: { label: { literalString: "Submit" }, onPress: { actionId: "submit" } } }
      ],
      dataModel: {
        title: "A2UI Demo Form",
        form: {
          name: "John Doe",
          subscribe: true
        },
        status: {
          columns: [
            { key: "service", header: "Service" },
            { key: "status", header: "Status" }
          ],
          rows: [
            { service: "API", status: "Online" },
            { service: "Database", status: "Online" },
            { service: "Cache", status: "Warning" }
          ]
        }
      }
    };

    jsonEditor.value = JSON.stringify(example, null, 2);
  }
});
