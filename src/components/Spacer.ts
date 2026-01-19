import React from "react";
import { Box } from "ink";
import type { ResolvedNode } from "../types.js";

const DEFAULT_SPACER_LINES = 1;

export const A2uiSpacer: React.FC<{ node: ResolvedNode }> = ({ node }) => {
	const props = node.props ?? {};
	const rawLines = props.lines ?? props.size ?? props.height ?? DEFAULT_SPACER_LINES;
	const lines = coerceNumber(rawLines, DEFAULT_SPACER_LINES);

	return React.createElement(Box, { height: lines, flexShrink: 0 });
};

function coerceNumber(value: unknown, fallback: number): number {
	const numeric = typeof value === "number" ? value : Number(value);
	if (Number.isFinite(numeric) && numeric > 0) {
		return Math.floor(numeric);
	}
	return fallback;
}
