"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryBadge, CategoryTile, type ResourceCategory } from "./categories";
import { cn } from "@/lib/utils";

export interface TemplateSummary {
  id: string;
  category: ResourceCategory;
  description: string;
  variableCount: number;
  updatedAt: string;
  version: string;
  disabled?: boolean;
}

export function TemplateCard({
  template,
  selected,
  onEdit,
  onGenerate,
  className,
}: {
  template: TemplateSummary;
  selected?: boolean;
  onEdit?: () => void;
  onGenerate?: () => void;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-3 p-4 pb-3 transition-shadow",
        selected ? "border-accent shadow-lg shadow-black/40" : "hover:border-[#45403A]",
        template.disabled && "opacity-60",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <CategoryBadge category={template.category} />
        <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">
          {template.version}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <CategoryTile category={template.category} />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-sm text-accent">{template.id}</span>
          <p className="text-pretty text-[12.5px] leading-relaxed text-muted-foreground">
            {template.description}
          </p>
        </div>
      </div>

      <div className="mt-1 flex items-center gap-2 border-t border-border pt-3">
        <span className="font-mono text-[11px] text-muted-foreground">
          {template.variableCount} vars
        </span>
        <span className="text-[11px] text-muted-foreground/60">·</span>
        <span className="text-[11px] text-muted-foreground">{template.updatedAt}</span>
        <div className="ml-auto flex gap-1.5">
          <Button size="sm" onClick={onEdit} disabled={template.disabled}>
            Éditer
          </Button>
          {!template.disabled && (
            <Button size="sm" variant="generate" onClick={onGenerate}>
              Générer
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
