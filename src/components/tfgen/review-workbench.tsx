"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CategoryIcon, categoryClasses } from "./categories";
import type { VariableSectionData, VariableState } from "./variable-section";
import type { TfvarsLine } from "./tfvars-preview";

/**
 * Step 3 — the review workbench.
 * Left: the full comparison, grouped by section with sticky headers.
 * Right: the generated .tfvars, live. Tabs collapse either pane.
 * A third tab ("fiche source") replaces both panes with a read-only,
 * spreadsheet-style table of the raw fields extracted from the imported
 * FIS file(s) — the exact label/value pairs as they appear in the sheet,
 * before any matching or derivation.
 */
type Pane = "split" | "diff" | "code" | "fields";

export interface SourceFieldGroup {
  fileName: string;
  entries: { key: string; value: string }[];
}

const rowTone: Record<VariableState, { row: string; input: string; label: string; text: string }> = {
  modified: {
    row: "border-l-diff bg-diff/[0.07]",
    input: "border-diff/45 text-diff-foreground",
    label: "modifiée",
    text: "text-diff-foreground",
  },
  default: {
    row: "border-l-transparent",
    input: "border-border text-muted-foreground",
    label: "défaut",
    text: "text-muted-foreground",
  },
  missing: {
    row: "border-l-destructive bg-destructive/[0.06]",
    input: "border-destructive/50 text-destructive",
    label: "manquante",
    text: "text-destructive",
  },
};

const GRID = "grid grid-cols-[1.4fr_1fr_1.2fr_74px] gap-3 px-3.5";

