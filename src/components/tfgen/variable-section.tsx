"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CategoryIcon, categoryClasses, type ResourceCategory } from "./categories";
import { cn } from "@/lib/utils";

export type VariableState = "modified" | "default" | "missing";

export interface VariableRowData {
  name: string;
  type: string;
  defaultValue: string;
  finalValue: string;
  state: VariableState;
}

export interface VariableSectionData {
  id: string;
  title: string;
  category: ResourceCategory;
  rows: VariableRowData[];
}

const GRID = "grid grid-cols-[1.5fr_1.1fr_1.3fr_0.6fr] gap-3 px-3.5";

const rowClasses: Record<VariableState, string> = {
  modified: "border-l-diff bg-diff/[0.07]",
  default: "border-l-transparent",
  missing: "border-l-destructive bg-destructive/[0.06]",
};

const inputClasses: Record<VariableState, string> = {
  modified: "border-diff/45 text-diff-foreground",
  default: "border-border text-muted-foreground",
  missing: "border-destructive/50 text-destructive",
};

const stateLabel: Record<VariableState, string> = {
  modified: "modifiée",
  default: "défaut",
  missing: "manquante",
};

export function VariableRow({
  row,
  onChange,
}: {
  row: VariableRowData;
  onChange?: (value: string) => void;
}) {
  return (
    <div
      className={cn(
        GRID,
        "items-center border-b border-l-2 border-border py-2",
        rowClasses[row.state],
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-mono text-[12.5px] text-secondary-foreground">
          {row.name}
        </span>
        <span className="shrink-0 rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground">
          {row.type}
        </span>
      </div>
      <span
        className={cn(
          "truncate font-mono text-xs text-muted-foreground",
          row.state === "modified" && "line-through",
        )}
      >
        {row.defaultValue || "—"}
      </span>
      <Input
        value={row.finalValue}
        placeholder={row.state === "missing" ? "valeur requise" : undefined}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn("h-7 bg-code font-mono text-xs", inputClasses[row.state])}
      />
      <span
        className={cn(
          "font-mono text-[10.5px]",
          row.state === "modified" && "text-diff-foreground",
          row.state === "default" && "text-muted-foreground",
          row.state === "missing" && "text-destructive",
        )}
      >
        {stateLabel[row.state]}
      </span>
    </div>
  );
}

export function VariableSection({
  section,
  open,
  onToggle,
  onRowChange,
}: {
  section: VariableSectionData;
  open: boolean;
  onToggle: () => void;
  onRowChange?: (rowIndex: number, value: string) => void;
}) {
  const modified = section.rows.filter((r) => r.state === "modified").length;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 bg-popover px-3.5 py-2.5 text-left hover:bg-[#24211D]"
      >
        {open ? (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground" />
        )}
        <CategoryIcon
          category={section.category}
          className={cn("size-[15px] border-0 bg-transparent", categoryClasses(section.category))}
        />
        <span className="font-mono text-[13px]">{section.title}</span>
        <span className="ml-auto text-[11.5px] text-muted-foreground">
          {section.rows.length} variables
        </span>
        <span
          className={cn(
            "font-mono text-[11.5px]",
            modified ? "text-diff-foreground" : "text-muted-foreground",
          )}
        >
          {modified ? `${modified} modifiées` : "inchangée"}
        </span>
      </button>

      {open && (
        <div>
          <div
            className={cn(
              GRID,
              "border-b border-border py-2 text-[9.5px] uppercase tracking-widest text-muted-foreground",
            )}
          >
            <span>Variable</span>
            <span>Valeur par défaut</span>
            <span>Valeur finale (fiche)</span>
            <span>État</span>
          </div>
          {section.rows.map((row, i) => (
            <VariableRow key={row.name} row={row} onChange={(v) => onRowChange?.(i, v)} />
          ))}
        </div>
      )}
    </div>
  );
}
