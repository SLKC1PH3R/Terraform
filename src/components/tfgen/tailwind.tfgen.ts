/**
 * Merge into your tailwind.config.ts:
 *
 *   import { tfgenTheme } from './src/components/tfgen/tailwind.tfgen'
 *   export default { theme: { extend: tfgenTheme }, ... }
 */
export const tfgenTheme = {
  colors: {
    ink: {
      950: '#09090B',
      900: '#171717',
      850: '#1F1F1F',
      800: '#262626',
      700: '#333333',
      600: '#404040',
      500: '#525252',
    },
    fg: {
      DEFAULT: '#FAFAFA',
      secondary: '#E5E5E5',
      muted: '#A3A3A3',
      dim: '#737373',
      faint: '#525252',
    },
    primary: { DEFAULT: '#34D399', soft: '#6EE7B7', line: '#256B52' },
    generate: { DEFAULT: '#A855F7', soft: '#D8B9FF', line: '#4A2A6B' },
    diff: { DEFAULT: '#34D399', soft: '#6EE7B7', text: '#A7F3D0', line: '#1D4F42' },
    danger: { DEFAULT: '#EF4444', soft: '#F87171', line: '#5C2A2E' },
    warn: { DEFAULT: '#F59E0B', soft: '#E0C79A', line: '#4A3A1E' },
    cat: {
      storage: '#7EB6F5',
      nsg: '#4DD4C4',
      vmwin: '#93A8FF',
      vmlin: '#CBA0FB',
      ilb: '#F49CC4',
    },
  },
  fontFamily: {
    sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
  },
  borderRadius: { card: '12px', control: '8px' },
} as const;
