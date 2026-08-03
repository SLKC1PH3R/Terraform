"use client";

import { Icon, ICONS } from "./icons";
import { metaFor } from "./category-meta";
import { ApiGeneration, formatRelative } from "./views/shared";

/**
 * One generations table, shared by the dashboard and the History view.
 * Row status dot: green = generated, red = failed parse.
 */
export function GenerationsTable({
  generations,
  loading,
  deletingId,
  onDelete,
}: {
  generations: ApiGeneration[];
  loading?: boolean;
  deletingId?: string | null;
  onDelete?: (generation: ApiGeneration) => void;
}) {
  const COLS = "grid grid-cols-[1.7fr_1.2fr_0.8fr_196px] items-center gap-3.5 px-3.5";

  return (
    <div className="overflow-hidden rounded-xl border border-secondary bg-card">
      <div
        className={`${COLS} border-b border-secondary bg-[#171613] py-2 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`}
      >
        <span>Fiche importée</span>
        <span>Template</span>
        <span>Date</span>
        <span className="text-right">Actions</span>
      </div>

      {loading ? (
        <div className="p-3.5 text-[12.5px] text-muted-foreground">Chargement…</div>
      ) : generations.length === 0 ? (
        <div className="p-3.5 text-[12.5px] text-muted-foreground">
          Aucune génération pour le moment.
        </div>
      ) : (
        generations.map((g) => {
          const meta = metaFor(g.template.category);
          return (
            <div
              key={g.id}
              className={`${COLS} border-b border-[#171613] py-2 transition-colors last:border-b-0 hover:bg-[#1E1B18]`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`size-1.5 shrink-0 rounded-full ${
                    g.hasSourceFile ? "bg-primary" : "bg-destructive"
                  }`}
                />
                <span className="truncate font-mono text-xs text-secondary-foreground">
                  {g.fileName}
                </span>
              </div>

              <div className="flex min-w-0 items-center gap-1.5">
                <span className={`shrink-0 ${meta.text}`}>
                  <Icon path={meta.icon} size={13} />
                </span>
                <span className="truncate font-mono text-[11.5px] text-muted-foreground">
                  {g.template.name}
                </span>
              </div>

              <span className="text-[11.5px] tabular-nums text-muted-foreground">
                {formatRelative(g.createdAt)}
              </span>

              <div className="flex justify-end gap-1.5">
                {g.hasSourceFile && (
                  <button
                    type="button"
                    onClick={() => window.open(`/api/generate/${g.id}/source`, "_blank")}
                    className="inline-flex items-center gap-1 rounded-[7px] border border-border bg-transparent px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
                  >
                    <Icon path={ICONS.file} size={12} />
                    Fiche
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => window.open(`/api/generate/${g.id}/download`, "_blank")}
                  className="inline-flex items-center gap-1 rounded-[7px] border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-[#9BE3B8] transition-colors hover:border-primary hover:bg-primary/20"
                >
                  <Icon path={ICONS.download} size={12} />
                  .tfvars
                </button>
                {onDelete && (
                  <button
                    type="button"
                    title="Supprimer"
                    disabled={deletingId === g.id}
                    onClick={() => onDelete(g)}
                    className="grid size-[26px] shrink-0 place-items-center rounded-[7px] border border-border bg-transparent text-muted-foreground transition-colors hover:border-[#54302A] hover:text-destructive disabled:opacity-40"
                  >
                    <Icon path={ICONS.trash} size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
