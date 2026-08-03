import type { ResourceCategory } from "../categories";

export const CATEGORY_LABELS: Record<string, string> = {
  RG: "Resource Group",
  STORAGE: "Storage Account",
  NSG_ASG: "NSG / ASG",
  VM_WINDOWS_MARKETPLACE: "VM Windows (Marketplace)",
  VM_WINDOWS_CUSTOM: "VM Windows (Custom)",
  VM_LINUX: "VM Linux",
  LOAD_BALANCER: "Load Balancer",
};

export const CATEGORIES = [
  { value: "RG", label: "Resource Group" },
  { value: "STORAGE", label: "Storage Account" },
  { value: "NSG_ASG", label: "NSG / ASG" },
  { value: "VM_WINDOWS_MARKETPLACE", label: "VM Windows (Marketplace)" },
  { value: "VM_WINDOWS_CUSTOM", label: "VM Windows (Custom)" },
  { value: "VM_LINUX", label: "VM Linux" },
  { value: "LOAD_BALANCER", label: "Load Balancer" },
];

/** Convertit une catégorie DB vers la ResourceCategory du design system, pour
 * les catégories connues. Une catégorie inconnue (ajoutée à la volée depuis
 * l'éditeur) est affichée telle quelle, avec un style de badge neutre. */
export const CATEGORY_TO_DESIGN: Record<string, ResourceCategory> = {
  RG: "RG",
  STORAGE: "Storage",
  NSG_ASG: "NSG/ASG",
  VM_WINDOWS_MARKETPLACE: "VM Windows",
  VM_WINDOWS_CUSTOM: "VM Windows",
  VM_LINUX: "VM Linux",
  LOAD_BALANCER: "ILB",
};

export function toDesignCategory(dbCategory: string): ResourceCategory {
  return CATEGORY_TO_DESIGN[dbCategory] ?? dbCategory;
}

export interface ApiTemplateVariable {
  id: string;
  name: string;
  type: string;
  defaultValue: string | null;
  description: string | null;
  required: boolean;
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
