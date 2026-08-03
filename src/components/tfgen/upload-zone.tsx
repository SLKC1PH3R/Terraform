"use client";

import * as React from "react";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      className={cn(
        "flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-9 text-center transition-colors",
        over ? "border-accent bg-accent/[0.06]" : "border-[#45403A] bg-card",
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
          if (file) onPick?.(file);
        }}
      />
    </div>
  );
}
