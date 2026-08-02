/**
 * TFGen design tokens — palette graphite chaud.
 * Single source of truth: mirror these into tailwind.config.ts (see tailwind.tfgen.ts).
 */

export const color = {
  // grounds
  bg: '#0D0C0A', // page
  surface: '#1A1815', // cards, sidebar
  surfaceRaised: '#221F1B', // section headers
  surfaceHover: '#2A2723',
  code: '#100E0C', // editor / input grounds
  border: '#2A2723',
  borderStrong: '#38342E',
  borderHover: '#45403A',

  // text
  text: '#F5F2ED',
  textSecondary: '#DED8CF',
  textMuted: '#A8A199',
  textDim: '#7A736A',
  textFaint: '#6A635A',

  // roles
  primary: '#5FD08A', // main actions (Terramate primary)
  primarySoft: '#9BE3B8',
  primaryBorder: '#2A5C3E',
  primaryTint: 'rgba(95,208,138,0.10)',
  primaryTintHover: 'rgba(95,208,138,0.18)',

  generate: '#E9A23B', // templates / .tfvars generation
  generateSoft: '#F3C88C',
  generateBorder: '#5C4420',
  generateTint: 'rgba(233,162,59,0.13)',
  generateTintHover: 'rgba(233,162,59,0.22)',

  diff: '#5FD08A', // "valeur modifiée"
  diffSoft: '#9BE3B8',
  diffText: '#B6EBCB',
  diffBorder: '#2A5C3E',
  diffRow: 'rgba(95,208,138,0.08)',
  diffLine: 'rgba(95,208,138,0.11)',

  danger: '#EF4444',
  dangerSoft: '#F87171',
  dangerBorder: '#54302A',
  dangerTint: 'rgba(239,68,68,0.10)',

  warn: '#F59E0B',
  warnText: '#E0C79A',
  warnBorder: '#4A3A1E',
  warnTint: 'rgba(245,158,11,0.08)',
} as const;

/** 1px gradient outline used on the active sidebar item. */
export const activeNavGradient =
  'linear-gradient(#1A1815, #1A1815) padding-box, linear-gradient(115deg, #F472B6, #EC4899 35%, #E9A23B 75%, #6366F1) border-box';

export const font = {
  ui: "var(--font-ui), 'Manrope', system-ui, sans-serif",
  mono: "var(--font-mono), 'Roboto Mono', ui-monospace, monospace",
} as const;

export const radius = { sm: '6px', md: '8px', lg: '12px', pill: '999px' } as const;

/** Syntax colors for the .tfvars preview. */
export const syntax = {
  key: '#E5B378',
  block: '#EFC079',
  punctuation: '#5E584F',
  comment: '#6A635A',
  string: '#A6E0BF',
  number: '#F2B672',
  gutter: '#4B463F',
} as const;

/** Catégories connues, avec un style dédié. Toute autre chaîne (catégorie
 * ajoutée à la volée depuis l'éditeur) retombe sur `defaultCategoryStyle` /
 * `defaultCategoryIcon`. */
export type ResourceCategory = string;

const KNOWN_CATEGORY_STYLE: Record<string, { bg: string; fg: string; bd: string }> = {
  RG: { bg: '#221F1B', fg: '#A8A199', bd: '#38342E' },
  Storage: { bg: 'rgba(96,165,250,0.11)', fg: '#7EB6F5', bd: '#26436E' },
  'NSG/ASG': { bg: 'rgba(77,212,196,0.10)', fg: '#4DD4C4', bd: '#1F4C4A' },
  'VM Windows': { bg: 'rgba(129,140,248,0.12)', fg: '#93A8FF', bd: '#33357A' },
  'VM Linux': { bg: 'rgba(168,85,247,0.11)', fg: '#CBA0FB', bd: '#5A2D80' },
  ILB: { bg: 'rgba(244,114,182,0.11)', fg: '#F49CC4', bd: '#6B2B4A' },
  KV: { bg: 'rgba(233,162,59,0.10)', fg: '#E8B865', bd: '#5B4420' },
};

export const defaultCategoryStyle = { bg: '#221F1B', fg: '#A8A199', bd: '#38342E' };

/** Style d'un badge de catégorie, avec repli neutre pour les catégories inconnues. */
export function getCategoryStyle(category: string): { bg: string; fg: string; bd: string } {
  return KNOWN_CATEGORY_STYLE[category] ?? defaultCategoryStyle;
}

