import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

const shimRoot = fileURLToPath(new URL("./node_modules/vite-plugin-node-polyfills/shims/", import.meta.url));
const localShims = fileURLToPath(new URL("./src/shims/", import.meta.url));
const processShimPath = path.resolve(localShims, "process.js");
const fsShimPath = path.resolve(localShims, "fs.js");
const netShimPath = path.resolve(localShims, "net.js");
const emptyShimPath = path.resolve(localShims, "empty.js");
const bufferShimPath = path.resolve(shimRoot, "buffer/dist/index.js");
const globalShimPath = path.resolve(shimRoot, "global/dist/index.js");
const inkDividerPath = fileURLToPath(new URL("./node_modules/ink-divider/dist/index.js", import.meta.url));
const streamBrowserifyPath = fileURLToPath(new URL("./node_modules/stream-browserify/index.js", import.meta.url));
const webStreamsPath = fileURLToPath(new URL("./node_modules/web-streams-polyfill/dist/ponyfill.es2018.js", import.meta.url));
const stdlibEmptyMatcher = /node-stdlib-browser[\\/]+esm[\\/]+mock[\\/]+empty\.js$/;
const processShimMatcher = /^vite-plugin-node-polyfills\/shims\/process(?:\/.*)?$/;
const processShimDistMatcher = /^vite-plugin-node-polyfills\/shims\/process\/dist\/index\.js$/;
const processShimDistPathMatcher = /vite-plugin-node-polyfills[\\/]+shims[\\/]+process[\\/]+dist[\\/]+index\.js$/;

const polyfillRedirect = {
  name: "demo-polyfill-redirect",
  enforce: "pre",
  resolveId(source) {
    if (source === "node:process" || source === "node:process") {
      return processShimPath;
    }
    if (source === "node:fs" || source === "fs") {
      return fsShimPath;
    }
    if (source === "node:net" || source === "net") {
      return netShimPath;
    }
    if (source === "node-stdlib-browser/esm/mock/empty.js" || source.includes("node-stdlib-browser/esm/mock/empty.js")) {
      return emptyShimPath;
    }
    if (
      source === "node_modules/vite-plugin-node-polyfills/shims/process/dist/index.js" ||
      source.includes("vite-plugin-node-polyfills/shims/process/dist/index.js")
    ) {
      return processShimPath;
    }
    if (source === "stream-browserify/web") {
      return streamBrowserifyPath;
    }
    if (source === "node:stream/web" || source === "stream/web") {
      return webStreamsPath;
    }
    return null;
  },
  load(id) {
    if (id.includes("vite-plugin-node-polyfills/shims/process/dist/index.js")) {
      return `import process from \"process\";\nif (!process.cwd) { process.cwd = () => \"/\"; }\nexport const cwd = () => process.cwd();\nexport const env = process.env;\nexport default process;\nexport { process };\n`;
    }
    if (id.includes("node-stdlib-browser/esm/mock/empty.js")) {
      return `export const existsSync = () => false;\nexport const readFileSync = () => "";\nexport const isIP = () => 0;\nexport const isIPv4 = () => false;\nexport const isIPv6 = () => false;\nexport const statSync = () => ({ size: 0, mtimeMs: 0 });\nexport const createReadStream = () => ({ on: () => undefined });\nexport const promises = { stat: async () => ({ size: 0, mtimeMs: 0 }) };\nexport default { existsSync, readFileSync, isIP, isIPv4, isIPv6, statSync, createReadStream, promises };\n`;
    }
    if (id.endsWith("stream-browserify/web")) {
      return `export * from "stream-browserify";\nexport { default } from "stream-browserify";\n`;
    }
    return null;
  }
};

export default defineConfig({
  base: "./",
  plugins: [react(), polyfillRedirect, nodePolyfills({ protocolImports: true })],
  define: {
    "process.env.FORCE_COLOR": JSON.stringify("3"),
    "process.env.TERM": JSON.stringify("xterm-256color")
  },
  assetsInclude: ["**/*.wasm"],
  esbuild: {
    target: "esnext"
  },
  build: {
    target: "esnext"
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      {
        find: /^node:process$/,
        replacement: processShimPath
      },
      {
        find: "node:process",
        replacement: processShimPath
      },
      {
        find: /^node:fs$/,
        replacement: fsShimPath
      },
      {
        find: /^node:net$/,
        replacement: netShimPath
      },
      {
        find: "node:fs",
        replacement: fsShimPath
      },
      {
        find: "node:net",
        replacement: netShimPath
      },
      {
        find: "fs",
        replacement: fsShimPath
      },
      {
        find: "net",
        replacement: netShimPath
      },
      {
        find: "vite-plugin-node-polyfills/shims/buffer",
        replacement: bufferShimPath
      },
      {
        find: "vite-plugin-node-polyfills/shims/global",
        replacement: globalShimPath
      },
      {
        find: processShimMatcher,
        replacement: processShimPath
      },
      {
        find: processShimDistMatcher,
        replacement: processShimPath
      },
      {
        find: processShimDistPathMatcher,
        replacement: processShimPath
      },
      {
        find: stdlibEmptyMatcher,
        replacement: emptyShimPath
      },
      {
        find: "node-stdlib-browser/esm/mock/empty.js",
        replacement: emptyShimPath
      },
      {
        find: "node_modules/vite-plugin-node-polyfills/shims/process/dist/index.js",
        replacement: processShimPath
      },
      {
        find: "ink-divider",
        replacement: inkDividerPath
      },
      {
        find: "stream-browserify/web",
        replacement: streamBrowserifyPath
      },
      {
        find: /^node:stream\/web$/,
        replacement: webStreamsPath
      },
      {
        find: "stream/web",
        replacement: webStreamsPath
      }
    ]
  },
  server: {
    fs: {
      allow: ["..", "../.."]
    },
    hmr: false
  },
  optimizeDeps: {
    include: ["buffer", "events", "stream-browserify"],
    exclude: ["yoga-wasm-web"],
    esbuildOptions: {
      target: "esnext",
      plugins: [
        {
          name: "process-shim-resolver",
          setup(build) {
            build.onResolve({ filter: /^node:process$/ }, () => ({ path: processShimPath }));
            build.onResolve({ filter: processShimMatcher }, () => ({ path: processShimPath }));
            build.onResolve({ filter: processShimDistMatcher }, () => ({ path: processShimPath }));
            build.onResolve({ filter: processShimDistPathMatcher }, () => ({ path: processShimPath }));
            build.onResolve({ filter: /^node:fs$/ }, () => ({ path: fsShimPath }));
            build.onResolve({ filter: /^node:net$/ }, () => ({ path: netShimPath }));
            build.onResolve({ filter: /^node:stream\/web$/ }, () => ({ path: webStreamsPath }));
            build.onResolve({ filter: /^stream\/web$/ }, () => ({ path: webStreamsPath }));
            build.onResolve({ filter: stdlibEmptyMatcher }, () => ({ path: emptyShimPath }));
            build.onResolve({ filter: /^node-stdlib-browser\/esm\/mock\/empty\.js$/ }, () => ({ path: emptyShimPath }));
            build.onResolve(
              { filter: /^node_modules\/vite-plugin-node-polyfills\/shims\/process\/dist\/index\.js$/ },
              () => ({ path: processShimPath })
            );
          }
        }
      ]
    }
  }
});
