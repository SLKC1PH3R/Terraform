"use client";

import * as React from "react";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Icon, ICONS } from "./icons";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTENSIONS = [".xlsx", ".xlsm"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function validateFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return `Format non pris en charge (« ${file.name} ») — seuls .xlsx et .xlsm sont acceptés.`;
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `Fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(1)} Mo) — 5 Mo max.`;
  }
  return null;
}

export function UploadZone({
  onPick,
  hint = "Formats .xlsx et .xlsm · 5 Mo max.",
  className,
}: {
  onPick?: (file: File) => void;
  hint?: string;
  className?: string;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleFile(file: File) {
    const validationError = validateFile(file);
    setError(validationError);
    if (!validationError) onPick?.(file);
  }

  return (
    <div className="flex flex-col gap-2">
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
          if (file) handleFile(file);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-9 text-center transition-colors",
          error
            ? "border-destructive/60 bg-destructive/[0.05]"
            : over
              ? "border-accent bg-accent/[0.06]"
              : "border-[#45403A] bg-card",
          className,
        )}
      >
        <span className="grid size-11 place-items-center rounded-[10px] border border-border bg-accent/10 text-accent">
          <FileSpreadsheet className="size-5" />
        </span>
        <span className="text-[15px]">Glisser une fiche Excel ici</span>
        <p className="max-w-[330px] text-[12.5px] leading-relaxed text-muted-foreground">{hint}</p>
        <Button>Parcourir…</Button>
        <input
          ref={input}
          type="file"
          accept=".xlsx,.xlsm"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) handleFile(file);
          }}
        />
      </div>

      {error && (
        <div className="tfgen-shake flex items-center gap-1.5 text-[12.5px] text-destructive">
          <Icon path={ICONS.warning} size={13} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
