import process from "process";
import chalk from "chalk";

process.env = process.env || {};
process.env.FORCE_COLOR = process.env.FORCE_COLOR || "3";
process.env.TERM = process.env.TERM || "xterm-256color";

const stubStream = {
  isTTY: true,
  columns: 80,
  rows: 24,
  write: () => true,
  hasColors: () => true,
  getColorDepth: () => 24,
  ref: () => {},
  unref: () => {}
};

process.stdout = (process.stdout ?? stubStream) as NodeJS.WriteStream;
process.stderr = (process.stderr ?? stubStream) as NodeJS.WriteStream;
(globalThis as typeof globalThis & { process: typeof process }).process = process;
(globalThis as typeof globalThis & { FORCE_COLOR?: number }).FORCE_COLOR = 3;

try {
  (chalk as typeof chalk & { level?: number }).level = 3;
  (chalk as typeof chalk & { supportsColor?: { level: number } }).supportsColor = { level: 3 };
} catch {
  // Ignore if chalk is read-only in this environment.
}
