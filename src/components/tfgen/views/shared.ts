import type { ResourceCategory } from "../categories";

/** Catégories fixes de l'application — une seule catégorie "Virtual
 * Machines" regroupe les templates VM Linux et Windows, les autres types de
 * ressources ont chacun la leur. Liste figée : pas d'ajout/renommage/
 * suppression depuis l'éditeur. */
export const CATEGORY_LABELS: Record<string, string> = {
  RG: "Resource Group",
  STORAGE: "Storage Account",
  NSG_ASG: "NSG / ASG",
  VM: "Virtual Machines",
  LOAD_BALANCER: "Load Balancer",
  KEY_VAULT: "Key Vault",
};

export const CATEGORIES = [
  { value: "RG", label: "Resource Group" },
  { value: "STORAGE", label: "Storage Account" },
  { value: "NSG_ASG", label: "NSG / ASG" },
  { value: "VM", label: "Virtual Machines" },
  { value: "LOAD_BALANCER", label: "Load Balancer" },
  { value: "KEY_VAULT", label: "Key Vault" },
];

/** Convertit une catégorie DB vers la ResourceCategory du design system, pour
 * les catégories connues. Une catégorie inconnue (ex. donnée historique)
 * est affichée telle quelle, avec un style de badge neutre. */
export const CATEGORY_TO_DESIGN: Record<string, ResourceCategory> = {
  RG: "RG",
  STORAGE: "Storage",
  NSG_ASG: "NSG/ASG",
  VM: "VM",
  LOAD_BALANCER: "ILB",
  KEY_VAULT: "KV",
};

export function toDesignCategory(dbCategory: string): ResourceCategory {
  return CATEGORY_TO_DESIGN[dbCategory] ?? dbCategory;
}

export function isVmCategory(dbCategory: string): boolean {
  return (
    dbCategory === "VM" ||
    dbCategory === "VM_WINDOWS_MARKETPLACE" ||
    dbCategory === "VM_WINDOWS_CUSTOM" ||
    dbCategory === "VM_LINUX"
  );
}

export interface ApiTemplateVariable {
  id: string;
  name: string;
  type: string;
  defaultValue: string | null;
  description: string | null;
  group: string | null;
  order: number;
}

export interface ApiTemplate {
  id: string;
  name: string;
  category: string;
  description: string | null;
  tfContent: string | null;
  variables: ApiTemplateVariable[];
  createdAt: string;
  updatedAt: string;
}

/** Noms des 9 templates de base injectés par prisma/seed-templates.mjs
 * depuis le dossier Model-Ressource/. Détection par nom (pas de champ dédié
 * en base) : un template renommé perd sa protection, un doublon "(copie)"
 * n'est jamais protégé. */
export const PROTECTED_TEMPLATE_NAMES = new Set([
  "Resource Group",
  "Storage Account",
  "ASG / NSG",
  "VM Windows (Image)",
  "VM Windows (Marketplace)",
  "VM Linux (Image)",
  "VM Linux (Marketplace)",
  "Load Balancer",
  "Key Vault",
]);

export function isProtectedTemplate(name: string): boolean {
  return PROTECTED_TEMPLATE_NAMES.has(name);
}

/** Texte exact demandé par l'utilisateur pour le pop-up de confirmation
 * affiché lorsqu'on tente de supprimer un template protégé. Ne pas reformuler. */
export const PROTECTED_TEMPLATE_MESSAGE =
  "Template de base venant du dossier Model Ressource de Fidal, il n'est pas conseillé de le supprimer, si besoin de travailler sur ce template vous pouvez le dupliquer et utiliser l'autre.\n\nCordialement l'équipe Microsoft";

export interface ApiGeneration {
  id: string;
  fileName: string;
  createdAt: string;
  hasSourceFile: boolean;
  template: { id: string; name: string; category: string };
}

export function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? "il y a 1 h" : `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "hier";
  if (d < 30) return `il y a ${d} j`;
  return date.toLocaleDateString("fr-FR");
}
