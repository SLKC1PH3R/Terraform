'use client';

import * as React from 'react';
import {
  color,
  font,
  getCategoryIcon,
  getCategoryStyle,
  syntax,
  type ResourceCategory,
} from './tokens';

/* ------------------------------------------------------------------ buttons */

type ButtonVariant = 'primary' | 'generate' | 'secondary' | 'ghost' | 'danger';

const variantStyle: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    border: `1px solid ${color.primaryBorder}`,
    background: color.primaryTint,
    color: color.primarySoft,
  },
  generate: {
    border: `1px solid ${color.generateBorder}`,
    background: color.generateTint,
    color: color.generateSoft,
  },
  secondary: {
    border: `1px solid ${color.borderStrong}`,
    background: 'transparent',
    color: color.textSecondary,
  },
  ghost: { border: '1px solid transparent', background: 'transparent', color: color.generate },
  danger: {
    border: `1px solid ${color.dangerBorder}`,
    background: color.dangerTint,
    color: color.dangerSoft,
  },
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
}

export function Button({
  variant = 'secondary',
  size = 'md',
  style,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      style={{
        font: 'inherit',
        fontFamily: font.ui,
        fontWeight: 500,
        fontSize: size === 'sm' ? 12 : 13,
        padding: size === 'sm' ? '5px 10px' : '8px 14px',
        borderRadius: 8,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        ...variantStyle[variant],
        ...style,
      }}
    />
  );
}

/* -------------------------------------------------------------------- icons */

export function CategoryIcon({
  category,
  size = 16,
}: {
  category: ResourceCategory;
  size?: number;
}) {
  return (
    <svg viewBox="0 0 256 256" width={size} height={size} fill="currentColor" style={{ flex: `0 0 ${size}px` }}>
      <path d={getCategoryIcon(category)} />
    </svg>
  );
}

/** The tinted rounded tile used in front of a template name. */
export function CategoryTile({
  category,
  size = 34,
}: {
  category: ResourceCategory;
  size?: number;
}) {
  const c = getCategoryStyle(category);
  return (
    <span
      style={{
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        borderRadius: size > 30 ? 9 : 8,
        display: 'grid',
        placeItems: 'center',
        background: c.bg,
        border: `1px solid ${c.bd}`,
        color: c.fg,
      }}
    >
      <CategoryIcon category={category} size={Math.round(size * 0.53)} />
    </span>
  );
}

/* ------------------------------------------------------------------- badges */

