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

process.stdout = process.stdout || stubStream;
process.stderr = process.stderr || stubStream;
globalThis.process = process;
globalThis.FORCE_COLOR = 3;

try {
	chalk.level = 3;
	chalk.supportsColor = { level: 3 };
} catch {
	// Ignore if chalk is read-only in this environment.
}
