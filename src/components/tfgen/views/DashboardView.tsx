"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { TemplateCard, type TemplateSummary } from "../template-card";
import { ApiGeneration, ApiTemplate, CATEGORY_LABELS, formatRelative, toDesignCategory } from "./shared";

export default function DashboardView({
  templates,
  generations,
  loading,
  onEdit,
  onGenerate,
  onNewTemplate,
  onNewGeneration,
}: {
  templates: ApiTemplate[];
  generations: ApiGeneration[];
  loading: boolean;
  onEdit: (id: string) => void;
  onGenerate: (id: string) => void;
  onNewTemplate: () => void;
  onNewGeneration: () => void;
}) {
  const stats = useMemo(() => {
    const variableCount = templates.reduce((acc, t) => acc + t.variables.length, 0);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentGenerations = generations.filter((g) => new Date(g.createdAt).getTime() >= thirtyDaysAgo);
    return {
      templates: templates.length,
      generations30d: recentGenerations.length,
      variables: variableCount,
    };
  }, [templates, generations]);

  const summaries: TemplateSummary[] = templates.map((t) => ({
    id: t.name,
    category: toDesignCategory(t.category),
    description: t.description || CATEGORY_LABELS[t.category] || t.category,
    variableCount: t.variables.length,
    updatedAt: formatRelative(t.updatedAt),
    version: "",
  }));

  return (
    <div className="flex flex-col gap-7.5">
      <div className="flex flex-wrap items-end gap-5">
        <div className="min-w-65 flex-1">
          <h1 className="mb-1.5 text-[30px] font-semibold">Tableau de bord</h1>
          <p className="m-0 text-muted-foreground">
            {templates.length} template{templates.length > 1 ? "s" : ""} publié{templates.length > 1 ? "s" : ""}
            {generations[0] ? ` · dernière génération ${formatRelative(generations[0].createdAt)}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onNewTemplate}>+ Nouveau template</Button>
          <Button variant="default" onClick={onNewGeneration}>
            Nouvelle génération
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Templates actifs", String(stats.templates)],
          ["Générations · 30 j", String(stats.generations30d)],
          ["Variables suivies", String(stats.variables)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-4 py-3.5"
          >
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
            <div className="font-mono text-[26px] text-foreground">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3.5">
        <h2 className="m-0 text-[19px] font-semibold">Templates</h2>
        {loading ? (
          <p className="text-[13px] text-muted-foreground">Chargement...</p>
        ) : templates.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Aucun template pour le moment.{" "}
            <button
              type="button"
              onClick={onNewTemplate}
              className="cursor-pointer bg-transparent text-accent underline"
            >
              En créer un
            </button>
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
            {templates.map((t, i) => (
              <TemplateCard
                key={t.id}
                template={summaries[i]}
                onEdit={() => onEdit(t.id)}
                onGenerate={() => onGenerate(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="m-0 text-[19px] font-semibold">Historique</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {generations.length === 0 ? (
            <div className="p-4 text-[12.5px] text-muted-foreground">
              Aucune génération pour le moment.
            </div>
          ) : (
            generations.slice(0, 8).map((g) => (
              <div
                key={g.id}
                className="grid grid-cols-[1.6fr_1.2fr_0.9fr_auto] items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
              >
                <div className="font-mono text-[12.5px] text-secondary-foreground">{g.fileName}</div>
                <div className="font-mono text-xs text-accent">{g.template.name}</div>
                <div className="text-xs text-muted-foreground">{formatRelative(g.createdAt)}</div>
                <a
                  href={`/api/generate/${g.id}/download`}
                  className="text-[11.5px] text-muted-foreground underline"
                >
                  Télécharger
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
