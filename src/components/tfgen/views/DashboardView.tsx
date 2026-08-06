"use client";

import { useMemo, useState } from "react";
import { AppHeader, HeaderAction } from "../app-header";
import { ICONS } from "../icons";
import { CategoryTile, FAMILIES, metaFor } from "../category-meta";
import { ResumeQueue, type ResumeItem } from "../resume-queue";
import { TemplateCard, TemplateCardSkeleton, type TemplateCardData } from "../template-card";
import { ProtectedDeleteDialog } from "../protected-delete-dialog";
import { GenerationsTable } from "../generations-table";
import { ApiGeneration, ApiTemplate, CATEGORY_LABELS, formatRelative, isProtectedTemplate } from "./shared";

/**
 * v2 dashboard. Trois changements par rapport à v1 :
 *  1. les trois compteurs décoratifs sont remplacés par la file "Reprendre" ;
 *  2. les templates gagnent un filtre par famille (Socle / Compute / Réseau / Données) ;
 *  3. le bloc des dernières générations réutilise le vrai tableau + badges de
 *     catégorie au lieu d'un doublon plus faible.
 *
 * Le <h1> vit désormais dans AppHeader, cette vue démarre donc au contenu.
 */

/**
 * Colonnes de la grille de templates : un même type métier (ex. VM
 * Marketplace) regroupe Linux et Windows dans une seule colonne au lieu
 * d'une simple grille plate. "VM" est une seule catégorie DB, donc les deux
 * sous-types (Marketplace / Image) se distinguent par le nom du template.
 * Un template qui ne matche aucune règle (catégorie future, etc.) retombe
 * dans une colonne générique par catégorie, ajoutée dynamiquement.
 */
const TEMPLATE_COLUMNS: { key: string; title: string; match: (c: TemplateCardData) => boolean }[] = [
  { key: "RG", title: "Resource Group", match: (c) => c.category === "RG" },
  {
    key: "VM_MARKET",
    title: "VM Marketplace",
    match: (c) => c.category === "VM" && /marketplace/i.test(c.name),
  },
  {
    key: "VM_IMAGE",
    title: "VM Image",
    match: (c) => c.category === "VM" && /image/i.test(c.name),
  },
  { key: "NSG_ASG", title: "ASG / NSG", match: (c) => c.category === "NSG_ASG" },
  { key: "STORAGE", title: "Storage Account", match: (c) => c.category === "STORAGE" },
  { key: "LOAD_BALANCER", title: "Load Balancer", match: (c) => c.category === "LOAD_BALANCER" },
  { key: "KEY_VAULT", title: "Key Vault", match: (c) => c.category === "KEY_VAULT" },
];

interface TemplateColumn {
  key: string;
  title: string;
  category: string;
  items: TemplateCardData[];
}

function groupIntoColumns(cards: TemplateCardData[]): TemplateColumn[] {
  const columns: TemplateColumn[] = [];
  const remaining = new Set(cards.map((c) => c.id));

  for (const def of TEMPLATE_COLUMNS) {
    const items = cards.filter((c) => remaining.has(c.id) && def.match(c));
    if (items.length === 0) continue;
    items.forEach((c) => remaining.delete(c.id));
    columns.push({ key: def.key, title: def.title, category: items[0].category, items });
  }

  const leftoverByCategory = new Map<string, TemplateCardData[]>();
  for (const c of cards) {
    if (!remaining.has(c.id)) continue;
    if (!leftoverByCategory.has(c.category)) leftoverByCategory.set(c.category, []);
    leftoverByCategory.get(c.category)!.push(c);
  }
  for (const [category, items] of leftoverByCategory) {
    columns.push({ key: category, title: CATEGORY_LABELS[category] || category, category, items });
  }

  return columns;
}
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

  const [protectedDeleteTarget, setProtectedDeleteTarget] = useState<{ id: string; name: string } | null>(
    null,
  );

  async function deleteTemplate(id: string) {
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    onTemplatesChanged?.();
  }

  function handleDeleteTemplate(id: string) {
    const source = templates.find((t) => t.id === id);
    if (!source) return;

    if (isProtectedTemplate(source.name)) {
      setProtectedDeleteTarget({ id: source.id, name: source.name });
      return;
    }

    if (!confirm(`Supprimer le template « ${source.name} » ? Cette action est irréversible.`)) return;
    deleteTemplate(id);
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

  const columns = useMemo(() => groupIntoColumns(visible), [visible]);

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

            {loading ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(296px,1fr))] gap-2.5">
                {[0, 160, 320].map((d) => (
                  <TemplateCardSkeleton key={d} delay={d} />
                ))}
              </div>
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
              <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] items-start gap-4">
                {columns.map((col) => (
                  <div key={col.key} className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 px-0.5">
                      <CategoryTile category={col.category} size={22} />
                      <span className="text-[12px] font-semibold tracking-[-0.01em] text-foreground">
                        {col.title}
                      </span>
                      <span className="ml-auto font-mono text-[10.5px] tabular-nums text-muted-foreground">
                        {col.items.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {col.items.map((card) => (
                        <TemplateCard
                          key={card.id}
                          template={card}
                          protected={isProtectedTemplate(card.name)}
                          onEdit={() => onEdit(card.id)}
                          onGenerate={() => onGenerate(card.id)}
                          onDuplicate={() => handleDuplicate(card.id)}
                          onDelete={() => handleDeleteTemplate(card.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {protectedDeleteTarget && (
        <ProtectedDeleteDialog
          templateName={protectedDeleteTarget.name}
          onCancel={() => setProtectedDeleteTarget(null)}
          onConfirm={() => {
            deleteTemplate(protectedDeleteTarget.id);
            setProtectedDeleteTarget(null);
          }}
        />
      )}
    </>
  );
}