export function CategoryBadge({
  category,
  size = 'md',
}: {
  category: ResourceCategory;
  size?: 'sm' | 'md';
}) {
  const c = getCategoryStyle(category);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: size === 'sm' ? 10.5 : 11,
        letterSpacing: '0.04em',
        padding: size === 'sm' ? '2px 8px 2px 6px' : '4px 9px 4px 7px',
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.bd}`,
      }}
    >
      <CategoryIcon category={category} size={size === 'sm' ? 12 : 13} />
      {category}
    </span>
  );
}

export type StatusTone = 'ok' | 'warn' | 'error' | 'neutral';

const statusTone: Record<StatusTone, { bg: string; fg: string }> = {
  ok: { bg: 'rgba(52,211,153,0.10)', fg: color.diffSoft },
  warn: { bg: color.warnTint, fg: color.warn },
  error: { bg: color.dangerTint, fg: color.dangerSoft },
  neutral: { bg: color.surfaceRaised, fg: color.textDim },
};

export function StatusPill({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  const t = statusTone[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        padding: '3px 9px',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
      {children}
    </span>
  );
}

/* ------------------------------------------------------------ template card */

export interface TemplateSummary {
  id: string;
  category: ResourceCategory;
  description: string;
  variableCount: number;
  updatedAt: string;
  version: string;
  disabled?: boolean;
}

export function TemplateCard({
  template,
  selected,
  onEdit,
  onGenerate,
}: {
  template: TemplateSummary;
  selected?: boolean;
  onEdit?: () => void;
  onGenerate?: () => void;
}) {
  return (
    <div
      style={{
        padding: '15px 16px 13px',
        borderRadius: 12,
        background: selected ? color.surfaceHover : color.surface,
        boxShadow: selected
          ? `0 0 0 1px ${color.generate}, 0 8px 24px rgba(0,0,0,0.5)`
          : `0 0 0 1px ${color.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 11,
        opacity: template.disabled ? 0.6 : 1,
        fontFamily: font.ui,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CategoryBadge category={template.category} size="sm" />
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: font.mono,
            fontSize: 10.5,
            color: color.textDim,
          }}
        >
          {template.version}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
        <CategoryTile category={template.category} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div style={{ fontFamily: font.mono, fontSize: 14, color: color.generateSoft }}>
          {template.id}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: color.textMuted,
            lineHeight: 1.5,
            textWrap: 'pretty',
          }}
        >
          {template.description}
        </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          paddingTop: 10,
          borderTop: `1px solid ${color.border}`,
        }}
      >
        <span style={{ fontFamily: font.mono, fontSize: 11, color: color.textDim }}>
          {template.variableCount} vars
        </span>
        <span style={{ fontSize: 11, color: color.textFaint }}>·</span>
        <span style={{ fontSize: 11, color: color.textDim }}>{template.updatedAt}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Button size="sm" onClick={onEdit} disabled={template.disabled}>
            Éditer
          </Button>
          {!template.disabled && (
            <Button size="sm" variant="generate" onClick={onGenerate}>
              Générer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------- grouped variable rows */

export type VariableState = 'modified' | 'default' | 'missing';

export interface VariableRowData {
  name: string;
  type: string;
  defaultValue: string;
  finalValue: string;
  state: VariableState;
}

export interface VariableSectionData {
  id: string;
  title: string;
  category: ResourceCategory;
  rows: VariableRowData[];
}

const GRID = '1.5fr 1.1fr 1.3fr 0.6fr';

const rowTone: Record<VariableState, { bar: string; bg: string; inputBd: string; inputFg: string; label: string; labelFg: string }> = {
  modified: {
    bar: color.diff,
    bg: color.diffRow,
    inputBd: color.diffBorder,
    inputFg: color.diffText,
    label: 'modifiée',
    labelFg: color.diffSoft,
  },
  default: {
    bar: 'transparent',
    bg: 'transparent',
    inputBd: color.borderStrong,
    inputFg: color.textMuted,
    label: 'défaut',
    labelFg: color.textDim,
  },
  missing: {
    bar: color.danger,
    bg: 'rgba(239,68,68,0.07)',
    inputBd: color.dangerBorder,
    inputFg: color.dangerSoft,
    label: 'manquante',
    labelFg: color.dangerSoft,
  },
};

export function VariableRow({
  row,
  onChange,
}: {
  row: VariableRowData;
  onChange?: (value: string) => void;
}) {
  const t = rowTone[row.state];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: GRID,
        gap: 12,
        alignItems: 'center',
        padding: '8px 14px',
        borderBottom: `1px solid ${color.border}`,
        borderLeft: `2px solid ${t.bar}`,
        background: t.bg,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 12.5,
            color: color.textSecondary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.name}
        </span>
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 10,
            color: color.textDim,
            border: `1px solid ${color.borderStrong}`,
            borderRadius: 4,
            padding: '1px 5px',
            flex: '0 0 auto',
          }}
        >
          {row.type}
        </span>
      </div>
      <div
        style={{
          fontFamily: font.mono,
          fontSize: 12,
          color: color.textDim,
          textDecoration: row.state === 'modified' ? 'line-through' : undefined,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {row.defaultValue || '—'}
      </div>
      <input
        value={row.finalValue}
        placeholder={row.state === 'missing' ? 'valeur requise' : undefined}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: font.mono,
          fontSize: 12,
          padding: '5px 8px',
          borderRadius: 6,
          border: `1px solid ${t.inputBd}`,
          background: color.code,
          color: t.inputFg,
          outline: 'none',
        }}
      />
      <span style={{ fontFamily: font.mono, fontSize: 10.5, color: t.labelFg }}>{t.label}</span>
    </div>
  );
}