/** Glyphes Phosphor (path `viewBox="0 0 256 256"`) par catégorie connue. */
const KNOWN_CATEGORY_ICON: Record<string, string> = {
  RG: 'M216,72H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.4,15.4,0,0,0,39.38,216H216.89A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72ZM40,56H92.69l16,16H40Zm176,144H40V88H216Z',
  Storage: 'M128,24C74.17,24,32,48.6,32,80v96c0,31.4,42.17,56,96,56s96-24.6,96-56V80C224,48.6,181.83,24,128,24Zm80,104c0,9.62-7.88,19.43-21.61,26.92C170.93,163.35,150.19,168,128,168s-42.93-4.65-58.39-13.08C55.88,147.43,48,137.62,48,128V111.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64ZM69.61,53.08C85.07,44.65,105.81,40,128,40s42.93,4.65,58.39,13.08C200.12,60.57,208,70.38,208,80s-7.88,19.43-21.61,26.92C170.93,115.35,150.19,120,128,120s-42.93-4.65-58.39-13.08C55.88,99.43,48,89.62,48,80S55.88,60.57,69.61,53.08ZM186.39,202.92C170.93,211.35,150.19,216,128,216s-42.93-4.65-58.39-13.08C55.88,195.43,48,185.62,48,176V159.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64V176C208,185.62,200.12,195.43,186.39,202.92Z',
  'NSG/ASG': 'M208,40H48A16,16,0,0,0,32,56v58.78c0,89.61,75.82,119.34,91,124.39a15.53,15.53,0,0,0,10,0c15.2-5.05,91-34.78,91-124.39V56A16,16,0,0,0,208,40Zm0,74.79c0,78.42-66.35,104.62-80,109.18-13.53-4.51-80-30.69-80-109.18V56H208Z',
  'VM Windows': 'M208,40H48A24,24,0,0,0,24,64V176a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V64A24,24,0,0,0,208,40Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8ZM176,224a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,224Z',
  'VM Linux': 'M117.31,134,68.24,177.09a8,8,0,1,1-10.54-12l40.2-35.3-40.2-35.29a8,8,0,1,1,10.54-12l49.07,43.09a8,8,0,0,1,0,12.42ZM208,176H128a8,8,0,0,0,0,16h80a8,8,0,0,0,0-16Z',
  ILB: 'M240,128a8,8,0,0,1-8,8H211.13l-5.14,20.57A16,16,0,0,1,190.47,168H172.6l-4.6,18.4A16,16,0,0,1,152.49,198H136v10a8,8,0,0,1-16,0V198H103.51A16,16,0,0,1,88,186.4L83.4,168H65.53a16,16,0,0,1-15.52-11.43L44.87,136H24a8,8,0,0,1,0-16H44.87l5.14-20.57A16,16,0,0,1,65.53,88H83.4L88,69.6A16,16,0,0,1,103.51,58H120V48a8,8,0,0,1,16,0V58h16.49A16,16,0,0,1,168,69.6L172.6,88h17.87A16,16,0,0,1,206,99.43L211.13,120H232A8,8,0,0,1,240,128Zm-49.53,24,6-24-6-24H172.6l-4.6-18.4L152.49,74h-49L88.4,88.4,83.4,104H65.53l-6,24,6,24H83.4l5,18.4L103.51,182h49l15.49-11.6,4.6-18.4Z',
  KV: 'M216.57,39.43a32,32,0,0,0-45.26,0L102.4,108.34A56,56,0,1,0,147.66,153.6l14.34-14.35,16,16a8,8,0,0,0,11.32-11.31l-16-16,20.68-20.69,16,16a8,8,0,0,0,11.32-11.31l-16-16,11.25-11.25A32,32,0,0,0,216.57,39.43Zm-11.31,33.94-11.32,11.32L182.63,73.37,193.94,62.06a8,8,0,0,1,11.32,11.31ZM136.34,142.29l-20,20a8,8,0,0,1-11.32-11.32l20-20a8,8,0,0,0-11.32-11.31l-20,20a24,24,0,0,0,33.95,33.94l20-20A40,40,0,1,1,136.34,142.29Z',
};

/** Glyphe générique (boîte) utilisé pour toute catégorie sans icône dédiée
 * (ex. catégorie ajoutée à la volée depuis l'éditeur de templates). */
export const defaultCategoryIcon =
  'M223.68,66.15,135.68,18.15a15.88,15.88,0,0,0-15.36,0l-88,48A16,16,0,0,0,24,80.18v95.64a16,16,0,0,0,8.32,14l88,48.05a15.82,15.82,0,0,0,15.36,0l88-48.05a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32l80.34,44-29.77,16.3-80.35-44ZM128,120,47.66,76l33.9-18.56,80.34,44ZM40,90.79l80,43.63v85.58l-80-43.7Zm96,129.21V134.42l32-17.47V152a8,8,0,0,0,16,0V108.06l32-17.47v85.6Z';

/** Icône d'une catégorie, avec repli générique pour les catégories inconnues. */
export function getCategoryIcon(category: string): string {
  return KNOWN_CATEGORY_ICON[category] ?? defaultCategoryIcon;
}
