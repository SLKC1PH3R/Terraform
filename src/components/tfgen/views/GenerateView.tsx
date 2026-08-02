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
} from "../components";
import { deriveRgExtractedFields, deriveVmExtractedFields } from "@/lib/tfvars-generator";
import { isStorageAccountTemplate } from "@/lib/storage-account-generator";
import { ApiTemplate, ApiTemplateVariable, CATEGORY_LABELS, toDesignCategory } from "./shared";
import { buildSections, contentToLines, deriveFileName, rowState, type BuildResult, type Row } from "./tfvarsRender";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface RgInfo {
  templateId: string;
  serviceFullname: string;
  env: string;
  rows: Row[];
}

interface UploadedFile {
  file: File;
  fileName: string;
  extracted: { key: string; value: string }[];
  rgDerived: { serviceFullname: string; env: string } | null;
}

interface BatchResultEntry {
  fileName: string;
  result?: BuildResult;
  error?: string;
}

function matchRows(
  variables: ApiTemplateVariable[],
  extracted: { key: string; value: string }[],
  prefix = ""
): Row[] {
  const extractedMap = new Map(extracted.map((x) => [x.key, x.value]));
  return variables.map((v) => {
    const found = extractedMap.get(v.name.toLowerCase());
    // Le préfixe s'applique au nom de la variable elle-même (ex. vm2_ip_address)
    // ou, pour une variable de map, au nom du groupe (ex. vm2_tags_always) —
    // pas aux deux, sinon la clé interne du map serait doublement préfixée.
    // (Repli utilisé uniquement pour les templates qui ne suivent pas la
    // convention "vm1_" — voir matchRowsForMerge ci-dessous.)
    const group = v.group ? (prefix ? `${prefix}${v.group}` : v.group) : "";
    const name = v.group ? v.name : prefix ? `${prefix}${v.name}` : v.name;
    return {
      name,
      type: v.type,
      defaultValue: v.defaultValue || "",
      finalValue: found !== undefined ? found : v.defaultValue || "",
      matched: found !== undefined,
      group,
    };
  });
}

const VM_TOKEN_RE = /(?<![a-z0-9])vm1(?![a-z0-9])/i;

/** Renomme le jeton "vm1" (délimité) en "vmN" dans un nom de variable ou de
 * groupe — ex. "vm1_index" -> "vm2_index", "tags_vm1_datadisk1" ->
 * "tags_vm2_datadisk1" — sans toucher aux autres chiffres du nom (ex.
 * "datadisk1" reste "datadisk1"). Convention observée dans WIN-IMAGE.tfvars /
 * LNX-IMG.tfvars (vm1_*, tags_vm1*, create_vm1_datadisk*), où la "2e VM" d'un
 * même fichier remplace ce jeton plutôt que de préfixer par-dessus. */
function renumberVmToken(text: string, n: number): { text: string; changed: boolean } {
  let changed = false;
  const result = text.replace(new RegExp(VM_TOKEN_RE.source, "gi"), () => {
    changed = true;
    return `vm${n}`;
  });
  return { text: result, changed };
}

function templateHasVmToken(variables: ApiTemplateVariable[]): boolean {
  return variables.some((v) => VM_TOKEN_RE.test(v.name) || (!!v.group && VM_TOKEN_RE.test(v.group)));
}

/** Fait correspondre les valeurs extraites d'une fiche aux variables du
 * template pour fusionner plusieurs ressources du même type dans un seul
 * .tfvars. Le 1er fichier (index 1) garde les noms tels quels. Pour les
 * suivants, seules les variables contenant le jeton "vm1" sont renumérotées
 * (vm1 -> vm2, vm3, ...) et dupliquées ; les variables partagées (env,
 * service_fullname, vm_rg, tags_always, ...) sont ignorées car déjà
 * couvertes par le 1er fichier. */
