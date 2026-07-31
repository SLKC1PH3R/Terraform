"use client";

import { useEffect, useState } from "react";
import { Button, CategoryBadge, StatusPill, TfvarsPreview, VariableSection } from "../components";
import { color, font } from "../tokens";
import { ApiGeneration, ApiTemplateVariable, formatRelative, toDesignCategory } from "./shared";
import { buildSections, contentToLines, deriveFileName, rowState, type BuildResult, type Row } from "./tfvarsRender";

interface GenerationDetail {
  id: string;
  fileName: string;
  createdAt: string;
  template: {
    id: string;
    name: string;
    category: string;
    variables: ApiTemplateVariable[];
  };
  diff: { name: string; defaultValue: string | null; finalValue: string; changed: boolean }[];
}

/** Reconstruit les lignes éditables depuis les variables actuelles du template et
 * le diff enregistré à la génération. Correspondance positionnelle (même ordre
 * qu'à la génération) avec repli sur le nom si la longueur ne correspond plus
 * (template modifié depuis). */
function buildRowsFromDetail(detail: GenerationDetail): Row[] {
  const { variables } = detail.template;
  const diff = detail.diff;

  if (diff.length === variables.length) {
    return variables.map((v, i) => ({
      name: v.name,
      type: v.type,
      defaultValue: v.defaultValue || "",
      finalValue: diff[i]?.finalValue ?? v.defaultValue ?? "",
      matched: true,
      group: v.group || "",
    }));
  }

  const byName = new Map(diff.map((d) => [d.name, d]));
  return variables.map((v) => ({
    name: v.name,
    type: v.type,
    defaultValue: v.defaultValue || "",
    finalValue: byName.get(v.name)?.finalValue ?? v.defaultValue ?? "",
    matched: byName.has(v.name),
    group: v.group || "",
  }));
}

export default function EditTfvarsView({
  generations,
  onSaved,
}: {
  generations: ApiGeneration[];
  onSaved?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<GenerationDetail | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setRows([]);
      setResult(null);
      return;
    }

    setLoadingDetail(true);
    setError("");
    setResult(null);

    fetch(`/api/generate/${selectedId}`)
      .then((r) => r.json())
      .then((data: GenerationDetail) => {
        setDetail(data);
        setRows(buildRowsFromDetail(data));
        setOpenSections({});
      })
      .catch(() => setError("Erreur lors du chargement"))
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  const sections = detail ? buildSections(detail.template.name, detail.template.category, rows) : [];
  const modifiedCount = rows.filter((r) => rowState(r) === "modified").length;

  function updateRowByIdentity(group: string, name: string, value: string) {
    setRows((prev) => prev.map((r) => (r.group === group && r.name === name ? { ...r, finalValue: value } : r)));
  }

  async function handleRegenerate() {
    if (!detail) return;
    setSaving(true);
    setError("");

    const res = await fetch(`/api/generate/${detail.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variables: rows.map((r) => ({
          name: r.name,
          type: r.type,
          defaultValue: r.defaultValue,
          finalValue: r.finalValue,
          group: r.group,
        })),
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Erreur lors de la régénération");
      return;
    }

    setResult(data);
    onSaved?.();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 28, margin: "0 0 6px", fontWeight: 600 }}>Éditeur tfvars</h1>
        <p style={{ margin: 0, color: color.textMuted, fontSize: 13 }}>
          Modifier les valeurs d'un .tfvars déjà généré, sans repasser par l'import de la fiche FIS.
        </p>
      </div>

      <div
        style={{
          borderRadius: 12,
          background: color.surface,
          boxShadow: `0 0 0 1px ${color.border}`,
          padding: 14,
        }}
      >
        <label className="label" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: color.textDim, display: "block", marginBottom: 6 }}>
          Choisir un .tfvars déjà généré
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{
            width: "100%",
            background: color.code,
            border: `1px solid ${color.borderStrong}`,
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 13,
            color: color.text,
          }}
        >
          <option value="">— Sélectionner —</option>
          {generations.map((g) => (
            <option key={g.id} value={g.id}>
              {g.fileName} · {g.template.name} · {formatRelative(g.createdAt)}
            </option>
          ))}
        </select>
      </div>

      {error && <p style={{ color: "#F87171", fontSize: 13 }}>{error}</p>}
      {loadingDetail && <p style={{ color: color.textDim, fontSize: 13 }}>Chargement...</p>}

      {detail && !loadingDetail && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <CategoryBadge category={toDesignCategory(detail.template.category)} size="sm" />
            <span style={{ fontFamily: font.mono, fontSize: 12.5, color: color.generateSoft }}>
              {detail.template.name}
            </span>
            <StatusPill tone="ok">{modifiedCount} modifiées vs. défaut du template</StatusPill>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {sections.map((s) => (
              <VariableSection
                key={s.id}
                section={s}
                open={openSections[s.id] !== false}
                onToggle={() => setOpenSections((p) => ({ ...p, [s.id]: p[s.id] === false ? true : false }))}
                onRowChange={(i, value) => updateRowByIdentity(s.id === "_root" ? "" : s.id, s.rows[i].name, value)}
              />
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="generate" onClick={handleRegenerate} disabled={saving}>
              {saving ? "Régénération..." : "Régénérer le .tfvars"}
            </Button>
          </div>

          {result && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <StatusPill tone="ok">Régénéré</StatusPill>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <Button
                    variant="primary"
                    onClick={() => window.open(`/api/generate/${detail.id}/download`, "_blank")}
                  >
                    Télécharger le .tfvars
                  </Button>
                </div>
              </div>
              <TfvarsPreview
                lines={contentToLines(result.content, result.diff)}
                fileName={deriveFileName(result.content, detail.template.name)}
                meta={`régénéré depuis ${detail.template.name}`}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