export function VariableSection({
  section,
  open,
  onToggle,
  onRowChange,
}: {
  section: VariableSectionData;
  open: boolean;
  onToggle: () => void;
  onRowChange?: (rowIndex: number, value: string) => void;
}) {
  const modified = section.rows.filter((r) => r.state === 'modified').length;
  const c = getCategoryStyle(section.category);
  return (
    <div
      style={{
        borderRadius: 12,
        background: color.surface,
        boxShadow: `0 0 0 1px ${color.border}`,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          textAlign: 'left',
          font: 'inherit',
          fontFamily: font.ui,
          cursor: 'pointer',
          border: 0,
          background: color.surfaceRaised,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: color.text,
        }}
      >
        <span style={{ fontFamily: font.mono, fontSize: 11, color: color.textMuted, width: 10 }}>
          {open ? '▾' : '▸'}
        </span>
        <span style={{ color: c.fg, display: 'grid', placeItems: 'center' }}>
          <CategoryIcon category={section.category} size={15} />
        </span>
        <span style={{ fontFamily: font.mono, fontSize: 13 }}>{section.title}</span>
        <span
          style={{
            fontSize: 10.5,
            padding: '2px 7px',
            borderRadius: 999,
            background: c.bg,
            color: c.fg,
            border: `1px solid ${c.bd}`,
          }}
        >
          {section.category}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: color.textDim }}>
          {section.rows.length} variables
        </span>
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 11.5,
            color: modified ? color.diffSoft : color.textDim,
          }}
        >
          {modified ? `${modified} modifiées` : 'inchangée'}
        </span>
      </button>
      {open && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRID,
              gap: 12,
              padding: '8px 14px',
              borderBottom: `1px solid ${color.border}`,
              fontSize: 9.5,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: color.textDim,
            }}
          >
            <div>Variable</div>
            <div>Valeur par défaut</div>
            <div>Valeur finale (fiche)</div>
            <div>État</div>
          </div>
          {section.rows.map((row, i) => (
            <VariableRow
              key={i}
              row={row}
              onChange={(v) => onRowChange?.(i, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- upload zone */

export function UploadZone({
  onPick,
  hint = 'Formats .xlsx et .xlsm · 5 Mo max.',
}: {
  onPick?: (file: File) => void;
  hint?: string;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  return (
    <div
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onPick?.(file);
      }}
      style={{
        border: `1.5px dashed ${over ? color.generate : color.borderHover}`,
        borderRadius: 12,
        background: over ? color.surfaceHover : color.surface,
        padding: '34px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        textAlign: 'center',
        cursor: 'pointer',
        fontFamily: font.ui,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          border: `1px solid ${color.borderStrong}`,
          background: 'rgba(168,85,247,0.10)',
          display: 'grid',
          placeItems: 'center',
          fontFamily: font.mono,
          fontSize: 12,
          color: color.generate,
        }}
      >
        xlsx
      </div>
      <div style={{ fontSize: 15, color: color.text }}>Glisser une fiche Excel ici</div>
      <div style={{ fontSize: 12.5, color: color.textDim, maxWidth: 330, lineHeight: 1.5 }}>
        {hint}
      </div>
      <Button>Parcourir…</Button>
      <input
        ref={input}
        type="file"
        accept=".xlsx,.xlsm"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick?.(file);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------ tfvars viewer */

export type TfvarsLine =
  | { kind: 'blank' }
  | { kind: 'comment'; text: string }
  | { kind: 'block'; text: string; indent?: number }
  | {
      kind: 'kv';
      key: string;
      value: string;
      indent?: number;
      numeric?: boolean;
      changed?: boolean;
    };

export function TfvarsPreview({
  lines,
  fileName = 'terraform.tfvars',
  meta,
  showLineNumbers = true,
}: {
  lines: TfvarsLine[];
  fileName?: string;
  meta?: string;
  showLineNumbers?: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 12,
        background: color.code,
        boxShadow: `0 0 0 1px ${color.border}`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 14px',
          background: color.surface,
          borderBottom: `1px solid ${color.border}`,
          fontFamily: font.ui,
        }}
      >
        <span style={{ fontFamily: font.mono, fontSize: 12, color: color.textSecondary }}>
          {fileName}
        </span>
        {meta && (
          <span style={{ fontFamily: font.mono, fontSize: 10.5, color: color.textDim }}>
            {meta}
          </span>
        )}
        <span
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10.5,
            color: color.diffSoft,
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 2,
              background: 'rgba(52,211,153,0.35)',
              borderLeft: `2px solid ${color.diff}`,
            }}
          />
          valeur issue de la fiche
        </span>
      </div>
      <div
        className="tfgen-scroll"
        style={{
          padding: '10px 0',
          fontFamily: font.mono,
          fontSize: 12.5,
          lineHeight: '22px',
          overflowX: 'auto',
        }}
      >
        {lines.map((line, i) => {
          const changed = line.kind === 'kv' && line.changed;
          const indent = 'indent' in line ? line.indent ?? 0 : 0;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                background: changed ? color.diffLine : 'transparent',
                borderLeft: `2px solid ${changed ? color.diff : 'transparent'}`,
              }}
            >
              {showLineNumbers && (
                <span
                  style={{
                    flex: '0 0 46px',
                    textAlign: 'right',
                    paddingRight: 14,
                    color: syntax.gutter,
                    userSelect: 'none',
                  }}
                >
                  {i + 1}
                </span>
              )}
              <span style={{ paddingLeft: indent, whiteSpace: 'pre' }}>
                {line.kind === 'blank' && ' '}
                {line.kind === 'comment' && (
                  <span style={{ color: syntax.comment }}>{line.text}</span>
                )}
                {line.kind === 'block' && (
                  <span style={{ color: syntax.block }}>{line.text}</span>
                )}
                {line.kind === 'kv' && (
                  <>
                    <span style={{ color: syntax.key }}>{line.key}</span>
                    <span style={{ color: syntax.punctuation }}> = </span>
                    <span style={{ color: line.numeric ? syntax.number : syntax.string }}>
                      {line.value}
                    </span>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- stepper */

export interface StepDef {
  label: string;
  hint?: string;
}

export function Stepper({
  steps,
  current,
  onSelect,
}: {
  steps: StepDef[];
  current: number; // 1-based
  onSelect?: (step: number) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        borderRadius: 12,
        background: color.surface,
        boxShadow: `0 0 0 1px ${color.border}`,
        overflow: 'hidden',
      }}
    >
      {steps.map((step, idx) => {
        const n = idx + 1;
        const active = n === current;
        const done = n < current;
        const bar = active ? '#E1495A' : done ? color.borderStrong : 'transparent';
        const fg = active ? color.text : done ? color.textSecondary : color.textDim;
        return (
          <button
            key={step.label}
            type="button"
            onClick={() => onSelect?.(n)}
            style={{
              flex: 1,
              textAlign: 'left',
              font: 'inherit',
              fontFamily: font.ui,
              cursor: 'pointer',
              border: 0,
              borderBottom: `2px solid ${bar}`,
              background: active ? color.surfaceRaised : 'transparent',
              padding: '13px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 11,
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                flex: '0 0 22px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontFamily: font.mono,
                fontSize: 11,
                border: `1px solid ${bar === 'transparent' ? color.borderStrong : bar}`,
                color: fg,
              }}
            >
              {n}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, color: fg }}>{step.label}</span>
              {step.hint && (
                <span style={{ fontSize: 11, color: color.textDim }}>{step.hint}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
