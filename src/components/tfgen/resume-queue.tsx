"use client";

import { Icon, ICONS } from "./icons";
import { CategoryChip, metaFor } from "./category-meta";
import type { ApiGeneration } from "./views/shared";

/**
 * "Reprendre" — the actionable strip that replaces the three decorative
 * counters (Templates actifs / Générations 30 j / Variables suivies).
 *
 * `step` is 1-4 for a generation still in flight; `blocked` marks a sheet whose
 * parsing failed (missing column, unknown header…). Wire this from whatever
 * draft/error state your API exposes; the shape below is all the UI needs.
 */
export interface ResumeItem {
  id: string;
  fileName: string;
  category: string;
  detail: string;
  step?: 1 | 2 | 3 | 4;
  blocked?: boolean;
  action: string;
}

const STEP_LABEL: Record<number, { label: string; pct: string }> = {
  1: { label: "étape 1 / 4", pct: "25%" },
  2: { label: "étape 2 / 4", pct: "50%" },
  3: { label: "étape 3 / 4", pct: "75%" },
  4: { label: "étape 4 / 4", pct: "100%" },
};

export function ResumeQueue({
  items,
  onResume,
}: {
  items: ResumeItem[];
  onResume: (item: ResumeItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2.5">
        <h2 className="m-0 text-[14px] font-semibold tracking-[-0.01em]">Reprendre</h2>
        <span className="text-[12.5px] text-muted-foreground">
          Générations laissées en cours et fiches à corriger.
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {items.map((item) => {
          const step = item.blocked ? { label: "bloquée", pct: "30%" } : STEP_LABEL[item.step ?? 1];
          const tone = item.blocked
            ? {
                border: "border-[#54302A]",
                text: "text-destructive",
                bar: "bg-destructive",
                tint: "bg-destructive/10",
                hoverBg: "hover:bg-destructive/10",
              }
            : {
                border: "border-[#5C4420]",
                text: "text-accent",
                bar: "bg-accent",
                tint: "bg-accent/11",
                hoverBg: "hover:bg-accent/11",
              };

          return (
            <div
              key={item.id}
              className="flex items-center gap-3.5 rounded-xl border border-secondary bg-card px-3.5 py-2.5 transition-colors hover:border-[#38342E] hover:bg-[#1E1B18]"
            >
              <span
                className={`grid size-[30px] shrink-0 place-items-center rounded-[9px] border ${tone.border} ${tone.tint} ${tone.text}`}
              >
                <Icon path={item.blocked ? ICONS.warning : ICONS.wand} size={15} />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-mono text-[12.5px] text-foreground">{item.fileName}</span>
                  <CategoryChip category={item.category} />
                </div>
                <span className="text-[11.5px] text-muted-foreground">{item.detail}</span>
              </div>

              <div className="flex shrink-0 items-center gap-3.5">
                <div className="flex flex-col items-end gap-1.5">
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    {step.label}
                  </span>
                  <div className="h-[3px] w-[116px] overflow-hidden rounded-full bg-secondary">
                    <div className={`h-[3px] rounded-full ${tone.bar}`} style={{ width: step.pct }} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onResume(item)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${tone.border} ${tone.text} ${tone.hoverBg}`}
                >
                  {item.action}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Derives the queue from the generations list. Adapt the predicate to your own
 * draft flag — by default nothing is inferred, so pass `items` yourself if your
 * API already tracks unfinished generations.
 */
export function resumeItemsFrom(generations: ApiGeneration[]): ResumeItem[] {
  return generations
    .filter((g) => !g.hasSourceFile)
    .slice(0, 3)
    .map((g) => ({
      id: g.id,
      fileName: g.fileName,
      category: g.template.category,
      detail: `${metaFor(g.template.category).label} · fiche source absente`,
      blocked: true,
      action: "Corriger",
    }));
}
