/**
 * TFGen design tokens — Terramate-aligned dark palette.
 * Single source of truth: mirror these into tailwind.config.ts (see tailwind.tfgen.ts).
 */

export const color = {
  // grounds
  bg: '#09090B', // page
  surface: '#171717', // cards, sidebar
  surfaceRaised: '#1F1F1F', // section headers
  surfaceHover: '#262626',
  code: '#0A0A0A', // editor / input grounds
  border: '#262626',
  borderStrong: '#333333',
  borderHover: '#404040',

  // text
  text: '#FAFAFA',
  textSecondary: '#E5E5E5',
  textMuted: '#A3A3A3',
  textDim: '#737373',
  textFaint: '#525252',

  // roles
  primary: '#34D399', // main actions (Terramate primary)
  primarySoft: '#6EE7B7',
  primaryBorder: '#256B52',
  primaryTint: 'rgba(52,211,153,0.10)',
  primaryTintHover: 'rgba(52,211,153,0.18)',

  generate: '#A855F7', // templates / .tfvars generation
  generateSoft: '#D8B9FF',
  generateBorder: '#4A2A6B',
  generateTint: 'rgba(168,85,247,0.14)',
  generateTintHover: 'rgba(168,85,247,0.24)',

  diff: '#34D399', // "valeur modifiée"
  diffSoft: '#6EE7B7',
  diffText: '#A7F3D0',
  diffBorder: '#1D4F42',
  diffRow: 'rgba(52,211,153,0.08)',
  diffLine: 'rgba(52,211,153,0.11)',

  danger: '#EF4444',
  dangerSoft: '#F87171',
  dangerBorder: '#5C2A2E',
  dangerTint: 'rgba(239,68,68,0.10)',

  warn: '#F59E0B',
  warnText: '#E0C79A',
  warnBorder: '#4A3A1E',
  warnTint: 'rgba(245,158,11,0.08)',
} as const;

/** 1px gradient outline used on the active sidebar item. */
export const activeNavGradient =
  'linear-gradient(#171717, #171717) padding-box, linear-gradient(115deg, #F472B6, #EC4899 35%, #A855F7 75%, #6366F1) border-box';

export const font = {
  ui: "'Plus Jakarta Sans', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const;

export const radius = { sm: '6px', md: '8px', lg: '12px', pill: '999px' } as const;

/** Syntax colors for the .tfvars preview. */
export const syntax = {
  key: '#C4A6FF',
  block: '#CBA0FB',
  punctuation: '#55555B',
  comment: '#525252',
  string: '#9ADBB4',
  number: '#F2B672',
  gutter: '#46464C',
} as const;

/** Catégories connues, avec un style dédié. Toute autre chaîne (catégorie
 * ajoutée à la volée depuis l'éditeur) retombe sur `defaultCategoryStyle`. */
export type ResourceCategory = string;

const KNOWN_CATEGORY_STYLE: Record<string, { bg: string; fg: string; bd: string }> = {
  RG: { bg: '#1F1F1F', fg: '#A3A3A3', bd: '#333333' },
  Storage: { bg: 'rgba(96,165,250,0.11)', fg: '#7EB6F5', bd: '#26436E' },
  'NSG/ASG': { bg: 'rgba(77,212,196,0.10)', fg: '#4DD4C4', bd: '#1F4C4A' },
  'VM Windows': { bg: 'rgba(129,140,248,0.12)', fg: '#93A8FF', bd: '#33357A' },
  'VM Linux': { bg: 'rgba(168,85,247,0.11)', fg: '#CBA0FB', bd: '#5A2D80' },
  ILB: { bg: 'rgba(244,114,182,0.11)', fg: '#F49CC4', bd: '#6B2B4A' },
};

export const defaultCategoryStyle = { bg: '#1F1F1F', fg: '#A3A3A3', bd: '#333333' };

/** Style d'un badge de catégorie, avec repli neutre pour les catégories inconnues. */
export function getCategoryStyle(category: string): { bg: string; fg: string; bd: string } {
  return KNOWN_CATEGORY_STYLE[category] ?? defaultCategoryStyle;
}
