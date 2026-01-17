import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

const shimRoot = fileURLToPath(new URL("./node_modules/vite-plugin-node-polyfills/shims/", import.meta.url));
const localShims = fileURLToPath(new URL("./src/shims/", import.meta.url));
const processShimPath = path.join(localShims, "process.js");

export default defineConfig({
  base: "./",
  plugins: [react(), nodePolyfills({ protocolImports: true })],
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
        find: "vite-plugin-node-polyfills/shims/buffer",
        replacement: path.join(shimRoot, "buffer/dist/index.js")
      },
      {
        find: "vite-plugin-node-polyfills/shims/global",
        replacement: path.join(shimRoot, "global/dist/index.js")
      },
      {
        find: "vite-plugin-node-polyfills/shims/process",
        replacement: processShimPath
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
            build.onResolve({ filter: /^vite-plugin-node-polyfills\/shims\/process$/ }, () => ({ path: processShimPath }));
          }
        }
      ]
    }
  }
});
