"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon, ICONS } from "../icons";
import { CategoryBadge, CategoryTile } from "../categories";
import { StatusPill } from "../status-pill";
import { Stepper } from "../stepper";
import { TfvarsPreview } from "../tfvars-preview";
import { UploadZone } from "../upload-zone";
import { VariableSection } from "../variable-section";
import { ReviewWorkbench, type SourceFieldGroup } from "../review-workbench";
import { cn } from "@/lib/utils";
import { buildTfvars, deriveRgExtractedFields, deriveVmExtractedFields } from "@/lib/tfvars-generator";
import { isStorageAccountTemplate } from "@/lib/storage-account-generator";
import { ApiTemplate, ApiTemplateVariable, CATEGORY_LABELS, isVmCategory, toDesignCategory } from "./shared";
import { buildSections, contentToLines, deriveFileName, rowState, type BuildResult, type Row } from "./tfvarsRender";
import { clearDraft, loadDraft, saveDraft } from "./generate-draft";

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

/** Déclenche un téléchargement immédiat côté client, sans passer par le
 * serveur — le contenu affiché dans l'atelier de revue (aperçu live) est
 * déjà le résultat final. */
function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
  extracted: { key: string; value: string; label?: string }[];
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

/** Pour les templates VM uniquement : `service_fullname` doit reprendre le
 * champ FIS "Service_Name" (nom applicatif, ex. "Azure Proxy") plutôt que le
 * slug déduit du nom du Resource Group (ex. "olfeo") — cette dernière
 * convention reste utilisée telle quelle pour le template RG lui-même (et le
 * panneau RG secondaire), dont le nom de ressource est justement construit à
 * partir de ce slug. */
function applyVmServiceFullname(rows: Row[], extracted: { key: string; value: string }[]): Row[] {
  const serviceName = extracted.find((e) => e.key === "service_name")?.value;
  if (!serviceName) return rows;
  return rows.map((r) =>
    !r.group && r.name.toLowerCase() === "service_fullname"
      ? { ...r, finalValue: serviceName, matched: true }
      : r
  );
}

const HOSTNUM_RE = /^vm\d+_hostnum$/i;

/** Le "hostnum" (dernier segment de l'IP statique réservée dans le subnet)
 * n'est volontairement jamais déduit automatiquement — la numérotation
 * dans le subnet ne correspond pas fiablement au dernier octet de l'IP
 * assignée. C'est un champ obligatoire : laissé vide pour forcer une
 * saisie manuelle dans l'atelier de revue (bloque la génération tant
 * qu'il n'est pas rempli — cf. hasMissingRequired plus bas). */
function applyHostnumRule(rows: Row[]): Row[] {
  return rows.map((r) =>
    !r.group && HOSTNUM_RE.test(r.name) ? { ...r, finalValue: "", matched: false, required: true } : r
  );
}

/** Sleep_Priority ne doit jamais hériter de la valeur par défaut du
 * template ("100") quand la fiche FIS ne la renseigne pas explicitement —
 * dans ce cas, la variable doit rester vide dans le .tfvars généré. */
