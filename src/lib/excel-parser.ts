import * as XLSX from "xlsx";

export interface ExtractedVariable {
  key: string;
  value: string;
}

/**
 * Trouve la feuille "synthèse" dans le classeur (insensible à la casse et aux accents),
 * sinon retombe sur la première feuille.
 */
function findSyntheseSheet(workbook: XLSX.WorkBook): string {
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const match = workbook.SheetNames.find((name) =>
    normalize(name).includes("synthese")
  );
  return match || workbook.SheetNames[0];
}

/**
 * Parse une fiche FIS Excel : on cherche des lignes structurées en paires
 * clé / valeur (2 colonnes non vides), sur l'onglet "synthèse".
 * On ignore les lignes de titres/sections (une seule cellule remplie).
 */
export function parseFISExcel(buffer: Buffer): ExtractedVariable[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
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

    extracted.push({ key: normalizeKey(key), value });
  }

  return extracted;
}

/**
 * Normalise une clé pour la faire correspondre au nom de variable Terraform
 * (snake_case, sans accents, sans espaces).
 */
export function normalizeKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
