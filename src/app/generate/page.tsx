"use client";

import { useEffect, useState } from "react";
import { deriveRgVariablesFromServerFIS } from "@/lib/tfvars-generator";

interface TemplateVariable {
  id: string;
  name: string;
  type: string;
  defaultValue: string | null;
  description: string | null;
  required: boolean;
}

interface Template {
  id: string;
  name: string;
  category: string;
  variables: TemplateVariable[];
}

interface Row {
  name: string;
  type: string;
  defaultValue: string;
  finalValue: string;
  matched: boolean;
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

const CATEGORY_LABELS: Record<string, string> = {
  RG: "Resource Group",
  STORAGE: "Storage Account",
  NSG_ASG: "NSG / ASG",
  VM_WINDOWS_MARKETPLACE: "VM Windows (Marketplace)",
  VM_WINDOWS_CUSTOM: "VM Windows (Custom)",
  VM_LINUX: "VM Linux",
};

export default function GeneratePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [result, setResult] = useState<{ id: string; content: string; diff: DiffEntry[] } | null>(null);
  const [generating, setGenerating] = useState(false);

  const [rgInfo, setRgInfo] = useState<RgInfo | null>(null);
  const [createRg, setCreateRg] = useState(false);
  const [rgResult, setRgResult] = useState<{ id: string; content: string; diff: DiffEntry[] } | null>(null);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then(setTemplates);
  }, []);

  const selectedTemplate = templates.find((t) => t.id === templateId);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedTemplate) return;

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
      };
    });

    setRows(newRows);
    setStep(2);

    const rgTemplate = templates.find((t) => t.category === "RG");
    setCreateRg(false);
    setRgResult(null);

    if (rgTemplate && selectedTemplate.category !== "RG") {
      const derived = deriveRgVariablesFromServerFIS(data.extracted, rgTemplate.variables);
      if (derived) {
        setRgInfo({
          templateId: rgTemplate.id,
          serviceFullname: derived.serviceFullname,
          env: derived.env,
          rows: derived.variables.map((v) => ({
            name: v.name,
            type: v.type,
            defaultValue: v.defaultValue || "",
            finalValue: v.finalValue,
            matched: true,
          })),
        });
      } else {
        setRgInfo(null);
      }
    } else {
      setRgInfo(null);
    }
  }

  function updateRgRowValue(index: number, value: string) {
    setRgInfo((info) => {
      if (!info) return info;
      const rows = [...info.rows];
      rows[index] = { ...rows[index], finalValue: value };
      return { ...info, rows };
    });
  }

  function updateRowValue(index: number, value: string) {
    setRows((r) => {
      const copy = [...r];
      copy[index] = { ...copy[index], finalValue: value };
      return copy;
    });
  }

  async function handleGenerate() {
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
    setStep(3);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Générer un fichier .tfvars</h1>

      {/* Étape 1 : sélection du template */}
      <div className="card space-y-3">
        <h2 className="font-semibold">1. Choisir le modèle de ressource</h2>
        <select
          className="input"
          value={templateId}
          onChange={(e) => {
            setTemplateId(e.target.value);
            setStep(1);
            setRows([]);
            setResult(null);
            setRgInfo(null);
            setCreateRg(false);
            setRgResult(null);
          }}
        >
          <option value="">— Sélectionner —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              [{CATEGORY_LABELS[t.category] || t.category}] {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Étape 2 : upload de la fiche FIS */}
      {selectedTemplate && (
        <div className="card space-y-3">
          <h2 className="font-semibold">2. Importer la fiche FIS (.xlsx)</h2>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="text-sm"
          />
          {uploading && <p className="text-slate-400 text-sm">Lecture du fichier...</p>}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Étape 3 : revue et édition des variables */}
      {rows.length > 0 && step !== 3 && (
        <div className="card space-y-3">
          <h2 className="font-semibold">3. Vérifier les variables extraites de « {fileName} »</h2>
          <p className="text-slate-500 text-xs">
            Les valeurs non trouvées dans la fiche gardent la valeur par défaut du template.
            Vous pouvez corriger manuellement avant de générer.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase">
                  <th className="py-2 pr-3">Variable</th>
                  <th className="py-2 pr-3">Défaut</th>
                  <th className="py-2 pr-3">Valeur finale</th>
                  <th className="py-2 pr-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.name} className="border-t border-slate-800">
                    <td className="py-2 pr-3 font-mono text-xs">{r.name}</td>
                    <td className="py-2 pr-3 text-slate-500 text-xs">{r.defaultValue || "—"}</td>
                    <td className="py-2 pr-3">
                      <input
                        className="input py-1"
                        value={r.finalValue}
                        onChange={(e) => updateRowValue(i, e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {r.matched ? (
                        <span className="text-emerald-400">fiche FIS</span>
                      ) : (
                        <span className="text-slate-500">défaut</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rgInfo && (
            <div className="border-t border-slate-800 pt-3 space-y-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={createRg}
                  onChange={(e) => setCreateRg(e.target.checked)}
                />
                <span>
                  Le Resource Group <code>rg-{rgInfo.serviceFullname}-{rgInfo.env}-xxx</code> n'existe pas
                  encore sur Azure → générer aussi son .tfvars (déduit de cette fiche FIS).
                </span>
              </label>

              {createRg && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 text-xs uppercase">
                        <th className="py-2 pr-3">Variable RG</th>
                        <th className="py-2 pr-3">Défaut</th>
                        <th className="py-2 pr-3">Valeur finale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rgInfo.rows.map((r, i) => (
                        <tr key={r.name} className="border-t border-slate-800">
                          <td className="py-2 pr-3 font-mono text-xs">{r.name}</td>
                          <td className="py-2 pr-3 text-slate-500 text-xs">{r.defaultValue || "—"}</td>
                          <td className="py-2 pr-3">
                            <input
                              className="input py-1"
                              value={r.finalValue}
                              onChange={(e) => updateRgRowValue(i, e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <button className="btn" onClick={handleGenerate} disabled={generating}>
            {generating ? "Génération..." : "Générer le tfvars"}
          </button>
        </div>
      )}

      {/* Étape 4 : résultat avec diff coloré */}
      {result && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">4. Résultat</h2>
            <a href={`/api/generate/${result.id}/download`} className="btn">
              Télécharger le .tfvars
            </a>
          </div>
          <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm overflow-x-auto font-mono">
            {result.diff.map((d) => (
              <div key={d.name} className={d.changed ? "text-emerald-400" : "text-slate-300"}>
                {formatLine(d)}
              </div>
            ))}
          </pre>
          <p className="text-xs text-slate-500">
            <span className="text-emerald-400">Vert</span> = valeur modifiée par rapport au défaut du template.
          </p>
        </div>
      )}

      {/* Résultat pour le Resource Group, si demandé */}
      {rgResult && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Résultat — Resource Group rg-{rgInfo?.serviceFullname}-{rgInfo?.env}-xxx
            </h2>
            <a href={`/api/generate/${rgResult.id}/download`} className="btn">
              Télécharger le .tfvars
            </a>
          </div>
          <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm overflow-x-auto font-mono">
            {rgResult.diff.map((d) => (
              <div key={d.name} className={d.changed ? "text-emerald-400" : "text-slate-300"}>
                {formatLine(d)}
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}

function formatLine(d: DiffEntry) {
  // Reconstruit une ligne lisible ; le vrai contenu exact est dans result.content / le fichier téléchargé
  return `${d.name} = ${d.finalValue}`;
}
