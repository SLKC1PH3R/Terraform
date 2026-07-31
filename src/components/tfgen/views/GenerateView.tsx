"use client";

import { useMemo, useState } from "react";
import {
  Button,
  CategoryBadge,
  StatusPill,
  Stepper,
  TfvarsPreview,
  UploadZone,
  VariableSection,
  type TfvarsLine,
  type VariableRowData,
  type VariableSectionData,
} from "../components";
import { deriveRgExtractedFields } from "@/lib/tfvars-generator";
import { ApiTemplate, CATEGORY_LABELS, toDesignCategory } from "./shared";

interface Row {
  name: string;
  type: string;
  defaultValue: string;
  finalValue: string;
  matched: boolean;
  group: string;
}

interface DiffEntry {
  name: string;
  defaultValue: string | null;
  finalValue: string;
  changed: boolean;
}

interface RgInfo {
  templateId: string;
  serviceFullname: string;
  env: string;
  rows: Row[];
}

interface BuildResult {
  id: string;
  content: string;
  diff: DiffEntry[];
}

function rowState(r: Row): VariableRowData["state"] {
  if (r.finalValue.trim() === "") return "missing";
  if (r.finalValue.trim() !== r.defaultValue.trim()) return "modified";
  return "default";
}

function buildSections(title: string, dbCategory: string, rows: Row[]): VariableSectionData[] {
  const category = toDesignCategory(dbCategory);
  const byGroup = new Map<string, Row[]>();
  const ungrouped: Row[] = [];

  for (const r of rows) {
    if (r.group) {
      if (!byGroup.has(r.group)) byGroup.set(r.group, []);
      byGroup.get(r.group)!.push(r);
    } else {
      ungrouped.push(r);
    }
  }

  const toRowData = (r: Row): VariableRowData => ({
    name: r.name,
    type: r.type,
    defaultValue: r.defaultValue,
    finalValue: r.finalValue,
    state: rowState(r),
  });

  const sections: VariableSectionData[] = [];
  if (ungrouped.length) {
    sections.push({ id: "_root", title, category, rows: ungrouped.map(toRowData) });
  }
  for (const [group, groupRows] of byGroup) {
    sections.push({ id: group, title: group, category, rows: groupRows.map(toRowData) });
  }
  return sections;
}

function contentToLines(content: string, diff: DiffEntry[]): TfvarsLine[] {
  const changedNames = new Set(diff.filter((d) => d.changed).map((d) => d.name));
  const rawLines = content.split("\n").filter((l, i, arr) => !(i === arr.length - 1 && l === ""));
  let depth = 0;
  const lines: TfvarsLine[] = [];

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (trimmed === "") {
      lines.push({ kind: "blank" });
      continue;
    }
    if (trimmed.endsWith("= {")) {
      lines.push({ kind: "block", text: trimmed, indent: depth * 20 });
      depth++;
      continue;
    }
    if (trimmed === "}") {
      depth = Math.max(0, depth - 1);
      lines.push({ kind: "block", text: trimmed, indent: depth * 20 });
      continue;
    }
    const m = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*(.*)$/);
    if (m) {
      const key = m[1];
      const value = m[2];
      const numeric = /^-?\d+(\.\d+)?$|^(true|false|null)$/.test(value);
      lines.push({ kind: "kv", key, value, indent: depth * 20, numeric, changed: changedNames.has(key) });
      continue;
    }
    lines.push({ kind: "block", text: trimmed, indent: depth * 20 });
  }
  return lines;
}

