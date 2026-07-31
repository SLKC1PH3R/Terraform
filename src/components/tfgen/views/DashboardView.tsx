"use client";

import { useMemo } from "react";
import { Button, TemplateCard, type TemplateSummary } from "../components";
import { color, font } from "../tokens";
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
    <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1 style={{ fontSize: 30, margin: "0 0 6px", fontWeight: 600 }}>Tableau de bord</h1>
          <p style={{ margin: 0, color: color.textMuted }}>
            {templates.length} template{templates.length > 1 ? "s" : ""} publié{templates.length > 1 ? "s" : ""}
            {generations[0] ? ` · dernière génération ${formatRelative(generations[0].createdAt)}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={onNewTemplate}>+ Nouveau template</Button>
          <Button variant="primary" onClick={onNewGeneration}>
            Nouvelle génération
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          ["Templates actifs", String(stats.templates)],
          ["Générations · 30 j", String(stats.generations30d)],
          ["Variables suivies", String(stats.variables)],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              padding: "14px 16px",
              borderRadius: 12,
              background: color.surface,
              boxShadow: `0 0 0 1px ${color.border}`,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: color.textDim,
              }}
            >
              {label}
            </div>
            <div style={{ fontFamily: font.mono, fontSize: 26, color: color.text }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ fontSize: 19, margin: 0, fontWeight: 600 }}>Templates</h2>
        {loading ? (
          <p style={{ color: color.textDim, fontSize: 13 }}>Chargement...</p>
        ) : templates.length === 0 ? (
          <p style={{ color: color.textDim, fontSize: 13 }}>
            Aucun template pour le moment.{" "}
            <button
              type="button"
              onClick={onNewTemplate}
              style={{ color: color.generateSoft, textDecoration: "underline", cursor: "pointer", background: "none", border: 0, font: "inherit" }}
            >
              En créer un
            </button>
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
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

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 19, margin: 0, fontWeight: 600 }}>Historique</h2>
        <div
          style={{
            borderRadius: 12,
            background: color.surface,
            boxShadow: `0 0 0 1px ${color.border}`,
            overflow: "hidden",
          }}
        >
          {generations.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12.5, color: color.textDim }}>
              Aucune génération pour le moment.
            </div>
          ) : (
            generations.slice(0, 8).map((g) => (
              <div
                key={g.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1.2fr 0.9fr auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "11px 16px",
                  borderBottom: `1px solid ${color.border}`,
                }}
              >
                <div style={{ fontFamily: font.mono, fontSize: 12.5, color: color.textSecondary }}>
                  {g.fileName}
                </div>
                <div style={{ fontFamily: font.mono, fontSize: 12, color: color.generateSoft }}>
                  {g.template.name}
                </div>
                <div style={{ fontSize: 12, color: color.textDim }}>{formatRelative(g.createdAt)}</div>
                <a
                  href={`/api/generate/${g.id}/download`}
                  style={{ fontSize: 11.5, color: color.textMuted, textDecoration: "underline" }}
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