export function ReviewWorkbench({
  sections,
  lines,
  sourceFields,
  diffOnly = false,
  showLineNumbers = true,
  onDiffOnlyChange,
  onGenerate,
  onValueChange,
  status,
  className,
}: {
  sections: VariableSectionData[];
  lines: TfvarsLine[];
  /** Champs bruts de la ou des fiches importées (avant matching), affichés
   * dans l'onglet "fiche source". Onglet masqué si absent/vide. */
  sourceFields?: SourceFieldGroup[];
  diffOnly?: boolean;
  showLineNumbers?: boolean;
  onDiffOnlyChange?: (value: boolean) => void;
  onGenerate?: () => void;
  /** Identifie la variable par nom (et non par index), car l'index d'une
   * ligne se décale dès que le filtre "diff seulement" masque des lignes. */
  onValueChange?: (sectionId: string, rowName: string, value: string) => void;
  status?: { fmt: string; validate: string; destination: string; branch: string };
  className?: string;
}) {
  const [pane, setPane] = React.useState<Pane>("split");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (typing && !((e.metaKey || e.ctrlKey) && e.key === "Enter")) return;
      if (e.shiftKey && e.key.toLowerCase() === "d") onDiffOnlyChange?.(!diffOnly);
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onGenerate?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [diffOnly, onDiffOnlyChange, onGenerate]);

  const visible = diffOnly
    ? sections.map((s) => ({ ...s, rows: s.rows.filter((r) => r.state !== "default") }))
    : sections;

  const cols = pane === "diff" ? "1fr 0fr" : pane === "code" ? "0fr 1fr" : "1.15fr 1fr";
  const toggle = (next: Pane) => setPane((p) => (p === next ? "split" : next));
  const hasSourceFields = !!sourceFields && sourceFields.some((g) => g.entries.length > 0);

  const totalVars = sections.reduce((n, s) => n + s.rows.length, 0);
  const totalModified = sections.reduce(
    (n, s) => n + s.rows.filter((r) => r.state === "modified").length,
    0,
  );

  return (
    <div
      className={cn(
        "flex h-[620px] flex-col overflow-hidden rounded-xl border border-border bg-background",
        className,
      )}
    >
      {/* tabs */}
      <div className="flex h-10 shrink-0 items-stretch border-b border-border">
        <button
          type="button"
          onClick={() => toggle("diff")}
          className={cn(
            "flex items-center gap-2 border-r border-border px-4 font-mono text-[11.5px]",
            pane === "code" ? "text-muted-foreground" : "bg-card text-foreground",
          )}
        >
          <span className={cn("size-1.5 rounded-full", pane === "code" ? "bg-[#45403A]" : "bg-accent")} />
          revue.diff
        </button>
        <button
          type="button"
          onClick={() => toggle("code")}
          className={cn(
            "flex items-center border-r border-border px-4 font-mono text-[11.5px]",
            pane === "code" ? "bg-card text-foreground" : "text-muted-foreground",
          )}
        >
          terraform.tfvars
        </button>
        {hasSourceFields && (
          <button
            type="button"
            onClick={() => setPane((p) => (p === "fields" ? "split" : "fields"))}
            className={cn(
              "flex items-center gap-2 border-r border-border px-4 font-mono text-[11.5px]",
              pane === "fields" ? "bg-card text-foreground" : "text-muted-foreground",
            )}
          >
            <span className={cn("size-1.5 rounded-full", pane === "fields" ? "bg-accent" : "bg-[#45403A]")} />
            fiche source
          </button>
        )}
        <div className="ml-auto flex items-center gap-2 px-3">
          <button
            type="button"
            onClick={() => onDiffOnlyChange?.(!diffOnly)}
            title="Basculer — raccourci ⇧D"
            className={cn(
              "rounded-md border px-2 py-1 font-mono text-[10.5px]",
              diffOnly ? "border-diff/50 text-diff-foreground" : "border-border text-muted-foreground",
            )}
          >
            ⇧D diff
          </button>
          <Button size="sm" onClick={onGenerate} title="Générer — raccourci ⌘⏎ / Ctrl+⏎">
            Générer le .tfvars
          </Button>
        </div>
      </div>

      {/* panes */}
      {pane === "fields" ? (
        <div className="tfgen-scroll min-h-0 flex-1 overflow-y-auto p-3.5">
          {sourceFields!
            .filter((g) => g.entries.length > 0)
            .map((group, gi) => (
              <div key={gi} className="mb-4 flex flex-col gap-2 last:mb-0">
                {sourceFields!.length > 1 && (
                  <div className="font-mono text-xs text-accent">{group.fileName}</div>
                )}
                <div className="overflow-hidden rounded-lg border border-border">
                  {group.entries.map((e, i) => (
                    <div
                      key={i}
                      className={cn(
                        "grid grid-cols-[1fr_1.4fr] border-b border-border last:border-b-0",
                        i % 2 === 0 ? "bg-card" : "bg-transparent",
                      )}
                    >
                      <div className="border-r border-border px-3 py-1.5 text-[12.5px] font-medium text-secondary-foreground">
                        {e.key}
                      </div>
                      <div className="px-3 py-1.5 font-mono text-[12.5px] text-foreground">{e.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: cols }}>
        <div className="flex min-w-0 flex-col overflow-hidden border-r border-border">
          <div
            className={cn(
              GRID,
              "shrink-0 border-b border-border py-2 font-mono text-[9.5px] uppercase tracking-widest text-muted-foreground",
            )}
          >
            <span>variable</span>
            <span>défaut</span>
            <span>fiche</span>
            <span>état</span>
          </div>

          <div className="tfgen-scroll min-h-0 flex-1 overflow-y-auto">
            {visible.map((section) => {
              const modified = section.rows.filter((r) => r.state === "modified").length;
              return (
                <div key={section.id}>
                  <div className="sticky top-0 flex items-center gap-2 border-y border-border bg-[#171613] px-3.5 py-1.5">
                    <CategoryIcon
                      category={section.category}
                      className={cn("size-3.5 border-0 bg-transparent", categoryClasses(section.category))}
                    />
                    <span className="font-mono text-[11.5px] text-foreground">{section.title}</span>
                    <span
                      className={cn(
                        "ml-auto font-mono text-[10.5px]",
                        modified ? "text-diff-foreground" : "text-muted-foreground",
                      )}
                    >
                      {modified ? `${modified} modifiées` : "inchangée"}
                    </span>
                  </div>

                  {section.rows.map((row) => {
                    const tone = rowTone[row.state];
                    return (
                      <div
                        key={row.name}
                        className={cn(
                          GRID,
                          "items-center border-b border-l-2 border-b-[#171613] py-1 hover:bg-popover",
                          tone.row,
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate font-mono text-xs text-secondary-foreground">
                            {row.name}
                          </span>
                          <span className="shrink-0 rounded border border-border px-1 font-mono text-[9.5px] text-muted-foreground">
                            {row.type}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "truncate font-mono text-[11.5px] text-muted-foreground",
                            row.state === "modified" && "line-through",
                          )}
                        >
                          {row.defaultValue || "—"}
                        </span>
                        <input
                          value={row.finalValue}
                          placeholder={row.state === "missing" ? "valeur requise" : undefined}
                          onChange={(e) => onValueChange?.(section.id, row.name, e.target.value)}
                          className={cn(
                            "w-full rounded-[5px] border bg-code px-1.5 py-0.5 font-mono text-[11.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            tone.input,
                          )}
                        />
                        <span className={cn("font-mono text-[10px]", tone.text)}>{tone.label}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden bg-code">
          <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-3.5 py-2">
            <span className="font-mono text-[9.5px] uppercase tracking-widest text-muted-foreground">
              sortie · aperçu live
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] text-diff-foreground">
              <span className="h-2.5 w-2.5 rounded-sm border-l-2 border-diff bg-diff/35" />
              issu de la fiche
            </span>
          </div>

          <div className="tfgen-scroll min-h-0 flex-1 overflow-auto py-2 font-mono text-xs leading-5">
            {lines.map((line, i) => {
              const changed = line.kind === "kv" && line.changed;
              const indent = "indent" in line ? (line.indent ?? 0) : 0;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-baseline border-l-2 border-transparent",
                    changed && "border-l-diff bg-diff/[0.11]",
                  )}
                >
                  {showLineNumbers && (
                    <span className="w-[42px] shrink-0 select-none pr-3 text-right text-[#4B463F]">
                      {i + 1}
                    </span>
                  )}
                  <span className="whitespace-pre" style={{ paddingLeft: indent }}>
                    {line.kind === "blank" && " "}
                    {line.kind === "comment" && <span className="text-[#6A635A]">{line.text}</span>}
                    {line.kind === "block" && <span className="text-[#EFC079]">{line.text}</span>}
                    {line.kind === "kv" && (
                      <>
                        <span className="text-[#E5B378]">{line.key}</span>
                        <span className="text-[#5E584F]"> = </span>
                        <span className={line.numeric ? "text-[#F2B672]" : "text-[#A6E0BF]"}>
                          {line.value}
                        </span>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* status bar */}
      <div className="flex h-7 shrink-0 items-center gap-4 border-t border-border px-3.5 font-mono text-[10.5px] text-muted-foreground">
        {status ? (
          <>
            <span className="text-diff-foreground">fmt {status.fmt}</span>
            <span className="text-diff-foreground">validate {status.validate}</span>
            <span>
              {totalVars} variables · {sections.length} sections
            </span>
            <span className="ml-auto">
              {status.destination} · {status.branch}
            </span>
          </>
        ) : (
          <>
            <span className="text-diff-foreground">{totalModified} modifiées</span>
            <span>
              {totalVars} variables · {sections.length} sections
            </span>
            <span className="ml-auto">⇧D bascule diff · ⌘⏎ génère</span>
          </>
        )}
      </div>
    </div>
  );
}
