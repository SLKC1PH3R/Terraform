"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "../categories";
import { cn } from "@/lib/utils";
import TemplateEditor, { type TemplateFormData } from "@/components/TemplateEditor";
import { ApiTemplate, formatRelative, toDesignCategory } from "./shared";

export default function EditorView({
  templates,
  initialTemplateId,
  onSaved,
  onCategoryRenamed,
}: {
  templates: ApiTemplate[];
  initialTemplateId?: string;
  onSaved?: () => void;
  onCategoryRenamed?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(initialTemplateId);

  const selected = templates.find((t) => t.id === selectedId);

  const initial: TemplateFormData | undefined = selected
    ? {
        id: selected.id,
        name: selected.name,
        category: selected.category,
        description: selected.description || "",
        tfContent: selected.tfContent || "",
        variables: selected.variables.map((v) => ({
          name: v.name,
          type: v.type,
          defaultValue: v.defaultValue || "",
          description: v.description || "",
          required: v.required,
          group: v.group || "",
        })),
      }
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-60 flex-1">
          <h1 className="mb-1.5 text-[28px] font-semibold">Éditeur de template</h1>
          <p className="m-0 font-mono text-[13px] text-muted-foreground">
            {selected ? selected.name : "Nouveau template"}
          </p>
        </div>
        <Button variant="default" onClick={() => setSelectedId(undefined)}>
          + Nouveau template
        </Button>
      </div>

      <div className="tfgen-scroll flex gap-2 overflow-x-auto pb-2">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedId(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-[10px] border bg-card px-3 py-2 text-left text-foreground",
              t.id === selectedId ? "border-accent" : "border-border",
            )}
          >
            <CategoryBadge category={toDesignCategory(t.category)} />
            <span className="font-mono text-[12.5px]">{t.name}</span>
            <span className="text-[10.5px] text-muted-foreground">{formatRelative(t.updatedAt)}</span>
          </button>
        ))}
      </div>

      <TemplateEditor
        key={selectedId || "new"}
        initial={initial}
        extraCategories={Array.from(new Set(templates.map((t) => t.category))).map((c) => ({
          value: c,
          label: c,
        }))}
        onSaved={onSaved}
        onDeleted={onSaved}
        onCategoryRenamed={onCategoryRenamed}
      />
    </div>
  );
}
