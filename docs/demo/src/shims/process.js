const shimProcess = globalThis.process ?? {};

if (!shimProcess.env) {
  shimProcess.env = {};
}

if (!shimProcess.cwd) {
  shimProcess.cwd = () => "/";
}

if (!shimProcess.nextTick) {
  shimProcess.nextTick = (callback, ...args) => {
    if (typeof queueMicrotask === "function") {
      queueMicrotask(() => callback(...args));
      return;
    }
    if (typeof Promise !== "undefined") {
      Promise.resolve().then(() => callback(...args));
      return;
    }
    setTimeout(() => callback(...args), 0);
  };
}

export const cwd = () => shimProcess.cwd();
export const env = shimProcess.env;
export default shimProcess;
