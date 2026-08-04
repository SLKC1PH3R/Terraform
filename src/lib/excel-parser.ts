import * as XLSX from "xlsx";

export interface ExtractedVariable {
  key: string;
  value: string;
  /** Libellé original de la fiche (ex. "Nom du serveur"), pour affichage —
   * absent pour les paires synthétiques ajoutées par déduction (alias vm_rg,
   * env dérivé du RG, ...). */
  label?: string;
}

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Trouve la feuille "synthèse" dans le classeur (insensible à la casse et aux accents),
 * sinon retombe sur la première feuille.
 */
function findSyntheseSheet(workbook: XLSX.WorkBook): string {
  const match = workbook.SheetNames.find((name) => normalize(name).includes("synthese"));
  return match || workbook.SheetNames[0];
}

/**
 * Détecte, dans une feuille de type "formulaire" (colonnes = champs), la ligne
 * d'en-têtes et la ligne de valeurs réelles. Convention observée sur les
 * fiches d'identité Azure (ex. Storage Account, onglets "Global" /
 * "Storage Account") : une ligne d'en-têtes, suivie d'une ligne "Exemple"
 * (colonne A = "Exemple"), suivie de la ligne de valeurs réelles (colonne A
 * vide, autres colonnes renseignées).
 */
function findHeaderAndDataRow(
  rows: unknown[][]
): { headerRow: unknown[]; dataRow: unknown[] } | null {
  for (let i = 1; i < rows.length; i++) {
    const first = String(rows[i]?.[0] ?? "").trim().toLowerCase();
    if (first !== "exemple") continue;

    const headerRow = rows[i - 1] || [];
    for (let j = i + 1; j < rows.length; j++) {
      const r = rows[j] || [];
      const hasContent = (r as unknown[]).some(
        (c, idx) => idx > 0 && String(c ?? "").trim() !== ""
      );
      if (hasContent) return { headerRow, dataRow: r };
    }
    return null;
  }
  return null;
}

function extractRowPairs(headerRow: unknown[], dataRow: unknown[]): ExtractedVariable[] {
  const extracted: ExtractedVariable[] = [];
  const len = Math.max(headerRow.length, dataRow.length);

  for (let i = 0; i < len; i++) {
    const rawHeader = String(headerRow[i] ?? "").trim();
    const rawValue = String(dataRow[i] ?? "").trim();
    if (!rawHeader || !rawValue) continue;

    // les en-têtes contiennent parfois des explications sur une 2e ligne (\r\n)
    const key = rawHeader.split(/\r?\n/)[0].trim();
    if (!key) continue;

    extracted.push({ key: normalizeKey(key), value: rawValue, label: key });
  }

  return extracted;
}

/**
 * Parse les feuilles de type "formulaire" (fiches d'identité multi-onglets,
 * ex. Storage Account : onglets "Global" + "Storage Account"). Chaque onglet
 * reconnu (via le marqueur "Exemple") contribue ses paires clé/valeur ;
 * les onglets sans ce marqueur (ex. "Notice", "data") sont ignorés.
 * Retourne null si aucun onglet ne correspond à ce format.
 */
function parseFormSheets(workbook: XLSX.WorkBook): ExtractedVariable[] | null {
  const extracted: ExtractedVariable[] = [];
  let matchedAnySheet = false;

  for (const name of workbook.SheetNames) {
    const rows: unknown[][] = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
      header: 1,
      raw: false,
      defval: "",
    });
    const found = findHeaderAndDataRow(rows);
    if (found) {
      matchedAnySheet = true;
      extracted.push(...extractRowPairs(found.headerRow, found.dataRow));
    }
  }

  return matchedAnySheet ? extracted : null;
}

/**
 * Parse une fiche FIS Excel "classique" (onglet synthèse) : lignes structurées
 * en paires clé / valeur (2 colonnes non vides). On ignore les lignes de
 * titres/sections (une seule cellule remplie).
 */
function parseSyntheseSheet(workbook: XLSX.WorkBook): ExtractedVariable[] {
  const sheetName = findSyntheseSheet(workbook);
  const sheet = workbook.Sheets[sheetName];

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  const extracted: ExtractedVariable[] = [];

  for (const row of rows) {
    // On cherche la première paire de cellules non vides consécutives sur la ligne
    const cells = (row as unknown[]).map((c) => (c === undefined ? "" : String(c).trim()));
    // Retire les cellules vides en fin de ligne, garde l'ordre
    const nonEmptyIndexes = cells
      .map((c, i) => ({ c, i }))
      .filter((x) => x.c !== "");

    if (nonEmptyIndexes.length < 2) continue;

    const key = nonEmptyIndexes[0].c;
    const value = nonEmptyIndexes[1].c;

    // Ignore les lignes qui ressemblent à des titres de section (tout en majuscules, pas de valeur "typique")
    if (!key || !value) continue;
    if (key.length > 80) continue; // probablement pas une clé de variable

    extracted.push({ key: normalizeKey(key), value, label: key });
  }

  return extracted;
}

/** Libellés fixes de l'onglet "Bootdiag" (fiches VM) -> nom de variable
 * attendu par les templates VM (bootdiag_name / bootdiag_rg). */
const BOOTDIAG_LABEL_TO_KEY: Record<string, string> = {
  nom_du_compte_de_stockage_de_bootdiag_de_la_vm: "bootdiag_name",
  nom_du_rg_pour_le_compte_de_stockage_de_bootdiag_de_la_vm: "bootdiag_rg",
};

/**
 * Parse l'onglet "Bootdiag" des fiches VM (2 lignes clé/valeur : nom du
 * compte de stockage de bootdiag et son RG). Absent des fiches CSV et des
 * autres types de fiche (Storage Account, Key Vault, ...) : retourne un
 * tableau vide si l'onglet n'existe pas.
 */
function parseBootdiagSheet(workbook: XLSX.WorkBook): ExtractedVariable[] {
  const sheetName = workbook.SheetNames.find((name) => normalize(name).includes("bootdiag"));
  if (!sheetName) return [];

  const rows: unknown[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: "",
  });

  const extracted: ExtractedVariable[] = [];
  for (const row of rows) {
    const label = String((row as unknown[])[0] ?? "").trim();
    const value = String((row as unknown[])[1] ?? "").trim();
    if (!label || !value) continue;

    const targetKey = BOOTDIAG_LABEL_TO_KEY[normalizeKey(label)];
    if (targetKey) extracted.push({ key: targetKey, value, label });
  }

  return extracted;
}

/**
 * Parse une fiche FIS Excel et en extrait les paires clé/valeur. Détecte
 * automatiquement le format : fiche multi-onglets "formulaire" (ex. Storage
 * Account) ou fiche classique à onglet "synthèse" — puis complète, si
 * présent, avec l'onglet "Bootdiag" des fiches VM.
 */
export function parseFISExcel(buffer: Buffer): ExtractedVariable[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const formExtracted = parseFormSheets(workbook);
  const base = formExtracted && formExtracted.length > 0 ? formExtracted : parseSyntheseSheet(workbook);

  const bootdiag = parseBootdiagSheet(workbook);
  return bootdiag.length ? [...base, ...bootdiag] : base;
}

/**
 * Normalise une clé pour la faire correspondre au nom de variable Terraform
 * (snake_case, sans accents, sans espaces).
 */
export function normalizeKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
