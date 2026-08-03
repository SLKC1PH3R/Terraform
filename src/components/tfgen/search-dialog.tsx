"use client";

import * as React from "react";
import { Icon, ICONS } from "./icons";
import { CategoryChip, metaFor } from "./category-meta";
import { ApiGeneration, ApiTemplate, formatRelative } from "./views/shared";

/**
 * ⌘K command palette wired to the AppHeader search field. Filters templates
 * (nom, description, catégorie) et fiches générées (nom de fichier, nom du
 * template) côté client — pas d'appel réseau, les deux listes sont déjà
 * chargées par AppShell.
 */
export function SearchDialog({
  open,
  onClose,
  templates,
  generations,
  onSelectTemplate,
  onSelectGeneration,
}: {
  open: boolean;
  onClose: () => void;
  templates: ApiTemplate[];
  generations: ApiGeneration[];
  onSelectTemplate: (id: string) => void;
  onSelectGeneration: (generation: ApiGeneration) => void;
}) {
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const q = query.trim().toLowerCase();

  const matchedTemplates = (
    q
      ? templates.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            (t.description || "").toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q),
        )
      : templates
  ).slice(0, 8);

  const matchedGenerations = (
    q
      ? generations.filter(
          (g) => g.fileName.toLowerCase().includes(q) || g.template.name.toLowerCase().includes(q),
        )
      : generations
  ).slice(0, 8);

  const noResults = !!q && matchedTemplates.length === 0 && matchedGenerations.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[14vh]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-[560px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-secondary px-4 py-3">
          <Icon path={ICONS.search} size={16} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un template, une fiche…"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <span className="shrink-0 rounded-[5px] border border-border px-1.5 py-px font-mono text-[10px] text-muted-foreground">
            Échap
          </span>
        </div>

        <div className="tfgen-scroll min-h-0 flex-1 overflow-y-auto p-2">
          {noResults && (
            <p className="px-2.5 py-6 text-center text-[13px] text-muted-foreground">
              Aucun résultat pour « {query} ».
            </p>
          )}

          {matchedTemplates.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Templates
              </div>
              {matchedTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTemplate(t.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-popover"
                >
                  <span className={`shrink-0 ${metaFor(t.category).text}`}>
                    <Icon path={metaFor(t.category).icon} size={15} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-foreground">
                    {t.name}
                  </span>
                  <CategoryChip category={t.category} />
                </button>
              ))}
            </div>
          )}

          {matchedGenerations.length > 0 && (
            <div className="mt-1 flex flex-col gap-0.5">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Fiches générées
              </div>
              {matchedGenerations.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onSelectGeneration(g)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-popover"
                >
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${g.hasSourceFile ? "bg-primary" : "bg-destructive"}`}
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-foreground">
                    {g.fileName}
                  </span>
                  <span className="max-w-[140px] shrink-0 truncate font-mono text-[11px] text-muted-foreground">
                    {g.template.name}
                  </span>
                  <span className="shrink-0 text-[10.5px] text-muted-foreground">
                    {formatRelative(g.createdAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
