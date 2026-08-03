"use client";

import { Icon, ICONS } from "./icons";
import { CATEGORY_TO_DESIGN } from "./views/shared";
import type { ResourceCategory } from "./categories";

/**
 * v2 category metadata: badge classes, a Phosphor glyph and a *family*
 * (used by the dashboard's template filter). Families are derived from the DB
 * categories in views/shared.ts, so a new DB category only needs one line here.
 *
 * "VM" regroupe Linux et Windows (une seule catégorie de template côté base
 * — cf. views/shared.ts) : un seul glyphe générique de serveur pour les deux.
 */
export type CategoryFamily = "Socle" | "Compute" | "Réseau" | "Données";

export const CATEGORY_META: Record<
  ResourceCategory,
  { label: string; family: CategoryFamily; icon: string; badge: string; text: string }
> = {
  RG: {
    label: "Resource Group",
    family: "Socle",
    icon: "M216,72H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.4,15.4,0,0,0,39.38,216H216.89A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72ZM40,56H92.69l16,16H40Zm176,144H40V88H216Z",
    badge: "bg-secondary border-[#38342E]",
    text: "text-[#A8A199]",
  },
  Storage: {
    label: "Storage Account",
    family: "Données",
    icon: "M128,24C74.17,24,32,48.6,32,80v96c0,31.4,42.17,56,96,56s96-24.6,96-56V80C224,48.6,181.83,24,128,24Zm80,104c0,9.62-7.88,19.43-21.61,26.92C170.93,163.35,150.19,168,128,168s-42.93-4.65-58.39-13.08C55.88,147.43,48,137.62,48,128V111.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64ZM69.61,53.08C85.07,44.65,105.81,40,128,40s42.93,4.65,58.39,13.08C200.12,60.57,208,70.38,208,80s-7.88,19.43-21.61,26.92C170.93,115.35,150.19,120,128,120s-42.93-4.65-58.39-13.08C55.88,99.43,48,89.62,48,80S55.88,60.57,69.61,53.08ZM186.39,202.92C170.93,211.35,150.19,216,128,216s-42.93-4.65-58.39-13.08C55.88,195.43,48,185.62,48,176V159.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64V176C208,185.62,200.12,195.43,186.39,202.92Z",
    badge: "bg-[#60A5FA]/11 border-[#26436E]",
    text: "text-[#7EB6F5]",
  },
  "NSG/ASG": {
    label: "NSG / ASG",
    family: "Réseau",
    icon: "M208,40H48A16,16,0,0,0,32,56v58.78c0,89.61,75.82,119.34,91,124.39a15.53,15.53,0,0,0,10,0c15.2-5.05,91-34.78,91-124.39V56A16,16,0,0,0,208,40Zm0,74.79c0,78.42-66.35,104.62-80,109.18-13.53-4.51-80-30.69-80-109.18V56H208Z",
    badge: "bg-[#4DD4C4]/10 border-[#1F4C4A]",
    text: "text-[#4DD4C4]",
  },
  VM: {
    label: "Virtual Machines",
    family: "Compute",
    icon: "M208,40H48A24,24,0,0,0,24,64V176a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V64A24,24,0,0,0,208,40Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8ZM176,224a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,224Z",
    badge: "bg-[#818CF8]/12 border-[#33357A]",
    text: "text-[#93A8FF]",
  },
  ILB: {
    label: "Load Balancer",
    family: "Réseau",
    icon: "M240,128a8,8,0,0,1-8,8H211.13l-5.14,20.57A16,16,0,0,1,190.47,168H172.6l-4.6,18.4A16,16,0,0,1,152.49,198H136v10a8,8,0,0,1-16,0V198H103.51A16,16,0,0,1,88,186.4L83.4,168H65.53a16,16,0,0,1-15.52-11.43L44.87,136H24a8,8,0,0,1,0-16H44.87l5.14-20.57A16,16,0,0,1,65.53,88H83.4L88,69.6A16,16,0,0,1,103.51,58H120V48a8,8,0,0,1,16,0V58h16.49A16,16,0,0,1,168,69.6L172.6,88h17.87A16,16,0,0,1,206,99.43L211.13,120H232A8,8,0,0,1,240,128Zm-49.53,24,6-24-6-24H172.6l-4.6-18.4L152.49,74h-49L88.4,88.4,83.4,104H65.53l-6,24,6,24H83.4l5,18.4L103.51,182h49l15.49-11.6,4.6-18.4Z",
    badge: "bg-[#F472B6]/11 border-[#6B2B4A]",
    text: "text-[#F49CC4]",
  },
  KV: {
    label: "Key Vault",
    family: "Socle",
    icon: "M216.57,39.43a32,32,0,0,0-45.26,0L102.4,108.34A56,56,0,1,0,147.66,153.6l14.34-14.35,16,16a8,8,0,0,0,11.32-11.31l-16-16,20.68-20.69,16,16a8,8,0,0,0,11.32-11.31l-16-16,11.25-11.25A32,32,0,0,0,216.57,39.43Zm-11.31,33.94-11.32,11.32L182.63,73.37,193.94,62.06a8,8,0,0,1,11.32,11.31ZM136.34,142.29l-20,20a8,8,0,0,1-11.32-11.32l20-20a8,8,0,0,0-11.32-11.31l-20,20a24,24,0,0,0,33.95,33.94l20-20A40,40,0,1,1,136.34,142.29Z",
    badge: "bg-accent/10 border-[#5B4420]",
    text: "text-[#E8B865]",
  },
};

const FALLBACK = CATEGORY_META.RG;

export function metaFor(category: string) {
  const design = (CATEGORY_TO_DESIGN[category] ?? category) as ResourceCategory;
  return CATEGORY_META[design] ?? FALLBACK;
}

export const FAMILIES: (CategoryFamily | "Tous")[] = ["Tous", "Socle", "Compute", "Réseau", "Données"];

/** Tinted rounded tile — 34px on cards, 30px in the resume queue. */
export function CategoryTile({ category, size = 34 }: { category: string; size?: number }) {
  const meta = metaFor(category);
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-[10px] border ${meta.badge} ${meta.text}`}
      style={{ width: size, height: size }}
    >
      <Icon path={meta.icon} size={Math.round(size * 0.5)} />
    </span>
  );
}

/** Pill badge with the glyph and the human label. */
export function CategoryChip({ category }: { category: string }) {
  const meta = metaFor(category);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-px text-[10px] ${meta.badge} ${meta.text}`}
    >
      <Icon path={meta.icon} size={11} />
      {meta.label}
    </span>
  );
}

export { ICONS };
