"use client";

import { CategoryTile, metaFor } from "./category-meta";
import { Icon, ICONS } from "./icons";

export interface TemplateCardData {
  id: string;
  name: string;
  category: string;
  description: string;
  variableCount: number;
  updatedAt: string;
}

/**
 * v2 template card. The second line carries the human category label.
 * `min-h` on the description keeps card footers aligned across a row.
 */
export function TemplateCard({
  template,
  protected: isProtected,
  onEdit,
  onGenerate,
  onDuplicate,
  onDelete,
}: {
  template: TemplateCardData;
  /** Template de base (Model-Ressource) — affiche un cadenas informatif ;
   * la suppression reste possible mais passe par un pop-up d'avertissement. */
  protected?: boolean;
  onEdit?: () => void;
  onGenerate?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}) {
  const meta = metaFor(template.category);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-secondary bg-card p-3.5 transition-all duration-150 hover:-translate-y-px hover:border-[#38342E] hover:shadow-[0_10px_26px_rgba(0,0,0,0.35)]">
      <div className="flex items-start gap-3">
        <CategoryTile category={template.category} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-1.5 truncate font-mono text-[13px] text-foreground">
            <span className="truncate">{template.name}</span>
            {isProtected && (
              <span title="Template de base — voir la duplication avant suppression" className="shrink-0 text-muted-foreground">
                <Icon path={ICONS.lock} size={11} />
              </span>
            )}
          </span>
          <span className={`text-[11px] ${meta.text}`}>{meta.label}</span>
        </div>
      </div>

      <p className="m-0 min-h-[39px] text-pretty text-[12.5px] leading-[1.55] text-muted-foreground">
        {template.description}
      </p>

      <div className="flex items-center gap-2 border-t border-secondary pt-3">
        <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
          {template.variableCount} variables
        </span>
        <span className="size-[3px] rounded-full bg-[#38342E]" />
        <span className="text-[10.5px] text-muted-foreground">{template.updatedAt}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              title="Dupliquer ce template"
              className="grid size-[26px] shrink-0 place-items-center rounded-lg border border-border bg-transparent text-muted-foreground transition-colors hover:border-[#38342E] hover:bg-secondary hover:text-secondary-foreground"
            >
              <Icon path={ICONS.copyDuplicate} size={12} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Supprimer ce template"
              className="grid size-[26px] shrink-0 place-items-center rounded-lg border border-border bg-transparent text-muted-foreground transition-colors hover:border-[#54302A] hover:text-destructive"
            >
              <Icon path={ICONS.trash} size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-border bg-transparent px-2.5 py-1 text-[11.5px] font-medium text-secondary-foreground transition-colors hover:border-[#38342E] hover:bg-secondary"
          >
            Éditer
          </button>
          <button
            type="button"
            onClick={onGenerate}
            className="rounded-lg border border-[#5C4420] bg-accent/11 px-2.5 py-1 text-[11.5px] font-semibold text-[#F3C88C] transition-colors hover:border-accent hover:bg-accent/20"
          >
            Générer
          </button>
        </div>
      </div>
    </div>
  );
}

/** Shimmer placeholder shown while /api/templates resolves. */
export function TemplateCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex animate-pulse flex-col gap-3 rounded-xl border border-secondary bg-card p-3.5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <span className="size-[34px] rounded-[10px] bg-secondary" />
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="h-[9px] w-[55%] rounded-full bg-[#262320]" />
          <span className="h-[7px] w-[32%] rounded-full bg-secondary" />
        </div>
      </div>
      <span className="h-[7px] w-[92%] rounded-full bg-secondary" />
      <span className="h-[7px] w-[68%] rounded-full bg-secondary" />
      <div className="flex gap-1.5 border-t border-secondary pt-3">
        <span className="h-2 w-[72px] rounded-full bg-secondary" />
        <span className="ml-auto h-[22px] w-[62px] rounded-lg bg-secondary" />
      </div>
    </div>
  );
}