function matchRowsForMerge(
  variables: ApiTemplateVariable[],
  extracted: { key: string; value: string }[],
  index: number
): Row[] {
  const extractedMap = new Map(extracted.map((x) => [x.key, x.value]));
  const rows: Row[] = [];

  for (const v of variables) {
    const found = extractedMap.get(v.name.toLowerCase());
    const finalValue = found !== undefined ? found : v.defaultValue || "";

    if (index === 1) {
      rows.push({
        name: v.name,
        type: v.type,
        defaultValue: v.defaultValue || "",
        finalValue,
        matched: found !== undefined,
        group: v.group || "",
      });
      continue;
    }

    const nameR = renumberVmToken(v.name, index);
    const groupR = v.group ? renumberVmToken(v.group, index) : { text: "", changed: false };
    if (!nameR.changed && !groupR.changed) continue; // variable partagée, déjà couverte par le 1er fichier

    rows.push({
      name: nameR.text,
      type: v.type,
      defaultValue: v.defaultValue || "",
      finalValue,
      matched: found !== undefined,
      group: groupR.text,
    });
  }

  return rows;
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
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<BuildResult | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResultEntry[]>([]);

  const [rgInfo, setRgInfo] = useState<RgInfo | null>(null);
  const [createRg, setCreateRg] = useState(false);
  const [rgResult, setRgResult] = useState<BuildResult | null>(null);

  const [saExtractedList, setSaExtractedList] = useState<{ key: string; value: string }[][]>([]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [openRgSections, setOpenRgSections] = useState<Record<string, boolean>>({});

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const isStorageAccount = isStorageAccountTemplate(selectedTemplate?.tfContent);

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

  function resetUploadState() {
    setUploadedFiles([]);
    setBatchResults([]);
    setRows([]);
    setSaExtractedList([]);
    setResult(null);
    setRgInfo(null);
    setRgResult(null);
    setCreateRg(false);
    setError("");
  }

  function setupRgInfo(uf: UploadedFile) {
    const rgTemplate = templates.find((t) => t.category === "RG");
    setCreateRg(false);
    setRgResult(null);

    if (rgTemplate && selectedTemplate && selectedTemplate.category !== "RG" && uf.rgDerived) {
      setRgInfo({
        templateId: rgTemplate.id,
        serviceFullname: uf.rgDerived.serviceFullname,
        env: uf.rgDerived.env,
        rows: matchRows(rgTemplate.variables, uf.extracted),
      });
    } else {
      setRgInfo(null);
    }
  }

  async function handleAddFile(file: File) {
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

    // Si la fiche contient un champ "Resource Group" exploitable, on en déduit
    // env/service_fullname et on les ajoute aux paires extraites — que le
    // template sélectionné soit le RG lui-même (générés directement) ou un
    // autre template (utilisés pour le panneau RG secondaire).
    const derived = deriveRgExtractedFields(data.extracted);
    const afterRg = derived ? derived.extracted : data.extracted;
    // Alias pour le template VM (Resource Group -> vm_rg, ASG 1 -> asg1_name,
    // Subnet 1 -> subnet1_name, V-Net -> vnet_name) + vm_type dérivé du code
    // d'environnement à 3 lettres ci-dessus (ex. "ppd" -> "u").
    const extractedForFile = deriveVmExtractedFields(afterRg);

    setUploadedFiles((prev) => [
      ...prev,
      {
        file,
        fileName: data.fileName,
        extracted: extractedForFile,
        rgDerived: derived ? { serviceFullname: derived.serviceFullname, env: derived.env } : null,
      },
    ]);
  }

  function removeUploadedFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function proceedSingle() {
    if (!selectedTemplate || uploadedFiles.length === 0) return;
    const uf = uploadedFiles[0];
    setFileName(uf.fileName);
    setSourceFile(uf.file);
    setRows(matchRows(selectedTemplate.variables, uf.extracted));
    setOpenSections({});
    setStep(3);
    setupRgInfo(uf);
  }

  function proceedMerge() {
    if (!selectedTemplate || uploadedFiles.length < 2) return;
    // Convention WIN-IMAGE/LNX-IMG (vm1_*, tags_vm1...) : on renumérote le
    // jeton vm1 -> vm2/vm3/... plutôt que de préfixer par-dessus. Repli sur
    // un préfixe générique si le template ne suit pas cette convention.
    const useTokenRenumber = templateHasVmToken(selectedTemplate.variables);
    const combined: Row[] = [];
    uploadedFiles.forEach((uf, i) => {
      if (useTokenRenumber) {
        combined.push(...matchRowsForMerge(selectedTemplate.variables, uf.extracted, i + 1));
      } else {
        const prefix = i === 0 ? "" : `vm${i + 1}_`;
        combined.push(...matchRows(selectedTemplate.variables, uf.extracted, prefix));
      }
    });
    setRows(combined);
    setFileName(uploadedFiles.map((f) => f.fileName).join(" + "));
    setSourceFile(uploadedFiles[0].file);
    setOpenSections({});
    setStep(3);
    setupRgInfo(uploadedFiles[0]);
  }

  async function proceedBatch() {
    if (!selectedTemplate || uploadedFiles.length < 2) return;
    setBatchRunning(true);
    setError("");

    const results: BatchResultEntry[] = [];

    for (const uf of uploadedFiles) {
      const rowsForFile = matchRows(selectedTemplate.variables, uf.extracted);
      const sourceFileBase64 = await fileToBase64(uf.file);

      const res = await fetch("/api/generate/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          fileName: uf.fileName,
          sourceFileBase64,
          sourceFileMime: uf.file.type || undefined,
          variables: rowsForFile.map((r) => ({
            name: r.name,
            type: r.type,
            defaultValue: r.defaultValue,
            finalValue: r.finalValue,
            group: r.group,
          })),
        }),
      });

      const data = await res.json();
      results.push(res.ok ? { fileName: uf.fileName, result: data } : { fileName: uf.fileName, error: data.error });
    }

    setBatchResults(results);
    setBatchRunning(false);
    setStep(4);
    onGenerated?.();
  }

  /** Templates "Storage Account" (gabarit locals { ... SA_list = [...] } ) :
   * pas de table de variables groupées comme les autres templates (la
   * structure est dynamique — conteneurs/partages/etc. gérés côté serveur
   * par storage-account-generator.ts), mais on affiche quand même les
   * paires extraites de chaque fiche pour vérification/correction avant
   * génération. Plusieurs fiches -> plusieurs comptes de stockage dans le
   * même SA_list (env/service_fullname/SA_rg/tags dérivés de la 1ère fiche). */
  function proceedToStorageReview() {
    if (uploadedFiles.length === 0) return;
    setFileName(uploadedFiles.map((f) => f.fileName).join(" + "));
    setSaExtractedList(uploadedFiles.map((uf) => uf.extracted.map((e) => ({ ...e }))));
    setStep(3);
  }

  function updateSaExtracted(fileIndex: number, entryIndex: number, value: string) {
    setSaExtractedList((prev) =>
      prev.map((entries, fi) =>
        fi === fileIndex ? entries.map((e, i) => (i === entryIndex ? { ...e, value } : e)) : entries
      )
    );
  }

  async function proceedStorageAccount() {
    if (uploadedFiles.length === 0) return;
    setGenerating(true);
    setError("");

    const sourceFileBase64 = await fileToBase64(uploadedFiles[0].file);

    const res = await fetch("/api/generate/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId,
        fileName: uploadedFiles.map((f) => f.fileName).join(" + "),
        sourceFileBase64,
        sourceFileMime: uploadedFiles[0].file.type || undefined,
        extracted: saExtractedList,
      }),
    });

    const data = await res.json();
    setGenerating(false);

    if (!res.ok) {
      setError(data.error || "Erreur lors de la génération");
      return;
    }

    setResult(data);
    setStep(4);
    onGenerated?.();
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

    const sourceFileBase64 = sourceFile ? await fileToBase64(sourceFile) : undefined;
    const sourceFileMime = sourceFile?.type || undefined;

    const res = await fetch("/api/generate/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId,
        fileName,
        sourceFileBase64,
        sourceFileMime,
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
          sourceFileBase64,
          sourceFileMime,
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
          {
            label: "Fiche(s) Excel",
            hint: uploadedFiles.length > 1 ? `${uploadedFiles.length} fiches` : fileName || "—",
          },
          {
            label: "Revue des valeurs",
            hint: isStorageAccount
              ? saExtractedList.length
                ? `${saExtractedList.length} compte(s)`
                : "—"
              : rows.length
                ? `${modifiedCount} / ${rows.length} modifiées`
                : "—",
          },
          {
            label: "Résultat",
            hint: result ? "généré" : batchResults.length ? `${batchResults.length} générés` : "—",
          },
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
                onClick={() => {
                  setTemplateId(t.id);
                  resetUploadState();
                }}
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
          <UploadZone
            onPick={handleAddFile}
            hint="Formats .xlsx et .xlsm · plusieurs fiches possibles (une par VM à générer ou fusionner)."
          />
          {uploading && <p style={{ color: "#A3A3A3", fontSize: 13 }}>Lecture du fichier...</p>}

          {uploadedFiles.length > 0 && (
            <div
              style={{
                borderRadius: 12,
                background: "#171717",
                boxShadow: "0 0 0 1px #262626",
                overflow: "hidden",
              }}
            >
              {uploadedFiles.map((uf, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderBottom: i < uploadedFiles.length - 1 ? "1px solid #262626" : undefined,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 10.5,
                      color: "#D8B9FF",
                      border: "1px solid #4A2A6B",
                      borderRadius: 4,
                      padding: "1px 6px",
                    }}
                  >
                    {isStorageAccount ? "Fiche" : `VM${i + 1}`}
                  </span>
                  <span style={{ fontFamily: "monospace", fontSize: 12.5, color: "#E5E5E5" }}>{uf.fileName}</span>
                  <button
                    type="button"
                    onClick={() => removeUploadedFile(i)}
                    style={{ marginLeft: "auto", background: "none", border: 0, color: "#737373", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                    title="Retirer cette fiche"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {!isStorageAccount && uploadedFiles.length >= 2 && (
            <p style={{ color: "#A3A3A3", fontSize: 12.5 }}>
              {uploadedFiles.length} fiches importées : générez un .tfvars séparé par fiche, ou fusionnez-les en un
              seul .tfvars (la 1ère fiche garde les noms de variables tels quels, les suivantes sont préfixées
              vm2_, vm3_, ...).
            </p>
          )}

          {isStorageAccount && uploadedFiles.length >= 2 && (
            <p style={{ color: "#A3A3A3", fontSize: 12.5 }}>
              {uploadedFiles.length} fiches importées : elles seront toutes générées dans le même .tfvars, un compte
              de stockage par fiche dans SA_list (env/service_fullname/RG/tags communs déduits de la 1ère fiche).
            </p>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Button onClick={() => setStep(1)}>Retour</Button>
            {isStorageAccount ? (
              uploadedFiles.length >= 1 && (
                <Button variant="primary" onClick={proceedToStorageReview}>
                  Continuer
                </Button>
              )
            ) : (
              <>
                {uploadedFiles.length === 1 && (
                  <Button variant="primary" onClick={proceedSingle}>
                    Continuer
                  </Button>
                )}
                {uploadedFiles.length >= 2 && (
                  <>
                    <Button onClick={proceedBatch} disabled={batchRunning}>
                      {batchRunning ? "Génération..." : `Générer ${uploadedFiles.length} .tfvars séparés`}
                    </Button>
                    <Button variant="generate" onClick={proceedMerge}>
                      Fusionner en un seul .tfvars (VM1, VM2...)
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}

      {step === 3 && isStorageAccount && saExtractedList.length > 0 && (
        <>
          <p style={{ color: "#A3A3A3", fontSize: 12.5 }}>
            {saExtractedList.length > 1
              ? `${saExtractedList.length} comptes de stockage seront générés dans le même .tfvars.`
              : "Champs lus dans la fiche."}{" "}
            Corrigez si besoin avant de générer — les listes (conteneurs, partages, ACL, règles LCM, ...) seront
            construites automatiquement à partir de ces valeurs.
          </p>

          {saExtractedList.map((entries, fileIndex) => (
            <div key={fileIndex} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {saExtractedList.length > 1 && (
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "#D8B9FF" }}>
                  Compte {fileIndex + 1} — {uploadedFiles[fileIndex]?.fileName}
                </div>
              )}
              <div
                style={{
                  borderRadius: 12,
                  background: "#171717",
                  boxShadow: "0 0 0 1px #262626",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.1fr 1.9fr",
                    gap: 12,
                    padding: "8px 14px",
                    borderBottom: "1px solid #262626",
                    fontSize: 9.5,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#737373",
                  }}
                >
                  <div>Champ</div>
                  <div>Valeur</div>
                </div>
                {entries.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.1fr 1.9fr",
                      gap: 12,
                      alignItems: "center",
                      padding: "6px 14px",
                      borderBottom: i < entries.length - 1 ? "1px solid #262626" : undefined,
                    }}
                  >
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: "#E5E5E5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.key}
                    </span>
                    <textarea
                      value={e.value}
                      onChange={(ev) => updateSaExtracted(fileIndex, i, ev.target.value)}
                      rows={e.value.includes("\n") ? Math.min(6, e.value.split("\n").length) : 1}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        fontFamily: "monospace",
                        fontSize: 12,
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: "1px solid #333333",
                        background: "#0A0A0A",
                        color: "#FAFAFA",
                        resize: "vertical",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button onClick={() => setStep(2)}>Retour</Button>
            <Button variant="generate" onClick={proceedStorageAccount} disabled={generating}>
              {generating ? "Génération..." : "Générer le .tfvars"}
            </Button>
          </div>
        </>
      )}

      {step === 3 && !isStorageAccount && rows.length > 0 && (
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

      {step === 4 && batchResults.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ fontSize: 18, margin: 0, fontWeight: 600 }}>
            Résultats — {batchResults.length} fiches
          </h2>
          <div
            style={{
              borderRadius: 12,
              background: "#171717",
              boxShadow: "0 0 0 1px #262626",
              overflow: "hidden",
            }}
          >
            {batchResults.map((br, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 16px",
                  borderBottom: i < batchResults.length - 1 ? "1px solid #262626" : undefined,
                }}
              >
                <span style={{ fontFamily: "monospace", fontSize: 12.5, color: "#E5E5E5" }}>{br.fileName}</span>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                  {br.result ? (
                    <>
                      <StatusPill tone="ok">généré</StatusPill>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => window.open(`/api/generate/${br.result!.id}/download`, "_blank")}
                      >
                        Télécharger
                      </Button>
                    </>
                  ) : (
                    <StatusPill tone="error">{br.error || "erreur"}</StatusPill>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
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
            fileName={deriveFileName(result.content, selectedTemplate?.name || "template")}
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
                fileName={deriveFileName(rgResult.content, "rg")}
                meta="resource group"
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
