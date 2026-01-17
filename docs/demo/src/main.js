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

    let json;
    try {
      json = JSON.parse(jsonEditor.value);
    } catch (error) {
      writeError(`Invalid JSON: ${error.message}`);
      return;
    }

    if (!json.components || !Array.isArray(json.components)) {
      writeError("JSON must include a components array.");
      return;
    }

    currentSurfaceId = json.surfaceId || "demo";

    renderer.handleMessage({
      type: "surfaceUpdate",
      surfaceId: currentSurfaceId,
      rootComponentId: json.rootComponentId || "root",
      components: json.components
    });

    renderer.handleMessage({
      type: "dataModelUpdate",
      surfaceId: currentSurfaceId,
      dataModel: json.dataModel || {}
    });

    renderer.handleMessage({
      type: "beginRendering",
      surfaceId: currentSurfaceId,
      catalogId: json.catalogId
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
