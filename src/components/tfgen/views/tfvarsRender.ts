import type { TfvarsLine, VariableRowData, VariableSectionData } from "../components";
import { toDesignCategory } from "./shared";

export interface Row {
  name: string;
  type: string;
  defaultValue: string;
  finalValue: string;
  matched: boolean;
  group: string;
}

export interface DiffEntry {
  name: string;
  defaultValue: string | null;
  finalValue: string;
  changed: boolean;
}

export interface BuildResult {
  id: string;
  content: string;
  diff: DiffEntry[];
}

export function rowState(r: Row): VariableRowData["state"] {
  if (r.finalValue.trim() === "") return "missing";
  if (r.finalValue.trim() !== r.defaultValue.trim()) return "modified";
  return "default";
}

export function buildSections(title: string, dbCategory: string, rows: Row[]): VariableSectionData[] {
  const category = toDesignCategory(dbCategory);
  const byGroup = new Map<string, Row[]>();
  const ungrouped: Row[] = [];

  for (const r of rows) {
    if (r.group) {
      if (!byGroup.has(r.group)) byGroup.set(r.group, []);
      byGroup.get(r.group)!.push(r);
    } else {
      ungrouped.push(r);
    }
  }

  const toRowData = (r: Row): VariableRowData => ({
    name: r.name,
    type: r.type,
    defaultValue: r.defaultValue,
    finalValue: r.finalValue,
    state: rowState(r),
  });

  const sections: VariableSectionData[] = [];
  if (ungrouped.length) {
    sections.push({ id: "_root", title, category, rows: ungrouped.map(toRowData) });
  }
  for (const [group, groupRows] of byGroup) {
    sections.push({ id: group, title: group, category, rows: groupRows.map(toRowData) });
  }
  return sections;
}

/** Même règle que /api/generate/[id]/download : nommé d'après la variable "env" si présente. */
export function deriveFileName(content: string, fallback: string): string {
  const envMatch = content.match(/^env\s*=\s*"([^"]*)"\s*$/m);
  const base = (envMatch?.[1] || fallback).replace(/[^a-zA-Z0-9-_]/g, "_");
  return envMatch ? `${base}.tfvars` : `${base}.auto.tfvars`;
}

export function contentToLines(content: string, diff: DiffEntry[]): TfvarsLine[] {
  const changedNames = new Set(diff.filter((d) => d.changed).map((d) => d.name));
  const rawLines = content.split("\n").filter((l, i, arr) => !(i === arr.length - 1 && l === ""));
  let depth = 0;
  const lines: TfvarsLine[] = [];

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (trimmed === "") {
      lines.push({ kind: "blank" });
      continue;
    }
    if (trimmed.startsWith("#") || trimmed.startsWith("//")) {
      lines.push({ kind: "comment", text: trimmed });
      continue;
    }
    if (trimmed.endsWith("= {")) {
      lines.push({ kind: "block", text: trimmed, indent: depth * 20 });
      depth++;
      continue;
    }
    if (trimmed === "}") {
      depth = Math.max(0, depth - 1);
      lines.push({ kind: "block", text: trimmed, indent: depth * 20 });
      continue;
    }
    const m = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*(.*)$/);
    if (m) {
      const key = m[1];
      const value = m[2];
      const numeric = /^-?\d+(\.\d+)?$|^(true|false|null)$/.test(value);
      lines.push({ kind: "kv", key, value, indent: depth * 20, numeric, changed: changedNames.has(key) });
      continue;
    }
    lines.push({ kind: "block", text: trimmed, indent: depth * 20 });
  }
  return lines;
}
