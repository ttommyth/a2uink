import { useEffect, useMemo, useRef, useState } from "react";
import { Terminal, type ITheme } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { PassThrough } from "stream";
import { createA2uiInkRenderer } from "../../../src/index.ts";
import type { A2uiUserAction } from "../../../src/index.ts";
import process from "process";
import "xterm/css/xterm.css";

const navSections = [
  {
    title: "Getting Started",
    items: [
      { id: "overview", label: "Overview" },
      { id: "installation", label: "Installation" },
      { id: "quick-start", label: "Quick Start" },
      { id: "playground", label: "JSON Playground" }
    ]
  },
  {
    title: "Components",
    items: [
      { id: "text", label: "Text" },
      { id: "box", label: "Box" },
      { id: "spacer", label: "Spacer" },
      { id: "button", label: "Button" },
      { id: "input", label: "Input" },
      { id: "textfield", label: "TextField" },
      { id: "select", label: "Select" },
      { id: "multiple-choice", label: "MultipleChoice" },
      { id: "checkbox", label: "Checkbox" },
      { id: "radiogroup", label: "RadioGroup" },
      { id: "slider", label: "Slider" },
      { id: "list", label: "List" },
      { id: "tabs", label: "Tabs" },
      { id: "table", label: "Table" },
      { id: "modal", label: "Modal" },
      { id: "image", label: "Image" }
    ]
  }
] as const;

type DemoSurface = {
  surfaceId?: string;
  rootComponentId?: string;
  catalogId?: string;
  components?: Array<Record<string, unknown>>;
  dataModel?: Record<string, unknown>;
};

type ActionEntry = A2uiUserAction & Record<string, unknown>;

type ComponentChildDef = {
  explicitList?: string[];
};

type ComponentDef = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: ComponentChildDef;
};

const defaultJson: DemoSurface = {
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
        explicitList: ["title", "greeting"]
      }
    },
    {
      id: "title",
      type: "Text",
      props: {
        text: { literalString: "Welcome to A2UI!" },
        bold: true
      }
    },
    {
      id: "greeting",
      type: "Text",
      props: {
        text: { path: "message" }
      }
    }
  ],
  dataModel: {
    message: "Edit this JSON and click Render!"
  }
};