export default function GenerateView({
  templates,
  initialTemplateId,
  onGenerated,
}: {
  templates: ApiTemplate[];
  initialTemplateId?: string;
  onGenerated?: () => void;
}) {
  const [templateId, setTemplateId] = useState(initialTemplateId || "");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialTemplateId ? 2 : 1);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<BuildResult | null>(null);

  const [rgInfo, setRgInfo] = useState<RgInfo | null>(null);
  const [createRg, setCreateRg] = useState(false);
  const [rgResult, setRgResult] = useState<BuildResult | null>(null);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [openRgSections, setOpenRgSections] = useState<Record<string, boolean>>({});

  const selectedTemplate = templates.find((t) => t.id === templateId);

  const sections = useMemo(
    () => (selectedTemplate ? buildSections(selectedTemplate.name, selectedTemplate.category, rows) : []),
    [selectedTemplate, rows]
  );
  const rgSections = useMemo(
    () => (rgInfo ? buildSections(`Resource Group rg-${rgInfo.serviceFullname}-${rgInfo.env}-xxx`, "RG", rgInfo.rows) : []),
    [rgInfo]
  );

  const modifiedCount = rows.filter((r) => rowState(r) === "modified").length;
  const defaultCount = rows.length - modifiedCount;

  async function handleFileUpload(file: File) {
    if (!selectedTemplate) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/generate/parse-excel", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(data.error || "Erreur lors de la lecture du fichier");
      return;
    }

    setFileName(data.fileName);

    const extractedMap = new Map<string, string>(
      data.extracted.map((x: { key: string; value: string }) => [x.key, x.value])
    );

    const newRows: Row[] = selectedTemplate.variables.map((v) => {
      const found = extractedMap.get(v.name.toLowerCase());
      return {
        name: v.name,
        type: v.type,
        defaultValue: v.defaultValue || "",
        finalValue: found !== undefined ? found : v.defaultValue || "",
        matched: found !== undefined,
        group: v.group || "",
      };
    });

    setRows(newRows);
    setOpenSections({});
    setStep(3);

    const rgTemplate = templates.find((t) => t.category === "RG");
    setCreateRg(false);
    setRgResult(null);

    if (rgTemplate && selectedTemplate.category !== "RG") {
      const derived = deriveRgExtractedFields(data.extracted);
      if (derived) {
        const rgExtractedMap = new Map<string, string>(derived.extracted.map((x) => [x.key, x.value]));
        setRgInfo({
          templateId: rgTemplate.id,
          serviceFullname: derived.serviceFullname,
          env: derived.env,
          rows: rgTemplate.variables.map((v) => {
            const found = rgExtractedMap.get(v.name.toLowerCase());
            return {
              name: v.name,
              type: v.type,
              defaultValue: v.defaultValue || "",
              finalValue: found !== undefined ? found : v.defaultValue || "",
              matched: found !== undefined,
              group: v.group || "",
            };
          }),
        });
      } else {
        setRgInfo(null);
      }
    } else {
      setRgInfo(null);
    }
  }

  function updateRowByIdentity(group: string, name: string, value: string) {
    setRows((prev) => prev.map((r) => (r.group === group && r.name === name ? { ...r, finalValue: value } : r)));
  }

  function updateRgRowByIdentity(group: string, name: string, value: string) {
    setRgInfo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map((r) => (r.group === group && r.name === name ? { ...r, finalValue: value } : r)),
      };
    });
  }

  async function handleGenerate() {
    if (!selectedTemplate) return;
    setGenerating(true);
    setError("");

    const res = await fetch("/api/generate/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId,
        fileName,
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

    if (!res.ok) {
      setGenerating(false);
      setError(data.error || "Erreur lors de la génération");
      return;
    }

    setResult(data);

    if (createRg && rgInfo) {
      const rgRes = await fetch("/api/generate/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: rgInfo.templateId,
          fileName,
          variables: rgInfo.rows.map((r) => ({
            name: r.name,
            type: r.type,
            defaultValue: r.defaultValue,
            finalValue: r.finalValue,
            group: r.group,
          })),
        }),
      });
      const rgData = await rgRes.json();
      if (rgRes.ok) {
        setRgResult(rgData);
      } else {
        setError(rgData.error || "Erreur lors de la génération du Resource Group");
      }
    }

    setGenerating(false);
    setStep(4);
    onGenerated?.();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <h1 style={{ fontSize: 30, margin: 0, fontWeight: 600 }}>Génération</h1>

      <Stepper
        current={step}
        steps={[
          { label: "Template", hint: selectedTemplate?.name || "—" },
          { label: "Fiche Excel", hint: fileName || "—" },
          { label: "Revue des valeurs", hint: rows.length ? `${modifiedCount} / ${rows.length} modifiées` : "—" },
          { label: "Résultat", hint: result ? "généré" : "—" },
        ]}
      />

      {error && <p style={{ color: "#F87171", fontSize: 13 }}>{error}</p>}

      {step === 1 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                style={{
                  textAlign: "left",
                  font: "inherit",
                  cursor: "pointer",
                  padding: 14,
                  borderRadius: 12,
                  background: "#171717",
                  border: `1px solid ${t.id === templateId ? "#A855F7" : "#262626"}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                  color: "#FAFAFA",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 13.5, color: "#D8B9FF" }}>{t.name}</span>
                  <span style={{ marginLeft: "auto" }}>
                    <CategoryBadge category={toDesignCategory(t.category)} size="sm" />
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: "#A3A3A3", lineHeight: 1.5 }}>
                  {t.description || CATEGORY_LABELS[t.category]} · {t.variables.length} variables
                </div>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="primary" disabled={!templateId} onClick={() => setStep(2)}>
              Continuer
            </Button>
          </div>
        </>
      )}

      {step === 2 && selectedTemplate && (
        <>
          <UploadZone onPick={handleFileUpload} />
          {uploading && <p style={{ color: "#A3A3A3", fontSize: 13 }}>Lecture du fichier...</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button onClick={() => setStep(1)}>Retour</Button>
          </div>
        </>
      )}

      {step === 3 && rows.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <StatusPill tone="ok">{modifiedCount} modifiées</StatusPill>
            <StatusPill tone="neutral">{defaultCount} par défaut</StatusPill>
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

          {rgInfo && (
            <div
              style={{
                borderRadius: 12,
                background: "#171717",
                boxShadow: "0 0 0 1px #262626",
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={createRg}
                  onChange={(e) => setCreateRg(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  Le Resource Group <code>rg-{rgInfo.serviceFullname}-{rgInfo.env}-xxx</code> n'existe pas encore
                  sur Azure → générer aussi son .tfvars (déduit de cette fiche FIS).
                </span>
              </label>

              {createRg && (
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {rgSections.map((s) => (
                    <VariableSection
                      key={s.id}
                      section={s}
                      open={openRgSections[s.id] !== false}
                      onToggle={() =>
                        setOpenRgSections((p) => ({ ...p, [s.id]: p[s.id] === false ? true : false }))
                      }
                      onRowChange={(i, value) =>
                        updateRgRowByIdentity(s.id === "_root" ? "" : s.id, s.rows[i].name, value)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button onClick={() => setStep(2)}>Retour</Button>
            <Button variant="generate" onClick={handleGenerate} disabled={generating}>
              {generating ? "Génération..." : "Générer le .tfvars"}
            </Button>
          </div>
        </>
      )}

      {step === 4 && result && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusPill tone="ok">{result.diff.filter((d) => d.changed).length} lignes surlignées</StatusPill>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <Button variant="primary" onClick={() => window.open(`/api/generate/${result.id}/download`, "_blank")}>
                Télécharger le .tfvars
              </Button>
            </div>
          </div>
          <TfvarsPreview
            lines={contentToLines(result.content, result.diff)}
            fileName={`${selectedTemplate?.name || "template"}.tfvars`}
            meta={`généré depuis ${selectedTemplate?.name || ""}`}
          />

          {rgResult && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: "#A3A3A3" }}>
                  Resource Group rg-{rgInfo?.serviceFullname}-{rgInfo?.env}-xxx
                </span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <Button variant="primary" onClick={() => window.open(`/api/generate/${rgResult.id}/download`, "_blank")}>
                    Télécharger le .tfvars du RG
                  </Button>
                </div>
              </div>
              <TfvarsPreview
                lines={contentToLines(rgResult.content, rgResult.diff)}
                fileName="rg.tfvars"
                meta="resource group"
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
