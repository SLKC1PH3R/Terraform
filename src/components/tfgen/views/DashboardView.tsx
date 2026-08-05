"use client";

import { useMemo, useState } from "react";
import { AppHeader, HeaderAction } from "../app-header";
import { ICONS } from "../icons";
import { FAMILIES, metaFor } from "../category-meta";
import { ResumeQueue, type ResumeItem } from "../resume-queue";
import { TemplateCard, TemplateCardSkeleton, type TemplateCardData } from "../template-card";
import { GenerationsTable } from "../generations-table";
import { ApiGeneration, ApiTemplate, CATEGORY_LABELS, formatRelative } from "./shared";

/**
 * v2 dashboard. Trois changements par rapport à v1 :
 *  1. les trois compteurs décoratifs sont remplacés par la file "Reprendre" ;
 *  2. les templates gagnent un filtre par famille (Socle / Compute / Réseau / Données) ;
 *  3. le bloc des dernières générations réutilise le vrai tableau + badges de
 *     catégorie au lieu d'un doublon plus faible.
 *
 * Le <h1> vit désormais dans AppHeader, cette vue démarre donc au contenu.
 */
export default function DashboardView({
  templates,
  generations,
  loading,
  resumeItems = [],
  onEdit,
  onGenerate,
  onNewTemplate,
  onNewGeneration,
  onResume,
  onOpenHistory,
  onDelete,
  onSearch,
  onTemplatesChanged,
}: {
  templates: ApiTemplate[];
  generations: ApiGeneration[];
  loading: boolean;
  resumeItems?: ResumeItem[];
  onEdit: (id: string) => void;
  onGenerate: (id: string) => void;
  onNewTemplate: () => void;
  onNewGeneration: () => void;
  onResume: (item: ResumeItem) => void;
  onOpenHistory: () => void;
  onDelete?: (generation: ApiGeneration) => void;
  onSearch?: () => void;
  /** Rafraîchit la liste des templates après duplication/suppression. */
  onTemplatesChanged?: () => void;
}) {
  const [family, setFamily] = useState<string>("Tous");

  async function handleDuplicate(id: string) {
    const source = templates.find((t) => t.id === id);
    if (!source) return;

    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${source.name} (copie)`,
        category: source.category,
        description: source.description,
        tfContent: source.tfContent,
        variables: source.variables.map((v) => ({
          name: v.name,
          type: v.type,
          defaultValue: v.defaultValue,
          description: v.description,
          group: v.group,
        })),
      }),
    });

    onTemplatesChanged?.();
  }

  async function handleDeleteTemplate(id: string) {
    const source = templates.find((t) => t.id === id);
    if (!source) return;
    if (!confirm(`Supprimer le template « ${source.name} » ? Cette action est irréversible.`)) return;

    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    onTemplatesChanged?.();
  }

  const cards: TemplateCardData[] = useMemo(
    () =>
      templates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description || CATEGORY_LABELS[t.category] || t.category,
        variableCount: t.variables.length,
        updatedAt: formatRelative(t.updatedAt),
      })),
    [templates],
  );

  const visible = useMemo(
    () => (family === "Tous" ? cards : cards.filter((c) => metaFor(c.category).family === family)),
    [cards, family],
  );

  return (
    <>
      <AppHeader
        breadcrumb={["tableau de bord"]}
        title="Tableau de bord"
        onSearch={onSearch}
        actions={
          <>
            <HeaderAction icon={ICONS.plus} onClick={onNewTemplate}>
              Nouveau template
            </HeaderAction>
            <HeaderAction tone="primary" icon={ICONS.wand} onClick={onNewGeneration}>
              Nouvelle génération
            </HeaderAction>
          </>
        }
      />

      <div className="tfgen-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="flex max-w-[1180px] flex-col gap-7.5 px-5.5 pb-14 pt-6">
          <ResumeQueue items={resumeItems} onResume={onResume} />

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="m-0 text-[14px] font-semibold tracking-[-0.01em]">Templates</h2>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {visible.length} / {cards.length}
              </span>
              <div className="ml-auto flex gap-0.5 rounded-full border border-secondary bg-[#171613] p-0.5">
                {FAMILIES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFamily(f)}
                    className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                      family === f
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(296px,1fr))] gap-2.5">
              {loading ? (
                [0, 160, 320].map((d) => <TemplateCardSkeleton key={d} delay={d} />)
              ) : visible.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  Aucun template dans cette famille.{" "}
                  <button
                    type="button"
                    onClick={onNewTemplate}
                    className="cursor-pointer bg-transparent text-accent underline"
                  >
                    En créer un
                  </button>
                </p>
              ) : (
                visible.map((card) => (
                  <TemplateCard
                    key={card.id}
                    template={card}
                    onEdit={() => onEdit(card.id)}
                    onGenerate={() => onGenerate(card.id)}
                    onDuplicate={() => handleDuplicate(card.id)}
                    onDelete={() => handleDeleteTemplate(card.id)}
                  />
                ))
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h2 className="m-0 text-[14px] font-semibold tracking-[-0.01em]">
                Dernières générations
              </h2>
              <button
                type="button"
                onClick={onOpenHistory}
                className="ml-auto rounded-lg border border-transparent px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
              >
                Tout l&apos;historique →
              </button>
            </div>
            <GenerationsTable
              generations={generations.slice(0, 6)}
              loading={loading}
              onDelete={onDelete}
            />
          </section>
        </div>
      </div>
    </>
  );
}
