"use client";

import { useState } from "react";
import { Button, CategoryBadge } from "../components";
import { color, font } from "../tokens";
import { ApiGeneration, formatRelative, toDesignCategory } from "./shared";

export default function HistoryView({
  generations,
  loading,
  onDeleted,
}: {
  generations: ApiGeneration[];
  loading: boolean;
  onDeleted: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleDelete(id: string, fileName: string) {
    if (!confirm(`Supprimer « ${fileName} » et le .tfvars généré ? Cette action est irréversible.`)) return;
    setDeletingId(id);
    setError("");

    const res = await fetch(`/api/generate/${id}`, { method: "DELETE" });

    setDeletingId(null);
    if (!res.ok) {
      setError("Erreur lors de la suppression");
      return;
    }
    onDeleted();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 28, margin: "0 0 6px", fontWeight: 600 }}>Historique</h1>
        <p style={{ margin: 0, color: color.textMuted, fontSize: 13 }}>
          Fiches importées et fichiers .tfvars générés — {generations.length} entrée
          {generations.length > 1 ? "s" : ""}.
        </p>
      </div>

      {error && <p style={{ color: "#F87171", fontSize: 13 }}>{error}</p>}

      <div
        style={{
          borderRadius: 12,
          background: color.surface,
          boxShadow: `0 0 0 1px ${color.border}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1.3fr 1fr auto",
            gap: 12,
            padding: "8px 16px",
            borderBottom: `1px solid ${color.border}`,
            fontSize: 9.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: color.textDim,
          }}
        >
          <div>Fiche importée</div>
          <div>Template</div>
          <div>Date</div>
          <div>Actions</div>
        </div>

        {loading ? (
          <div style={{ padding: 16, fontSize: 12.5, color: color.textDim }}>Chargement...</div>
        ) : generations.length === 0 ? (
          <div style={{ padding: 16, fontSize: 12.5, color: color.textDim }}>
            Aucune génération pour le moment.
          </div>
        ) : (
          generations.map((g) => (
            <div
              key={g.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1.3fr 1fr auto",
                gap: 12,
                alignItems: "center",
                padding: "11px 16px",
                borderBottom: `1px solid ${color.border}`,
              }}
            >
              <div style={{ fontFamily: font.mono, fontSize: 12.5, color: color.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {g.fileName}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CategoryBadge category={toDesignCategory(g.template.category)} size="sm" />
                <span style={{ fontFamily: font.mono, fontSize: 12, color: color.generateSoft }}>
                  {g.template.name}
                </span>
              </div>
              <div style={{ fontSize: 12, color: color.textDim }}>{formatRelative(g.createdAt)}</div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                {g.hasSourceFile && (
                  <Button size="sm" onClick={() => window.open(`/api/generate/${g.id}/source`, "_blank")}>
                    Fiche importée
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => window.open(`/api/generate/${g.id}/download`, "_blank")}
                >
                  .tfvars
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={deletingId === g.id}
                  onClick={() => handleDelete(g.id, g.fileName)}
                >
                  {deletingId === g.id ? "..." : "Supprimer"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
