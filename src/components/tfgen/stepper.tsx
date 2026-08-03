"use client";

import { cn } from "@/lib/utils";

export interface StepDef {
  label: string;
  hint?: string;
}

export function Stepper({
  steps,
  current,
  onSelect,
}: {
  steps: StepDef[];
  current: number;
  onSelect?: (step: number) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-xl border border-border bg-card">
      {steps.map((step, idx) => {
        const n = idx + 1;
        const active = n === current;
        const done = n < current;
        return (
          <button
            key={step.label}
            type="button"
            onClick={() => onSelect?.(n)}
            className={cn(
              "flex flex-1 items-center gap-3 border-b-2 px-4 py-3.5 text-left transition-colors hover:bg-popover",
              active ? "border-b-accent bg-popover" : done ? "border-b-border" : "border-b-transparent",
            )}
          >
            <span
              className={cn(
                "grid size-[22px] shrink-0 place-items-center rounded-full border font-mono text-[11px]",
                active
                  ? "border-accent text-accent"
                  : done
                    ? "border-border text-secondary-foreground"
                    : "border-border text-muted-foreground",
              )}
            >
              {n}
            </span>
            <span className="flex flex-col">
              <span className={cn("text-[13px]", active ? "text-foreground" : "text-muted-foreground")}>
                {step.label}
              </span>
              {step.hint && <span className="text-[11px] text-muted-foreground">{step.hint}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