function applySleepPriorityRule(rows: Row[]): Row[] {
  return rows.map((r) => (r.name === "Sleep_Priority" && !r.matched ? { ...r, finalValue: "" } : r));
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
    // "vm1_index" ne provient jamais de la fiche FIS (ce n'est pas un champ
    // serveur) : sans ce cas particulier, la valeur par défaut du template
    // ("1") serait recopiée telle quelle pour vm2_index, vm3_index, ...
    // Ici on la fait correspondre au rang de la VM dans la fusion.
    const isIndexVar = v.name.toLowerCase() === "vm1_index";
    const finalValue = found !== undefined ? found : isIndexVar ? String(index) : v.defaultValue || "";

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
  const [diffOnly, setDiffOnly] = useState(false);
  const [justGenerated, setJustGenerated] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResultEntry[]>([]);

  const [rgInfo, setRgInfo] = useState<RgInfo | null>(null);
  const [createRg, setCreateRg] = useState(false);
  const [rgResult, setRgResult] = useState<BuildResult | null>(null);

  const [saExtractedList, setSaExtractedList] = useState<{ key: string; value: string }[][]>([]);

  const [openRgSections, setOpenRgSections] = useState<Record<string, boolean>>({});

  // Brouillon de l'atelier de revue (étape 3) : proposé au chargement si un
  // brouillon existe et qu'aucun template précis n'a été demandé (ex. clic
  // sur "Générer" depuis une carte de template, où l'intention est de
  // repartir de zéro pour ce template-là).
  const [draftBanner, setDraftBanner] = useState<{ templateId: string; fileName: string; rows: Row[] } | null>(null);

  useEffect(() => {
    if (initialTemplateId) return;
    const draft = loadDraft();
    if (draft) setDraftBanner(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sauvegarde automatique (débattue par React lui-même via la dépendance à
  // `rows`, qui ne change que sur une vraie édition) dès qu'il y a un
  // brouillon significatif en cours à l'étape 3.
  useEffect(() => {
    if (step >= 3 && templateId && rows.length > 0) {
      saveDraft({ templateId, fileName, rows });
    }
  }, [step, templateId, fileName, rows]);

  function resumeDraft() {
    if (!draftBanner) return;
    setTemplateId(draftBanner.templateId);
    setFileName(draftBanner.fileName);
    setRows(draftBanner.rows);
    setStep(3);
    setDraftBanner(null);
  }

  function discardDraft() {
    clearDraft();
    setDraftBanner(null);
  }

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

  // Aperçu .tfvars live : recalculé côté client à chaque édition d'une valeur,
  // sans attendre la génération serveur — c'est le volet droit de l'atelier
  // de revue (étape 3).
  const livePreview = useMemo(() => {
    if (!selectedTemplate || rows.length === 0) return null;
    return buildTfvars(
      rows.map((r) => ({ name: r.name, type: r.type, defaultValue: r.defaultValue, finalValue: r.finalValue, group: r.group })),
      selectedTemplate.tfContent
    );
  }, [selectedTemplate, rows]);

  const modifiedCount = rows.filter((r) => rowState(r) === "modified").length;
  const defaultCount = rows.length - modifiedCount;
  const hasMissingRequired = rows.some((r) => rowState(r) === "missing");

  // Champs bruts de la ou des fiches importées, avant matching/déduction —
  // affichés dans l'onglet "fiche source" de l'atelier de revue.
  const sourceFields: SourceFieldGroup[] = useMemo(
    () =>
      uploadedFiles.map((uf) => ({
        fileName: uf.fileName,
        entries: uf.extracted
          .filter((e): e is { key: string; value: string; label: string } => !!e.label)
          .map((e) => ({ key: e.label, value: e.value })),
      })),
    [uploadedFiles]
  );

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
    let newRows = matchRows(selectedTemplate.variables, uf.extracted);
    if (isVmCategory(selectedTemplate.category)) newRows = applyVmServiceFullname(newRows, uf.extracted);
    newRows = applySleepPriorityRule(applyHostnumRule(newRows));
    setRows(newRows);
    setStep(3);
    setupRgInfo(uf);
  }

  function proceedMerge() {
    if (!selectedTemplate || uploadedFiles.length < 2) return;
    // Convention WIN-IMAGE/LNX-IMG (vm1_*, tags_vm1...) : on renumérote le
    // jeton vm1 -> vm2/vm3/... plutôt que de préfixer par-dessus. Repli sur
    // un préfixe générique si le template ne suit pas cette convention.
    const useTokenRenumber = templateHasVmToken(selectedTemplate.variables);
    let combined: Row[] = [];
    uploadedFiles.forEach((uf, i) => {
      if (useTokenRenumber) {
        combined.push(...matchRowsForMerge(selectedTemplate.variables, uf.extracted, i + 1));
      } else {
        const prefix = i === 0 ? "" : `vm${i + 1}_`;
        combined.push(...matchRows(selectedTemplate.variables, uf.extracted, prefix));
      }
    });
    if (isVmCategory(selectedTemplate.category)) {
      combined = applyVmServiceFullname(combined, uploadedFiles[0].extracted);
    }
    combined = applySleepPriorityRule(applyHostnumRule(combined));
    setRows(combined);
    setFileName(uploadedFiles.map((f) => f.fileName).join(" + "));
    setSourceFile(uploadedFiles[0].file);
    setStep(3);
    setupRgInfo(uploadedFiles[0]);
  }

  async function proceedBatch() {
    if (!selectedTemplate || uploadedFiles.length < 2) return;
    setBatchRunning(true);
    setError("");

    const results: BatchResultEntry[] = [];

    for (const uf of uploadedFiles) {
      let rowsForFile = matchRows(selectedTemplate.variables, uf.extracted);
      if (isVmCategory(selectedTemplate.category)) rowsForFile = applyVmServiceFullname(rowsForFile, uf.extracted);
      // Pas d'étape de revue en génération par lot : impossible de bloquer sur
      // un hostnum manquant, on laisse donc la valeur par défaut du template
      // plutôt qu'un champ vide qui produirait un .tfvars incomplet sans recours.
      rowsForFile = applySleepPriorityRule(rowsForFile);
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
    if (!selectedTemplate || !livePreview || hasMissingRequired) return;
    setError("");
    setJustGenerated(false);

    // Téléchargement instantané côté client : l'aperçu live affiché dans
    // l'atelier de revue EST déjà le résultat final, pas la peine d'attendre
    // le serveur pour l'obtenir. La sauvegarde en base (historique) suit en
    // tâche de fond, sans bloquer la suite.
    downloadTextFile(deriveFileName(livePreview.content, selectedTemplate.name), livePreview.content);
    clearDraft();

    let rgTemplate: ApiTemplate | undefined;
    if (createRg && rgInfo) {
      rgTemplate = templates.find((t) => t.id === rgInfo.templateId);
      if (rgTemplate?.tfContent) {
        const rgLive = buildTfvars(
          rgInfo.rows.map((r) => ({ name: r.name, type: r.type, defaultValue: r.defaultValue, finalValue: r.finalValue, group: r.group })),
          rgTemplate.tfContent
        );
        downloadTextFile(deriveFileName(rgLive.content, "rg"), rgLive.content);
      }
    }

    setResult({ id: "", content: livePreview.content, diff: livePreview.diff });
    setStep(4);
    setJustGenerated(true);

    setGenerating(true);
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
      setError(data.error || "Le fichier a bien été téléchargé, mais l'enregistrement dans l'historique a échoué.");
      return;
    }

    setResult(data);

    if (createRg && rgInfo && rgTemplate) {
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
        setError(rgData.error || "Erreur lors de l'enregistrement du Resource Group dans l'historique");
      }
    }

    setGenerating(false);
    onGenerated?.();
  }

  return (
    <div className="flex flex-col gap-6.5">
      <h1 className="m-0 text-[30px] font-semibold">Génération</h1>

      {draftBanner && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
          <Icon path={ICONS.warning} size={16} className="shrink-0 text-accent" />
          <div className="flex-1 text-[13px] text-secondary-foreground">
            Un brouillon de génération a été trouvé
            {draftBanner.fileName ? ` (${draftBanner.fileName})` : ""} — reprendre là où vous en étiez ?
          </div>
          <div className="flex gap-2">
            <Button variant="generate" size="sm" onClick={resumeDraft}>
              Reprendre
            </Button>
            <Button size="sm" onClick={discardDraft}>
              Ignorer
            </Button>
          </div>
        </div>
      )}

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

      {error && <p className="text-[13px] text-destructive">{error}</p>}

      {step === 1 && (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2.5">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTemplateId(t.id);
                  resetUploadState();
                }}
                className={cn(
                  "flex flex-col gap-2.5 rounded-xl border bg-card p-3.5 text-left text-foreground",
                  t.id === templateId ? "border-accent" : "border-border",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <CategoryTile category={toDesignCategory(t.category)} className="size-[26px]" />
                  <span className="font-mono text-[13.5px] text-accent">{t.name}</span>
                  <span className="ml-auto">
                    <CategoryBadge category={toDesignCategory(t.category)} />
                  </span>
                </div>
                <div className="text-[12.5px] leading-relaxed text-muted-foreground">
                  {t.description || CATEGORY_LABELS[t.category]} · {t.variables.length} variables
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button variant="default" disabled={!templateId} onClick={() => setStep(2)}>
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
          {uploading && <p className="text-[13px] text-muted-foreground">Lecture du fichier...</p>}

          {uploadedFiles.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {uploadedFiles.map((uf, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 border-b border-border px-3.5 py-2.5 last:border-b-0"
                >
                  <span className="rounded border border-accent/40 px-1.5 py-px font-mono text-[10.5px] text-accent">
                    {isStorageAccount ? "Fiche" : `VM${i + 1}`}
                  </span>
                  <span className="font-mono text-[12.5px] text-secondary-foreground">{uf.fileName}</span>
                  <button
                    type="button"
                    onClick={() => removeUploadedFile(i)}
                    className="ml-auto border-0 bg-transparent text-base leading-none text-muted-foreground"
                    title="Retirer cette fiche"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {!isStorageAccount && uploadedFiles.length >= 2 && (
            <p className="text-[12.5px] text-muted-foreground">
              {uploadedFiles.length} fiches importées : générez un .tfvars séparé par fiche, ou fusionnez-les en un
              seul .tfvars (la 1ère fiche garde les noms de variables tels quels, les suivantes sont préfixées
              vm2_, vm3_, ...).
            </p>
          )}

          {isStorageAccount && uploadedFiles.length >= 2 && (
            <p className="text-[12.5px] text-muted-foreground">
              {uploadedFiles.length} fiches importées : elles seront toutes générées dans le même .tfvars, un compte
              de stockage par fiche dans SA_list (env/service_fullname/RG/tags communs déduits de la 1ère fiche).
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setStep(1)}>Retour</Button>
            {isStorageAccount ? (
              uploadedFiles.length >= 1 && (
                <Button variant="default" onClick={proceedToStorageReview}>
                  Continuer
                </Button>
              )
            ) : (
              <>
                {uploadedFiles.length === 1 && (
                  <Button variant="default" onClick={proceedSingle}>
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
          <p className="text-[12.5px] text-muted-foreground">
            {saExtractedList.length > 1
              ? `${saExtractedList.length} comptes de stockage seront générés dans le même .tfvars.`
              : "Champs lus dans la fiche."}{" "}
            Corrigez si besoin avant de générer — les listes (conteneurs, partages, ACL, règles LCM, ...) seront
            construites automatiquement à partir de ces valeurs.
          </p>

          {saExtractedList.map((entries, fileIndex) => (
            <div key={fileIndex} className="flex flex-col gap-2">
              {saExtractedList.length > 1 && (
                <div className="font-mono text-xs text-accent">
                  Compte {fileIndex + 1} — {uploadedFiles[fileIndex]?.fileName}
                </div>
              )}
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="grid grid-cols-[1.1fr_1.9fr] gap-3 border-b border-border px-3.5 py-2 text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                  <div>Champ</div>
                  <div>Valeur</div>
                </div>
                {entries.map((e, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1.1fr_1.9fr] items-center gap-3 border-b border-border px-3.5 py-1.5 last:border-b-0"
                  >
                    <span className="truncate font-mono text-xs text-secondary-foreground">{e.key}</span>
                    <textarea
                      value={e.value}
                      onChange={(ev) => updateSaExtracted(fileIndex, i, ev.target.value)}
                      rows={e.value.includes("\n") ? Math.min(6, e.value.split("\n").length) : 1}
                      className="w-full resize-y rounded-md border border-border bg-code px-2 py-1 font-mono text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-2">
            <Button onClick={() => setStep(2)}>Retour</Button>
            <Button variant="generate" onClick={proceedStorageAccount} disabled={generating}>
              {generating ? "Génération..." : "Générer le .tfvars"}
            </Button>
          </div>
        </>
      )}

      {step === 3 && !isStorageAccount && rows.length > 0 && (
        <>
          <ReviewWorkbench
            sections={sections}
            lines={livePreview ? contentToLines(livePreview.content, livePreview.diff) : []}
            content={livePreview?.content}
            sourceFields={sourceFields}
            diffOnly={diffOnly}
            onDiffOnlyChange={setDiffOnly}
            onGenerate={handleGenerate}
            generateDisabled={hasMissingRequired}
            onValueChange={(sectionId, rowName, value) =>
              updateRowByIdentity(sectionId === "_root" ? "" : sectionId, rowName, value)
            }
          />

          {rgInfo && (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5">
              <label className="flex cursor-pointer items-start gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={createRg}
                  onChange={(e) => setCreateRg(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Le Resource Group <code>rg-{rgInfo.serviceFullname}-{rgInfo.env}-xxx</code> n'existe pas encore
                  sur Azure → générer aussi son .tfvars (déduit de cette fiche FIS).
                </span>
              </label>

              {createRg && (
                <div className="flex flex-col gap-2.5">
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

          {hasMissingRequired && (
            <p className="text-[12.5px] text-destructive">
              Des champs obligatoires sont vides (ex. hostnum) — remplissez-les pour pouvoir générer.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button onClick={() => setStep(2)}>Retour</Button>
            <Button
              variant="generate"
              onClick={handleGenerate}
              disabled={generating || hasMissingRequired}
              title={hasMissingRequired ? "Des champs obligatoires sont vides" : undefined}
            >
              {generating ? "Génération..." : "Générer le .tfvars"}
            </Button>
          </div>
        </>
      )}

      {step === 4 && batchResults.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h2 className="m-0 text-[18px] font-semibold">Résultats — {batchResults.length} fiches</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {batchResults.map((br, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 border-b border-border px-4 py-2.5 last:border-b-0"
              >
                <span className="font-mono text-[12.5px] text-secondary-foreground">{br.fileName}</span>
                <div className="ml-auto flex items-center gap-2">
                  {br.result ? (
                    <>
                      <StatusPill tone="ok">généré</StatusPill>
                      <Button
                        size="sm"
                        variant="default"
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
          {justGenerated && (
            <div className="tfgen-rise flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2.5 text-[13px] text-[#9BE3B8]">
              <Icon path={ICONS.check} size={15} className="shrink-0" />
              Généré avec succès — le fichier a été téléchargé automatiquement.
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <StatusPill tone="ok">{result.diff.filter((d) => d.changed).length} lignes surlignées</StatusPill>
            {generating && <StatusPill tone="neutral">Enregistrement dans l'historique…</StatusPill>}
            <div className="ml-auto flex gap-2">
              <Button
                variant="default"
                disabled={!result.id}
                title={!result.id ? "Enregistrement en cours…" : undefined}
                onClick={() => window.open(`/api/generate/${result.id}/download`, "_blank")}
              >
                Retélécharger le .tfvars
              </Button>
            </div>
          </div>
          <TfvarsPreview
            lines={contentToLines(result.content, result.diff)}
            content={result.content}
            fileName={deriveFileName(result.content, selectedTemplate?.name || "template")}
            meta={`généré depuis ${selectedTemplate?.name || ""}`}
          />

          {rgResult && (
            <>
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] text-muted-foreground">
                  Resource Group rg-{rgInfo?.serviceFullname}-{rgInfo?.env}-xxx
                </span>
                <div className="ml-auto flex gap-2">
                  <Button variant="default" onClick={() => window.open(`/api/generate/${rgResult.id}/download`, "_blank")}>
                    Télécharger le .tfvars du RG
                  </Button>
                </div>
              </div>
              <TfvarsPreview
                lines={contentToLines(rgResult.content, rgResult.diff)}
                content={rgResult.content}
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
