export function getItemLabel(item: unknown): string {
  if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
    return String(item);
  }

  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    const label = record.label ?? record.text ?? record.name;
    if (label) {
      return String(label);
    }
  }

  return JSON.stringify(item);
}

export function normalizeRow(row: unknown, expectedLength: number): string[] {
  if (Array.isArray(row)) {
    return row.map(getItemLabel).slice(0, expectedLength);
  }
  if (row && typeof row === "object") {
    const record = row as Record<string, unknown>;
    return Object.values(record).map(getItemLabel).slice(0, expectedLength);
  }
  return [getItemLabel(row)];
}

export function getColumnWidths(headers: string[], rows: string[][]): number[] {
  const widths = headers.map((header) => header.length);
  rows.forEach((row) => {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index] ?? 0, cell.length);
    });
  });
  return widths;
}

export function formatRow(cells: string[], widths: number[]): string {
  return cells
    .map((cell, index) => cell.padEnd(widths[index] ?? cell.length, " "))
    .join("  ");
}
