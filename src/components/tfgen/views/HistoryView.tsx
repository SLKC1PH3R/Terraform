"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "../categories";
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
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="mb-1.5 text-[28px] font-semibold">Historique</h1>
        <p className="m-0 text-[13px] text-muted-foreground">
          Fiches importées et fichiers .tfvars générés — {generations.length} entrée
          {generations.length > 1 ? "s" : ""}.
        </p>
      </div>

      {error && <p className="text-[13px] text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[1.6fr_1.3fr_1fr_auto] gap-3 border-b border-border px-4 py-2 text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
          <div>Fiche importée</div>
          <div>Template</div>
          <div>Date</div>
          <div>Actions</div>
        </div>

        {loading ? (
          <div className="p-4 text-[12.5px] text-muted-foreground">Chargement...</div>
        ) : generations.length === 0 ? (
          <div className="p-4 text-[12.5px] text-muted-foreground">
            Aucune génération pour le moment.
          </div>
        ) : (
          generations.map((g) => (
            <div
              key={g.id}
              className="grid grid-cols-[1.6fr_1.3fr_1fr_auto] items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
            >
              <div className="truncate font-mono text-[12.5px] text-secondary-foreground">
                {g.fileName}
              </div>
              <div className="flex items-center gap-2">
                <CategoryBadge category={toDesignCategory(g.template.category)} />
                <span className="font-mono text-xs text-accent">{g.template.name}</span>
              </div>
              <div className="text-xs text-muted-foreground">{formatRelative(g.createdAt)}</div>
              <div className="flex justify-end gap-1.5">
                {g.hasSourceFile && (
                  <Button size="sm" onClick={() => window.open(`/api/generate/${g.id}/source`, "_blank")}>
                    Fiche importée
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => window.open(`/api/generate/${g.id}/download`, "_blank")}
                >
                  .tfvars
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
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
