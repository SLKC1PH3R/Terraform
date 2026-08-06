"use client";

import { Icon, ICONS } from "./icons";
import { metaFor } from "./category-meta";
import { ApiGeneration, formatRelative } from "./views/shared";

/**
 * Liste compacte des dernières générations, pensée pour une colonne étroite
 * (barre latérale du tableau de bord) — contrairement à GenerationsTable
 * (grille à colonnes fixes), les lignes empilent leurs infos verticalement
 * pour rester lisibles sous ~320px.
 */
export function RecentGenerationsPanel({
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
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-secondary bg-card">
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
              className="flex flex-col gap-1.5 border-b border-[#171613] px-3.5 py-2.5 transition-colors last:border-b-0 hover:bg-[#1E1B18]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`size-1.5 shrink-0 rounded-full ${
                    g.hasSourceFile ? "bg-primary" : "bg-destructive"
                  }`}
                />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-secondary-foreground">
                  {g.fileName}
                </span>
              </div>

              <div className="flex min-w-0 items-center gap-1.5">
                <span className={`shrink-0 ${meta.text}`}>
                  <Icon path={meta.icon} size={12} />
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                  {g.template.name}
                </span>
                <span className="shrink-0 whitespace-nowrap text-[10.5px] tabular-nums text-muted-foreground">
                  {formatRelative(g.createdAt)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 pt-0.5">
                {g.hasSourceFile && (
                  <button
                    type="button"
                    onClick={() => window.open(`/api/generate/${g.id}/source`, "_blank")}
                    className="inline-flex items-center gap-1 rounded-[7px] border border-border bg-transparent px-2 py-1 text-[10.5px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
                  >
                    <Icon path={ICONS.file} size={11} />
                    Fiche
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => window.open(`/api/generate/${g.id}/download`, "_blank")}
                  className="inline-flex items-center gap-1 rounded-[7px] border border-primary/40 bg-primary/10 px-2 py-1 text-[10.5px] font-semibold text-[#9BE3B8] transition-colors hover:border-primary hover:bg-primary/20"
                >
                  <Icon path={ICONS.download} size={11} />
                  .tfvars
                </button>
                {onDelete && (
                  <button
                    type="button"
                    title="Supprimer"
                    disabled={deletingId === g.id}
                    onClick={() => onDelete(g)}
                    className="ml-auto grid size-[24px] shrink-0 place-items-center rounded-[7px] border border-border bg-transparent text-muted-foreground transition-colors hover:border-[#54302A] hover:text-destructive disabled:opacity-40"
                  >
                    <Icon path={ICONS.trash} size={11} />
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