const exampleJson: DemoSurface = {
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
        explicitList: [
          "title",
          "spacer1",
          "inputSection",
          "spacer2",
          "statusSection",
          "spacer3",
          "sliderLabel",
          "slider",
          "imagePreview",
          "submit"
        ]
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
      children: { explicitList: ["nameLabel", "nameInput", "emailField", "menuChoice", "checkbox"] }
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
      id: "emailField",
      type: "TextField",
      props: {
        label: "Email",
        value: { path: "form.email" },
        onChange: { actionId: "emailChange" }
      }
    },
    {
      id: "menuChoice",
      type: "MultipleChoice",
      props: {
        label: "Meal",
        items: [
          { label: "Pizza", value: "pizza" },
          { label: "Sushi", value: "sushi" },
          { label: "Salad", value: "salad" }
        ],
        onSelect: { actionId: "mealSelect" }
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
    { id: "spacer3", type: "Spacer" },
    {
      id: "sliderLabel",
      type: "Text",
      props: { text: { literalString: "Order priority" } }
    },
    {
      id: "slider",
      type: "Slider",
      props: { min: 1, max: 5, step: 1, value: { path: "form.priority" }, onChange: { actionId: "priorityChange" } }
    },
    {
      id: "imagePreview",
      type: "Image",
      props: { label: "Menu image", url: "https://example.com/menu.png" }
    },
    {
      id: "submit",
      type: "Button",
      props: { label: { literalString: "Submit" }, onPress: { actionId: "submit" } }
    }
  ],
  dataModel: {
    title: "A2UI Demo Form",
    form: {
      name: "John Doe",
      email: "john@example.com",
      subscribe: true,
      priority: 3
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

const componentPreviewSurfaces: Record<string, DemoSurface> = {
  text: {
    surfaceId: "preview-text",
    rootComponentId: "root",
    components: [
      {
        id: "root",
        type: "Text",
        props: {
          text: { literalString: "Hello, World!" },
          bold: true,
          color: "green"
        }
      }
    ]
  },
  box: {
    surfaceId: "preview-box",
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
        children: { explicitList: ["child1", "child2"] }
      },
      {
        id: "child1",
        type: "Text",
        props: { text: { literalString: "Child 1" } }
      },
      {
        id: "child2",
        type: "Text",
        props: { text: { literalString: "Child 2" } }
      }
    ]
  },
  spacer: {
    surfaceId: "preview-spacer",
    rootComponentId: "root",
    components: [
      {
        id: "root",
        type: "Box",
        props: { direction: "column" },
        children: { explicitList: ["above", "gap", "below"] }
      },
      {
        id: "above",
        type: "Text",
        props: { text: { literalString: "Line above" } }
      },
      { id: "gap", type: "Spacer" },
      {
        id: "below",
        type: "Text",
        props: { text: { literalString: "Line below" } }
      }
    ]
  },
  button: {
    surfaceId: "preview-button",
    rootComponentId: "root",
    components: [
      {
        id: "root",
        type: "Button",
        props: { label: { literalString: "Submit" } }
      }
    ]
  },
  input: {
    surfaceId: "preview-input",
    rootComponentId: "root",
    components: [
      {
        id: "root",
        type: "Input",
        props: {
          label: "Name",
          value: { path: "form.name" },
          onChange: { actionId: "nameChange" }
        }
      }
    ],
    dataModel: { form: { name: "John Doe" } }
  },
  textfield: {
    surfaceId: "preview-textfield",
    rootComponentId: "root",
    components: [
      {
        id: "root",
        type: "TextField",
        props: {
          label: "Email",
          value: { path: "form.email" }
        }
      }
    ],
    dataModel: { form: { email: "name@example.com" } }
  },
  select: {
    surfaceId: "preview-select",
    rootComponentId: "root",
    components: [
      {
        id: "root",
        type: "Select",
        props: {
          label: "Color",
          items: [{ label: "Red" }, { label: "Green" }, { label: "Blue" }],
          selectedIndex: 0
        }
      }
    ]
  },
  "multiple-choice": {
    surfaceId: "preview-multiple-choice",
    rootComponentId: "root",
    components: [
      {
        id: "root",
        type: "MultipleChoice",
        props: {
          label: "Meal",
          items: [{ label: "Pizza" }, { label: "Sushi" }],
          selectedIndex: 0
        }
      }
    ]
  },
  checkbox: {
    surfaceId: "preview-checkbox",
    rootComponentId: "root",
    components: [
      {
        id: "root",
        type: "Checkbox",
        props: {
          label: "Enable notifications",
          checked: true
        }
      }
    ]
  },
  radiogroup: {
    surfaceId: "preview-radiogroup",
    rootComponentId: "root",
    components: [
      {
        id: "root",
        type: "RadioGroup",
        props: {
          options: ["Small", "Medium", "Large"],
          selectedIndex: 1
        }
      }
    ]
  },
  slider: {
    surfaceId: "preview-slider",
    rootComponentId: "root",
    components: [
      {
        id: "root",
        type: "Slider",
        props: {
          label: "Order priority",
          min: 1,
          max: 5,
          step: 1,
          value: 3
        }
      }
    ]
  },
  list: {
    surfaceId: "preview-list",
    rootComponentId: "root",
    components: [
      {
        id: "root",
        type: "List",
        props: {
          items: ["Buy groceries", "Walk the dog", "Write code"]
        }
      }
    ]
  },
  tabs: {
    surfaceId: "preview-tabs",
    rootComponentId: "root",
    components: [
      {
        id: "root",
        type: "Tabs",
        props: {
          tabs: ["Overview", "Settings", "Help"],
          selectedIndex: 0
        },
        children: { explicitList: ["panel1", "panel2", "panel3"] }
      },
      {
        id: "panel1",
        type: "Text",
        props: { text: { literalString: "Welcome to the overview panel!" } }
      },
      {
        id: "panel2",
        type: "Text",
        props: { text: { literalString: "Update your settings here." } }
      },
      {
        id: "panel3",
        type: "Text",
        props: { text: { literalString: "Need help? Contact support." } }
      }
    ]
  },
  table: {
    surfaceId: "preview-table",
    rootComponentId: "root",
    components: [
      {
        id: "root",
        type: "Table",
        props: {
          columns: [{ label: "Service" }, { label: "Status" }],
          rows: [
            ["API", "OK"],
            ["Database", "Warn"],
            ["Cache", "OK"]
          ]
        }
      }
    ]
  },
  modal: {
    surfaceId: "preview-modal",
    rootComponentId: "root",
    components: [
      {
        id: "root",
        type: "Modal",
        props: {
          title: "Order placed",
          description: "Your order is on its way."
        },
        children: { explicitList: ["modalAction"] }
      },
      {
        id: "modalAction",
        type: "Button",
        props: { label: { literalString: "Okay" } }
      }
    ]
  },
  image: {
    surfaceId: "preview-image",
    rootComponentId: "root",
    components: [
      {
        id: "root",
        type: "Image",
        props: {
          label: "Menu",
          url: "https://example.com/menu.png"
        }
      }
    ]
  }
};

const terminalTheme = {
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
} as const;

type TtyStream = PassThrough & {
  isTTY: boolean;
  columns: number;
  rows: number;
  ref: () => void;
  unref: () => void;
  hasColors: () => boolean;
  getColorDepth: () => number;
  setRawMode?: () => void;
};

const createTtyStream = (): TtyStream => {
  const stream = new PassThrough() as TtyStream;
  stream.isTTY = true;
  stream.ref = () => {};
  stream.unref = () => {};
  stream.hasColors = () => true;
  stream.getColorDepth = () => 24;
  stream.columns = 0;
  stream.rows = 0;
  return stream;
};

const createPreviewTerminal = (container: HTMLDivElement) => {
  const term = new Terminal({
    theme: terminalTheme as unknown as ITheme,
    fontFamily: '"Fira Code", "Consolas", monospace',
    fontSize: 13,
    lineHeight: 1.2,
    cursorBlink: true,
    cursorStyle: "bar",
    scrollback: 1000,
    convertEol: true
  });

  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(container);
  fitAddon.fit();
  requestAnimationFrame(() => fitAddon.fit());
  term.focus();

  term.attachCustomKeyEventHandler((event) => {
    if (event.key === "Tab") {
      event.preventDefault();
    }
    return true;
  });

  container.addEventListener("mousedown", () => term.focus());

  const stdout = createTtyStream();
  const stderr = createTtyStream();
  const stdin = createTtyStream();

  stdout.columns = term.cols;
  stdout.rows = term.rows;
  stderr.columns = term.cols;
  stderr.rows = term.rows;

  stdin.setRawMode = () => {};
  stdin.resume = () => stdin;
  stdin.pause = () => stdin;

  stdout.on("data", (chunk: Buffer) => {
    term.write(chunk.toString());
  });

  stderr.on("data", (chunk: Buffer) => {
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
    fitAddon.fit();
  });

  return { term, fitAddon, stdout, stderr, stdin };
};

const InkPreview: React.FC<{ surface: DemoSurface }> = ({ surface }) => {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const rendererRef = useRef<ReturnType<typeof createA2uiInkRenderer> | null>(null);

  useEffect(() => {
    if (!previewRef.current || terminalRef.current) {
      return;
    }

    const { term, fitAddon, stdout, stderr, stdin } = createPreviewTerminal(previewRef.current);
    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    rendererRef.current = createA2uiInkRenderer({
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdin: stdin as unknown as NodeJS.ReadStream,
      exitOnCtrlC: false,
      patchConsole: false
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      rendererRef.current?.dispose?.();
      rendererRef.current = null;
      term.dispose();
      terminalRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!rendererRef.current || !terminalRef.current) {
      return;
    }

    const surfaceId = surface.surfaceId || "preview";
    terminalRef.current.clear();

    rendererRef.current.handleMessage({
      type: "surfaceUpdate",
      surfaceId,
      rootComponentId: surface.rootComponentId || "root",
      components: (surface.components ?? []) as ComponentDef[]
    });

    rendererRef.current.handleMessage({
      type: "dataModelUpdate",
      surfaceId,
      dataModel: surface.dataModel || {}
    });

    rendererRef.current.handleMessage({
      type: "beginRendering",
      surfaceId,
      catalogId: surface.catalogId
    });

    fitAddonRef.current?.fit();
  }, [surface]);

  return <div ref={previewRef} className="terminal-simulator" />;
};

const SIMPLE_SURFACE_ID = "demo";
const SIMPLE_ROOT_ID = "root";

export default function App() {
  const [activeSection, setActiveSection] = useState<string>("playground");
  const [jsonText, setJsonText] = useState<string>(() => JSON.stringify(defaultJson, null, 2));
  const [inputMode, setInputMode] = useState<"full" | "simple">("simple");
  const [componentsText, setComponentsText] = useState<string>(
    () => JSON.stringify(defaultJson.components ?? [], null, 2)
  );
  const [dataModelText, setDataModelText] = useState<string>(
    () => JSON.stringify(defaultJson.dataModel ?? {}, null, 2)
  );
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const rendererRef = useRef<ReturnType<typeof createA2uiInkRenderer> | null>(null);
  const currentSurfaceIdRef = useRef<string>("demo");

  const defaultJsonText = useMemo(() => JSON.stringify(defaultJson, null, 2), []);
  const exampleJsonText = useMemo(() => JSON.stringify(exampleJson, null, 2), []);
  const defaultComponentsText = useMemo(() => JSON.stringify(defaultJson.components ?? [], null, 2), []);
  const defaultDataModelText = useMemo(() => JSON.stringify(defaultJson.dataModel ?? {}, null, 2), []);
  const exampleComponentsText = useMemo(() => JSON.stringify(exampleJson.components ?? [], null, 2), []);
  const exampleDataModelText = useMemo(() => JSON.stringify(exampleJson.dataModel ?? {}, null, 2), []);

  const safeParseJson = <T,>(text: string) => {
    try {
      return { ok: true, value: JSON.parse(text) as T };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown JSON error";
      return { ok: false, error: message };
    }
  };

  useEffect(() => {
    const handleHash = () => {
      const sectionId = window.location.hash.replace("#", "");
      if (sectionId) {
        setActiveSection(sectionId);
      } else {
        setActiveSection("playground");
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  useEffect(() => {
    if (!terminalRef.current || termInstanceRef.current) {
      return;
    }

    const term = new Terminal({
      theme: terminalTheme as unknown as ITheme,
      fontFamily: '"Fira Code", "Consolas", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback: 2000,
      convertEol: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    requestAnimationFrame(() => fitAddon.fit());
    fitAddonRef.current = fitAddon;
    term.focus();
    termInstanceRef.current = term;

    term.attachCustomKeyEventHandler((event) => {
      if (event.key === "Tab") {
        event.preventDefault();
      }
      return true;
    });

    const stdout = createTtyStream();
    const stderr = createTtyStream();
    const stdin = createTtyStream();

    process.stdout = stdout as unknown as NodeJS.WriteStream & { fd: 1 };
    process.stderr = stderr as unknown as NodeJS.WriteStream & { fd: 2 };
    process.stdin = stdin as unknown as NodeJS.ReadStream & { fd: 0 };
    process.env = process.env || {};
    process.env.TERM = process.env.TERM || "xterm-256color";

    stdout.columns = term.cols;
    stdout.rows = term.rows;
    stderr.columns = term.cols;
    stderr.rows = term.rows;

    stdin.setRawMode = () => {};
    stdin.resume = () => stdin;
    stdin.pause = () => stdin;

    stdout.on("data", (chunk: Buffer) => {
      term.write(chunk.toString());
    });

    stderr.on("data", (chunk: Buffer) => {
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
      fitAddon.fit();
    });

    rendererRef.current = createA2uiInkRenderer({
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: stderr as unknown as NodeJS.WriteStream,
      stdin: stdin as unknown as NodeJS.ReadStream,
      exitOnCtrlC: false,
      patchConsole: false,
      onUserAction: (action) => {
        setActions((prev) => [...prev, action as ActionEntry]);
      }
    });

    window.addEventListener("resize", () => fitAddon.fit());

    return () => {
      rendererRef.current?.dispose?.();
      rendererRef.current = null;
      term.dispose();
      termInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (activeSection === "playground") {
      setTimeout(() => fitAddonRef.current?.fit(), 0);
    }
  }, [activeSection]);

  useEffect(() => {
    setJsonText(defaultJsonText);
    setComponentsText(defaultComponentsText);
    setDataModelText(defaultDataModelText);
  }, [defaultJsonText, defaultComponentsText, defaultDataModelText]);

  useEffect(() => {
    if (inputMode === "simple") {
      const parsed = safeParseJson<DemoSurface>(jsonText);
      if (parsed.ok) {
        setComponentsText(JSON.stringify(parsed.value.components ?? [], null, 2));
        setDataModelText(JSON.stringify(parsed.value.dataModel ?? {}, null, 2));
      }
      return;
    }

    const parsedComponents = safeParseJson<unknown>(componentsText);
    const parsedDataModel = safeParseJson<Record<string, unknown>>(dataModelText);
    setJsonText(
      JSON.stringify(
        {
          surfaceId: SIMPLE_SURFACE_ID,
          rootComponentId: SIMPLE_ROOT_ID,
          components: parsedComponents.ok ? parsedComponents.value : [],
          dataModel: parsedDataModel.ok ? parsedDataModel.value : {}
        },
        null,
        2
      )
    );
  }, [inputMode]);

  const handleNavigate = (sectionId: string) => {
    setActiveSection(sectionId);
    window.location.hash = sectionId;
  };

  const renderSurface = (surface: DemoSurface) => {
    if (!rendererRef.current || !termInstanceRef.current) {
      return;
    }

    if (!surface.components || !Array.isArray(surface.components)) {
      termInstanceRef.current.write("\x1b[31mJSON must include a components array.\x1b[0m\r\n");
      return;
    }

    const surfaceId = surface.surfaceId || "demo";
    currentSurfaceIdRef.current = surfaceId;
    termInstanceRef.current.clear();

    rendererRef.current.handleMessage({
      type: "surfaceUpdate",
      surfaceId,
      rootComponentId: surface.rootComponentId || "root",
      components: surface.components as ComponentDef[]
    });

    rendererRef.current.handleMessage({
      type: "dataModelUpdate",
      surfaceId,
      dataModel: surface.dataModel || {}
    });

    rendererRef.current.handleMessage({
      type: "beginRendering",
      surfaceId,
      catalogId: surface.catalogId
    });
  };

  const renderFromText = (text: string) => {
    const parsed = safeParseJson<DemoSurface>(text);
    if (!parsed.ok) {
      termInstanceRef.current?.write(`\x1b[31mInvalid JSON: ${parsed.error}\x1b[0m\r\n`);
      return;
    }
    renderSurface(parsed.value);
  };

  const renderFromSimpleInputs = () => {
    const componentsParsed = safeParseJson<unknown>(componentsText);
    if (!componentsParsed.ok) {
      termInstanceRef.current?.write(`\x1b[31mInvalid components JSON: ${componentsParsed.error}\x1b[0m\r\n`);
      return;
    }

    const dataModelParsed = safeParseJson<Record<string, unknown>>(dataModelText);
    if (!dataModelParsed.ok) {
      termInstanceRef.current?.write(`\x1b[31mInvalid dataModel JSON: ${dataModelParsed.error}\x1b[0m\r\n`);
      return;
    }

    const componentValue = componentsParsed.value as unknown;
    const componentsArray = Array.isArray(componentValue)
      ? componentValue
      : (componentValue as { components?: unknown }).components;

    if (!Array.isArray(componentsArray)) {
      termInstanceRef.current?.write("\x1b[31mComponents must be an array.\x1b[0m\r\n");
      return;
    }

    renderSurface({
      surfaceId: SIMPLE_SURFACE_ID,
      rootComponentId: SIMPLE_ROOT_ID,
      components: componentsArray as ComponentDef[],
      dataModel: dataModelParsed.value
    });
  };

  const handleRender = () => {
    if (inputMode === "simple") {
      renderFromSimpleInputs();
    } else {
      renderFromText(jsonText);
    }
  };

  const handleLoadExample = () => {
    if (inputMode === "simple") {
      setComponentsText(exampleComponentsText);
      setDataModelText(exampleDataModelText);
      renderFromSimpleInputs();
    } else {
      setJsonText(exampleJsonText);
      renderFromText(exampleJsonText);
    }
  };

  const handleClearTerminal = () => {
    termInstanceRef.current?.clear();
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <h1>A2UI Ink</h1>
          <span className="version">v0.1.0</span>
        </div>

        <nav className="nav">
          {navSections.map((section) => (
            <div className="nav-section" key={section.title}>
              <h3>{section.title}</h3>
              <ul>
                {section.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`nav-link ${activeSection === item.id ? "active" : ""}`}
                      onClick={() => handleNavigate(item.id)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <div className="content-wrapper">
          <section id="overview" className={`section ${activeSection === "overview" ? "active" : ""}`}>
            <h2>Overview</h2>
            <p className="lead">
              A2UI Ink renders A2UI v0.8 surfaces in a terminal using Ink. It&apos;s a lightweight client that
              accepts A2UI JSON messages, builds a UI tree from the adjacency list, resolves data bindings,
              renders the result, and emits <code>userAction</code> events.
            </p>

            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">📦</div>
                <h4>Component-Based</h4>
                <p>Build terminal UIs with declarative JSON components</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔗</div>
                <h4>Data Binding</h4>
                <p>Bind component props to your data model with path expressions</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h4>Reactive</h4>
                <p>UI updates automatically when data changes</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔌</div>
                <h4>Transport Agnostic</h4>
                <p>Works with any A2UI message source (MCP, WebSocket, etc.)</p>
              </div>
            </div>

            <h3>Message Flow</h3>
            <div className="message-flow">
              <div className="flow-step">
                <span className="step-num">1</span>
                <code>surfaceUpdate</code>
                <p>Define component catalog</p>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">2</span>
                <code>dataModelUpdate</code>
                <p>Provide data for bindings</p>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">3</span>
                <code>beginRendering</code>
                <p>Start rendering the surface</p>
              </div>
            </div>
          </section>

          <section id="installation" className={`section ${activeSection === "installation" ? "active" : ""}`}>
            <h2>Installation</h2>
            <div className="code-block">
              <pre><code>npm install a2uink</code></pre>
            </div>

            <h3>Peer Dependencies</h3>
            <p>A2UI Ink requires the following peer dependencies:</p>
            <div className="code-block">
              <pre><code>{`{
  "ink": "^4.0.0",
  "react": "^18.2.0"
}`}</code></pre>
            </div>
          </section>

          <section id="quick-start" className={`section ${activeSection === "quick-start" ? "active" : ""}`}>
            <h2>Quick Start</h2>
            <p>Here&apos;s a minimal example to get you started:</p>
            <div className="code-block">
              <pre><code>{`import { createA2uiInkRenderer } from "a2uink";

// 1. Create the renderer
const renderer = createA2uiInkRenderer({
  onUserAction: (action) => {
    // Forward actions to your server/agent
    sendAction(action);
  }
});

// 2. Handle incoming messages
receiveMessage((message) => {
  renderer.handleMessage(message);
});

// 3. Send a surface update
renderer.handleMessage({
  type: "surfaceUpdate",
  surfaceId: "main",
  rootComponentId: "root",
  components: [
    {
      id: "root",
      type: "Box",
      props: { direction: "column" },
      children: { explicitList: ["greeting"] }
    },
    {
      id: "greeting",
      type: "Text",
      props: { text: { path: "message" } }
    }
  ]
});

// 4. Send data
renderer.handleMessage({
  type: "dataModelUpdate",
  surfaceId: "main",
  dataModel: { message: "Hello, A2UI!" }
});

// 5. Start rendering
renderer.handleMessage({
  type: "beginRendering",
  surfaceId: "main"
});`}</code></pre>
            </div>
          </section>

          <section id="playground" className={`section ${activeSection === "playground" ? "active" : ""}`}>
            <h2>JSON Playground</h2>
            <p className="lead">Paste your A2UI JSON to preview how it renders in the terminal.</p>
            <p className="component-desc">Simple Mode accepts a components array and a dataModel object. It uses surface ID <code>demo</code> and root ID <code>root</code>.</p>

            <div className="playground-container">
              <div className="playground-editor">
                <div className="editor-header">
                  <span>A2UI JSON</span>
                  <div className="editor-actions">
                    <div className="editor-mode">
                      <button
                        type="button"
                        className={`btn btn-secondary btn-sm ${inputMode === "full" ? "is-active" : ""}`}
                        onClick={() => setInputMode("full")}
                      >
                        Full JSON
                      </button>
                      <button
                        type="button"
                        className={`btn btn-secondary btn-sm ${inputMode === "simple" ? "is-active" : ""}`}
                        onClick={() => setInputMode("simple")}
                      >
                        Simple Mode
                      </button>
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={handleLoadExample}>Load Example</button>
                    <button type="button" className="btn btn-primary" onClick={handleRender}>Render</button>
                  </div>
                </div>
                {inputMode === "full" ? (
                  <textarea
                    id="jsonEditor"
                    className="editor-textarea"
                    spellCheck={false}
                    value={jsonText}
                    onChange={(event) => setJsonText(event.target.value)}
                  />
                ) : (
                  <div className="simple-editor-grid">
                    <label className="editor-field">
                      <span>Components (array)</span>
                      <textarea
                        className="editor-textarea"
                        spellCheck={false}
                        value={componentsText}
                        onChange={(event) => setComponentsText(event.target.value)}
                      />
                    </label>
                    <label className="editor-field">
                      <span>dataModel (object)</span>
                      <textarea
                        className="editor-textarea"
                        spellCheck={false}
                        value={dataModelText}
                        onChange={(event) => setDataModelText(event.target.value)}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="playground-preview">
                <div className="preview-header">
                  <span>Terminal Preview</span>
                  <div className="preview-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearTerminal}>Clear</button>
                  </div>
                </div>
                <div ref={terminalRef} id="terminal" className="terminal-container" />
                <div className="terminal-help">
                  <strong>Ink interactivity:</strong>
                  <code>Tab</code> / <code>Shift+Tab</code> to move focus, <code>Enter</code> or <code>Space</code> to activate,
                  type directly in inputs.
                </div>
              </div>
            </div>

            <div className="playground-actions">
              <h3>User Actions Log</h3>
              <div id="actionsLog" className="actions-log">
                {actions.length === 0 ? (
                  <p className="placeholder">User actions will appear here when you interact with components...</p>
                ) : (
                  actions.map((action, index) => (
                    <div className="action-entry" key={`${action.componentId}-${action.actionId}-${index}`}>
                      <span className="action-type">{action.type}</span> →
                      <span className="action-component">{action.componentId}</span>
                      {Object.keys(action).length ? <code>{JSON.stringify(action)}</code> : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

        <section id="text" className={`section ${activeSection === "text" ? "active" : ""}`}>
          <h2>Text</h2>
          <p className="component-desc">Renders styled text content. Supports bold, italic, underline, strikethrough, and color styling.</p>
          <h3>Props</h3>
          <table className="props-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>text</code></td><td>BoundValue</td><td>The text content to display</td></tr>
              <tr><td><code>bold</code></td><td>boolean</td><td>Make text bold</td></tr>
              <tr><td><code>italic</code></td><td>boolean</td><td>Make text italic</td></tr>
              <tr><td><code>underline</code></td><td>boolean</td><td>Underline the text</td></tr>
              <tr><td><code>strikethrough</code></td><td>boolean</td><td>Strikethrough the text</td></tr>
              <tr><td><code>color</code></td><td>string</td><td>Text color (e.g., "green", "red", "#ff0")</td></tr>
            </tbody>
          </table>
          <h3>Example</h3>
          <div className="example-container">
            <div className="code-block">
              <pre><code>{`{
  "id": "greeting",
  "type": "Text",
  "props": {
    "text": { "path": "message" },
    "bold": true,
    "color": "green"
  }
}`}</code></pre>
            </div>
            <div className="terminal-preview" data-component="text">
              <InkPreview surface={componentPreviewSurfaces.text} />
            </div>
          </div>
        </section>

        <section id="box" className={`section ${activeSection === "box" ? "active" : ""}`}>
          <h2>Box</h2>
          <p className="component-desc">A flexible container component for layout. Supports flexbox-style properties and borders.</p>
          <h3>Props</h3>
          <table className="props-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>direction</code></td><td>"row" | "column"</td><td>Flex direction</td></tr>
              <tr><td><code>padding</code></td><td>number</td><td>Padding on all sides</td></tr>
              <tr><td><code>paddingX</code></td><td>number</td><td>Horizontal padding</td></tr>
              <tr><td><code>paddingY</code></td><td>number</td><td>Vertical padding</td></tr>
              <tr><td><code>borderStyle</code></td><td>string</td><td>"single", "double", "round", "bold", etc.</td></tr>
              <tr><td><code>borderColor</code></td><td>string</td><td>Border color</td></tr>
            </tbody>
          </table>
          <h3>Example</h3>
          <div className="example-container">
            <div className="code-block">
              <pre><code>{`{
  "id": "container",
  "type": "Box",
  "props": {
    "direction": "column",
    "padding": 1,
    "borderStyle": "round"
  },
  "children": {
    "explicitList": ["child1", "child2"]
  }
}`}</code></pre>
            </div>
            <div className="terminal-preview" data-component="box">
              <InkPreview surface={componentPreviewSurfaces.box} />
            </div>
          </div>
        </section>

        <section id="spacer" className={`section ${activeSection === "spacer" ? "active" : ""}`}>
          <h2>Spacer</h2>
          <p className="component-desc">Adds vertical spacing between components.</p>
          <h3>Props</h3>
          <table className="props-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>—</code></td><td>—</td><td>No props</td></tr>
            </tbody>
          </table>
          <h3>Example</h3>
          <div className="example-container">
            <div className="code-block">
              <pre><code>{`{
  "id": "gap",
  "type": "Spacer"
}`}</code></pre>
            </div>
            <div className="terminal-preview" data-component="spacer">
              <InkPreview surface={componentPreviewSurfaces.spacer} />
            </div>
          </div>
        </section>

        <section id="button" className={`section ${activeSection === "button" ? "active" : ""}`}>
          <h2>Button</h2>
          <p className="component-desc">An interactive button that emits actions when clicked or focused.</p>
          <h3>Props</h3>
          <table className="props-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>label</code></td><td>BoundValue</td><td>Button label text</td></tr>
              <tr><td><code>onPress</code></td><td>ActionDef</td><td>Action to emit when pressed</td></tr>
              <tr><td><code>disabled</code></td><td>boolean</td><td>Disable the button</td></tr>
            </tbody>
          </table>
          <h3>Example</h3>
          <div className="example-container">
            <div className="code-block">
              <pre><code>{`{
  "id": "submitBtn",
  "type": "Button",
  "props": {
    "label": { "literalString": "Submit" },
    "onPress": { "actionId": "submit" }
  }
}`}</code></pre>
            </div>
            <div className="terminal-preview" data-component="button">
              <InkPreview surface={componentPreviewSurfaces.button} />
            </div>
          </div>
        </section>

        <section id="input" className={`section ${activeSection === "input" ? "active" : ""}`}>
          <h2>Input</h2>
          <p className="component-desc">A text input field for capturing user input.</p>
          <h3>Props</h3>
          <table className="props-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>value</code></td><td>BoundValue</td><td>Current input value</td></tr>
              <tr><td><code>placeholder</code></td><td>string</td><td>Placeholder text</td></tr>
              <tr><td><code>onChange</code></td><td>ActionDef</td><td>Action on value change</td></tr>
              <tr><td><code>onSubmit</code></td><td>ActionDef</td><td>Action on enter key</td></tr>
            </tbody>
          </table>
          <h3>Example</h3>
          <div className="example-container">
            <div className="code-block">
              <pre><code>{`{
  "id": "nameInput",
  "type": "Input",
  "props": {
    "value": { "path": "form.name" },
    "placeholder": "Enter your name",
    "onChange": { "actionId": "nameChange" },
    "onSubmit": { "actionId": "nameSubmit" }
  }
}`}</code></pre>
            </div>
            <div className="terminal-preview" data-component="input">
              <InkPreview surface={componentPreviewSurfaces.input} />
            </div>
          </div>
        </section>

        <section id="textfield" className={`section ${activeSection === "textfield" ? "active" : ""}`}>
          <h2>TextField</h2>
          <p className="component-desc">Composer-friendly input with label and bound text.</p>
          <h3>Props</h3>
          <table className="props-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>label</code></td><td>BoundValue</td><td>Field label</td></tr>
              <tr><td><code>text</code></td><td>BoundValue</td><td>Bound input value</td></tr>
              <tr><td><code>action</code></td><td>ActionDef</td><td>Action on change</td></tr>
            </tbody>
          </table>
          <h3>Example</h3>
          <div className="example-container">
            <div className="code-block">
              <pre><code>{`{
  "id": "email",
  "component": {
    "TextField": {
      "label": { "literalString": "Email" },
      "text": { "path": "/form/email" },
      "textFieldType": "shortText"
    }
  }
}`}</code></pre>
            </div>
            <div className="terminal-preview" data-component="textfield">
              <InkPreview surface={componentPreviewSurfaces.textfield} />
            </div>
          </div>
        </section>

        <section id="select" className={`section ${activeSection === "select" ? "active" : ""}`}>
          <h2>Select</h2>
          <p className="component-desc">A dropdown-style selection component.</p>
          <h3>Props</h3>
          <table className="props-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>items</code></td><td>BoundValue (array)</td><td>Array of options</td></tr>
              <tr><td><code>selectedIndex</code></td><td>BoundValue (number)</td><td>Currently selected index</td></tr>
              <tr><td><code>onSelect</code></td><td>ActionDef</td><td>Action on selection change</td></tr>
            </tbody>
          </table>
          <h3>Example</h3>
          <div className="example-container">
            <div className="code-block">
              <pre><code>{`{
  "id": "colorSelect",
  "type": "Select",
  "props": {
    "items": { "path": "colors" },
    "selectedIndex": { "path": "selectedColor" },
    "onSelect": { "actionId": "colorChange" }
  }
}`}</code></pre>
            </div>
            <div className="terminal-preview" data-component="select">
              <InkPreview surface={componentPreviewSurfaces.select} />
            </div>
          </div>
        </section>

        <section id="multiple-choice" className={`section ${activeSection === "multiple-choice" ? "active" : ""}`}>
          <h2>MultipleChoice</h2>
          <p className="component-desc">Composer selection component mapped to Ink Select.</p>
          <h3>Props</h3>
          <table className="props-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>options</code></td><td>array</td><td>Selectable options</td></tr>
              <tr><td><code>selections</code></td><td>BoundValue</td><td>Selected value(s)</td></tr>
              <tr><td><code>action</code></td><td>ActionDef</td><td>Action on selection</td></tr>
            </tbody>
          </table>
          <h3>Example</h3>
          <div className="example-container">
            <div className="code-block">
              <pre><code>{`{
  "id": "menu",
  "component": {
    "MultipleChoice": {
      "options": [
        { "label": { "literalString": "Pizza" }, "value": "pizza" },
        { "label": { "literalString": "Sushi" }, "value": "sushi" }
      ],
      "maxAllowedSelections": 1
    }
  }
}`}</code></pre>
            </div>
            <div className="terminal-preview" data-component="multiple-choice">
              <InkPreview surface={componentPreviewSurfaces["multiple-choice"]} />
            </div>
          </div>
        </section>

        <section id="checkbox" className={`section ${activeSection === "checkbox" ? "active" : ""}`}>
          <h2>Checkbox</h2>
          <p className="component-desc">A checkbox for boolean input.</p>
          <h3>Props</h3>
          <table className="props-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>label</code></td><td>string</td><td>Checkbox label</td></tr>
              <tr><td><code>checked</code></td><td>BoundValue (boolean)</td><td>Checked state</td></tr>
              <tr><td><code>onChange</code></td><td>ActionDef</td><td>Action on toggle</td></tr>
            </tbody>
          </table>
          <h3>Example</h3>
          <div className="example-container">
            <div className="code-block">
              <pre><code>{`{
  "id": "enableFeature",
  "type": "Checkbox",
  "props": {
    "label": "Enable notifications",
    "checked": { "path": "settings.notifications" },
    "onChange": { "actionId": "toggleNotifications" }
  }
}`}</code></pre>
            </div>
            <div className="terminal-preview" data-component="checkbox">
              <InkPreview surface={componentPreviewSurfaces.checkbox} />
            </div>
          </div>
        </section>

        <section id="radiogroup" className={`section ${activeSection === "radiogroup" ? "active" : ""}`}>
          <h2>RadioGroup</h2>
          <p className="component-desc">A group of mutually exclusive radio options.</p>
          <h3>Props</h3>
          <table className="props-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>options</code></td><td>BoundValue (array)</td><td>Array of option labels</td></tr>
              <tr><td><code>selectedIndex</code></td><td>BoundValue (number)</td><td>Selected option index</td></tr>
              <tr><td><code>onChange</code></td><td>ActionDef</td><td>Action on selection change</td></tr>
            </tbody>
          </table>
          <h3>Example</h3>
          <div className="example-container">
            <div className="code-block">
              <pre><code>{`{
  "id": "sizeRadio",
  "type": "RadioGroup",
  "props": {
    "options": { "path": "sizeOptions" },
    "selectedIndex": { "path": "selectedSize" },
    "onChange": { "actionId": "sizeChange" }
  }
}`}</code></pre>
            </div>
            <div className="terminal-preview" data-component="radiogroup">
              <InkPreview surface={componentPreviewSurfaces.radiogroup} />
            </div>
          </div>
        </section>

        <section id="slider" className={`section ${activeSection === "slider" ? "active" : ""}`}>
          <h2>Slider</h2>
          <p className="component-desc">An interactive slider for numeric values.</p>
          <h3>Props</h3>
          <table className="props-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>min</code></td><td>number</td><td>Minimum value</td></tr>
              <tr><td><code>max</code></td><td>number</td><td>Maximum value</td></tr>
              <tr><td><code>step</code></td><td>number</td><td>Step size</td></tr>
              <tr><td><code>value</code></td><td>BoundValue</td><td>Current value</td></tr>
              <tr><td><code>onChange</code></td><td>ActionDef</td><td>Action on change</td></tr>
            </tbody>
          </table>
          <h3>Example</h3>
          <div className="example-container">
            <div className="code-block">
              <pre><code>{`{
  "id": "priority",
  "type": "Slider",
  "props": {
    "min": 1,
    "max": 5,
    "step": 1,
    "value": { "path": "form.priority" },
    "onChange": { "actionId": "priorityChange" }
  }
}`}</code></pre>
            </div>
            <div className="terminal-preview" data-component="slider">
              <InkPreview surface={componentPreviewSurfaces.slider} />
            </div>
          </div>
        </section>

        <section id="list" className={`section ${activeSection === "list" ? "active" : ""}`}>
          <h2>List</h2>
          <p className="component-desc">Renders a bulleted list of items.</p>
          <h3>Props</h3>
          <table className="props-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>items</code></td><td>BoundValue (array)</td><td>Array of list items</td></tr>
            </tbody>
          </table>
          <h3>Example</h3>
          <div className="example-container">
            <div className="code-block">
              <pre><code>{`{
  "id": "todoList",
  "type": "List",
  "props": {
    "items": { "path": "todos" }
  }
}`}</code></pre>
            </div>
            <div className="terminal-preview" data-component="list">
              <InkPreview surface={componentPreviewSurfaces.list} />
            </div>
          </div>
        </section>

        <section id="tabs" className={`section ${activeSection === "tabs" ? "active" : ""}`}>
          <h2>Tabs</h2>
          <p className="component-desc">A tabbed interface for organizing content into panels.</p>
          <h3>Props</h3>
          <table className="props-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>tabs</code></td><td>BoundValue (array)</td><td>Array of tab labels</td></tr>
              <tr><td><code>selectedIndex</code></td><td>BoundValue (number)</td><td>Active tab index</td></tr>
              <tr><td><code>onChange</code></td><td>ActionDef</td><td>Action on tab change</td></tr>
            </tbody>
          </table>
          <h3>Example</h3>
          <div className="example-container">
            <div className="code-block">
              <pre><code>{`{
  "id": "mainTabs",
  "type": "Tabs",
  "props": {
    "tabs": { "path": "tabLabels" },
    "selectedIndex": { "path": "activeTab" },
    "onChange": { "actionId": "tabChange" }
  },
  "children": {
    "explicitList": ["panel1", "panel2", "panel3"]
  }
}`}</code></pre>
            </div>
            <div className="terminal-preview" data-component="tabs">
              <InkPreview surface={componentPreviewSurfaces.tabs} />
            </div>
          </div>
        </section>

        <section id="table" className={`section ${activeSection === "table" ? "active" : ""}`}>
          <h2>Table</h2>
          <p className="component-desc">Renders tabular data with columns and rows.</p>
          <h3>Props</h3>
          <table className="props-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>columns</code></td><td>BoundValue (array)</td><td>Array of column definitions</td></tr>
              <tr><td><code>rows</code></td><td>BoundValue (array)</td><td>Array of row data objects</td></tr>
            </tbody>
          </table>
          <h3>Example</h3>
          <div className="example-container">
            <div className="code-block">
              <pre><code>{`{
  "id": "statusTable",
  "type": "Table",
  "props": {
    "columns": { "path": "table.columns" },
    "rows": { "path": "table.rows" }
  }
}`}</code></pre>
            </div>
            <div className="terminal-preview" data-component="table">
              <InkPreview surface={componentPreviewSurfaces.table} />
            </div>
          </div>
        </section>

        <section id="modal" className={`section ${activeSection === "modal" ? "active" : ""}`}>
          <h2>Modal</h2>
          <p className="component-desc">A boxed container for important content.</p>
          <h3>Props</h3>
          <table className="props-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>title</code></td><td>string</td><td>Modal title</td></tr>
              <tr><td><code>description</code></td><td>string</td><td>Modal body text</td></tr>
            </tbody>
          </table>
          <h3>Example</h3>
          <div className="example-container">
            <div className="code-block">
              <pre><code>{`{
  "id": "confirm",
  "type": "Modal",
  "props": {
    "title": "Order placed",
    "description": "Your order is on its way."
  },
  "children": { "explicitList": ["modalAction"] }
}`}</code></pre>
            </div>
            <div className="terminal-preview" data-component="modal">
              <InkPreview surface={componentPreviewSurfaces.modal} />
            </div>
          </div>
        </section>

        <section id="image" className={`section ${activeSection === "image" ? "active" : ""}`}>
          <h2>Image</h2>
          <p className="component-desc">Displays an image URL label in Ink.</p>
          <h3>Example</h3>
          <div className="example-container">
            <div className="code-block">
              <pre><code>{`{
  "id": "heroImage",
  "type": "Image",
  "props": {
    "label": "Menu",
    "url": "https://example.com/menu.png"
  }
}`}</code></pre>
            </div>
            <div className="terminal-preview" data-component="image">
              <InkPreview surface={componentPreviewSurfaces.image} />
            </div>
          </div>
        </section>

        </div>
      </main>
    </div>
  );
}
