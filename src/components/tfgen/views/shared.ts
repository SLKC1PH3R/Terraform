import type { ResourceCategory } from "../tokens";

export const CATEGORY_LABELS: Record<string, string> = {
  RG: "Resource Group",
  STORAGE: "Storage Account",
  NSG_ASG: "NSG / ASG",
  VM_WINDOWS_MARKETPLACE: "VM Windows (Marketplace)",
  VM_WINDOWS_CUSTOM: "VM Windows (Custom)",
  VM_LINUX: "VM Linux",
};

export const CATEGORIES = [
  { value: "RG", label: "Resource Group" },
  { value: "STORAGE", label: "Storage Account" },
  { value: "NSG_ASG", label: "NSG / ASG" },
  { value: "VM_WINDOWS_MARKETPLACE", label: "VM Windows (Marketplace)" },
  { value: "VM_WINDOWS_CUSTOM", label: "VM Windows (Custom)" },
  { value: "VM_LINUX", label: "VM Linux" },
];

/** Convertit une catégorie DB (enum Prisma) vers la ResourceCategory du design system. */
export const CATEGORY_TO_DESIGN: Record<string, ResourceCategory> = {
  RG: "RG",
  STORAGE: "Storage",
  NSG_ASG: "NSG/ASG",
  VM_WINDOWS_MARKETPLACE: "VM Windows",
  VM_WINDOWS_CUSTOM: "VM Windows",
  VM_LINUX: "VM Linux",
};

export function toDesignCategory(dbCategory: string): ResourceCategory {
  return CATEGORY_TO_DESIGN[dbCategory] ?? "RG";
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
  templateId: string;
  fileName: string;
  resultTfvars: string;
  diffJson: string;
  createdAt: string;
  template: ApiTemplate;
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
