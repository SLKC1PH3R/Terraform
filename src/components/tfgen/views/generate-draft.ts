import type { Row } from "./tfvarsRender";

/**
 * Brouillon de l'étape 3 (atelier de revue), persisté dans localStorage pour
 * survivre à un refresh accidentel. Ne couvre volontairement pas les
 * fichiers Excel bruts (non sérialisables, potentiellement volumineux) —
 * seules les valeurs déjà extraites/saisies à la main (rows) sont
 * conservées ; en cas de restauration, le fichier source d'origine n'est
 * plus rattaché à l'historique tant qu'il n'est pas réimporté.
 */
export interface GenerateDraft {
  templateId: string;
  fileName: string;
  rows: Row[];
  savedAt: string;
}

const KEY = "tfgen-generate-draft";

export function saveDraft(draft: Omit<GenerateDraft, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: new Date().toISOString() }));
  } catch {
    // quota dépassé ou stockage indisponible : le brouillon est un confort, pas une garantie
  }
}

export function loadDraft(): GenerateDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.templateId || !Array.isArray(parsed.rows)) return null;
    return parsed as GenerateDraft;
  } catch {
    return null;
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
