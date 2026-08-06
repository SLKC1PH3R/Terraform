"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CategoryIcon, categoryClasses } from "./categories";
import { Icon, ICONS } from "./icons";
import { CopyButton } from "./copy-button";
import type { VariableSectionData, VariableState } from "./variable-section";
import type { TfvarsLine } from "./tfvars-preview";

/**
 * Step 3 — the review workbench, three panes side by side: fiche source
 * (raw label/value pairs from the imported FIS file, read-only) — revue.diff
 * (the full comparison, grouped by section with sticky headers) — sortie
 * .tfvars (generated, live). Each tab toggles its own pane's visibility
 * independently, they are not mutually exclusive.
 */
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
  content,
  sourceFields,
  diffOnly = false,
  showLineNumbers = true,
  onDiffOnlyChange,
  onGenerate,
  generateDisabled,
  onValueChange,
  status,
  className,
}: {
  sections: VariableSectionData[];
  lines: TfvarsLine[];
  /** Texte brut du .tfvars (aperçu live) — si fourni, affiche un bouton "Copier". */
  content?: string;
  /** Champs bruts de la ou des fiches importées (avant matching), affichés
   * dans l'onglet "fiche source". Onglet masqué si absent/vide. */
  sourceFields?: SourceFieldGroup[];
  diffOnly?: boolean;
  showLineNumbers?: boolean;
  onDiffOnlyChange?: (value: boolean) => void;
  onGenerate?: () => void;
  /** Bloque le bouton "Générer" (et le raccourci ⌘⏎) tant que des champs
   * obligatoires (ex. vmN_hostnum) sont vides — cf. GenerateView.tsx. */
  generateDisabled?: boolean;
  /** Identifie la variable par nom (et non par index), car l'index d'une
   * ligne se décale dès que le filtre "diff seulement" masque des lignes. */
  onValueChange?: (sectionId: string, rowName: string, value: string) => void;
  status?: { fmt: string; validate: string; destination: string; branch: string };
  className?: string;
}) {
  const hasSourceFields = !!sourceFields && sourceFields.some((g) => g.entries.length > 0);
  const [query, setQuery] = React.useState("");

  const [showFields, setShowFields] = React.useState(true);
  const [showDiff, setShowDiff] = React.useState(true);
  const [showCode, setShowCode] = React.useState(true);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (typing && !((e.metaKey || e.ctrlKey) && e.key === "Enter")) return;
      if (e.shiftKey && e.key.toLowerCase() === "d") onDiffOnlyChange?.(!diffOnly);
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !generateDisabled) onGenerate?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [diffOnly, onDiffOnlyChange, onGenerate, generateDisabled]);

  const q = query.trim().toLowerCase();
  const visible = sections
    .map((s) => ({
      ...s,
      rows: s.rows.filter((r) => (!diffOnly || r.state !== "default") && (!q || r.name.toLowerCase().includes(q))),
    }))
    .filter((s) => s.rows.length > 0);

  const cols = [
    hasSourceFields ? (showFields ? "0.85fr" : "0fr") : null,
    showDiff ? "1.15fr" : "0fr",
    showCode ? "1fr" : "0fr",
  ]
    .filter((c): c is string => c !== null)
    .join(" ");

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
        {hasSourceFields && (
          <button
            type="button"
            onClick={() => setShowFields((v) => !v)}
            className={cn(
              "flex items-center gap-2 border-r border-border px-4 font-mono text-[11.5px]",
              showFields ? "bg-card text-foreground" : "text-muted-foreground",
            )}
          >
            <span className={cn("size-1.5 rounded-full", showFields ? "bg-accent" : "bg-[#45403A]")} />
            fiche source
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowDiff((v) => !v)}
          className={cn(
            "flex items-center gap-2 border-r border-border px-4 font-mono text-[11.5px]",
            showDiff ? "bg-card text-foreground" : "text-muted-foreground",
          )}
        >
          <span className={cn("size-1.5 rounded-full", showDiff ? "bg-accent" : "bg-[#45403A]")} />
          revue.diff
        </button>
        <button
          type="button"
          onClick={() => setShowCode((v) => !v)}
          className={cn(
            "flex items-center gap-2 border-r border-border px-4 font-mono text-[11.5px]",
            showCode ? "bg-card text-foreground" : "text-muted-foreground",
          )}
        >
          <span className={cn("size-1.5 rounded-full", showCode ? "bg-accent" : "bg-[#45403A]")} />
          terraform.tfvars
        </button>
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
          <Button
            size="sm"
            onClick={onGenerate}
            disabled={generateDisabled}
            title={
              generateDisabled
                ? "Complétez les champs obligatoires (ex. n° d'hôte) avant de générer"
                : "Générer — raccourci ⌘⏎ / Ctrl+⏎"
            }
          >
            Générer le .tfvars
          </Button>
        </div>
      </div>

      {/* panes */}
      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: cols }}>
        {hasSourceFields && (
          <div className={cn("flex min-w-0 flex-col overflow-hidden border-r border-border", !showFields && "invisible")}>
            <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-3.5 py-2">
              <span className="font-mono text-[9.5px] uppercase tracking-widest text-muted-foreground">
                fiche source
              </span>
            </div>
            <div className="tfgen-scroll min-h-0 flex-1 overflow-y-auto p-3">
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
                            "grid grid-cols-[1fr_1.2fr] border-b border-border last:border-b-0",
                            i % 2 === 0 ? "bg-card" : "bg-transparent",
                          )}
                        >
                          <div className="truncate border-r border-border px-2.5 py-1.5 text-[11.5px] font-medium text-secondary-foreground">
                            {e.key}
                          </div>
                          <div className="truncate px-2.5 py-1.5 font-mono text-[11.5px] text-foreground">
                            {e.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className={cn("flex min-w-0 flex-col overflow-hidden border-r border-border", !showDiff && "invisible")}>
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-3.5 py-1.5">
            <Icon path={ICONS.search} size={12} className="shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrer les variables…"
              className="min-w-0 flex-1 bg-transparent font-mono text-[11.5px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground"
              >
                effacer
              </button>
            )}
          </div>
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

        <div className={cn("flex min-w-0 flex-col overflow-hidden bg-code", !showCode && "invisible")}>
          <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-3.5 py-2">
            <span className="font-mono text-[9.5px] uppercase tracking-widest text-muted-foreground">
              sortie · aperçu live
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] text-diff-foreground">
              <span className="h-2.5 w-2.5 rounded-sm border-l-2 border-diff bg-diff/35" />
              issu de la fiche
            </span>
            {content && <CopyButton text={content} />}
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
