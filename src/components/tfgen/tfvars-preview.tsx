"use client";

import { cn } from "@/lib/utils";

export type TfvarsLine =
  | { kind: "blank" }
  | { kind: "comment"; text: string }
  | { kind: "block"; text: string; indent?: number }
  | { kind: "kv"; key: string; value: string; indent?: number; numeric?: boolean; changed?: boolean };

export function TfvarsPreview({
  lines,
  fileName = "terraform.tfvars",
  meta,
  showLineNumbers = true,
}: {
  lines: TfvarsLine[];
  fileName?: string;
  meta?: string;
  showLineNumbers?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-code">
      <div className="flex items-center gap-2.5 border-b border-border bg-card px-3.5 py-2">
        <span className="font-mono text-xs text-secondary-foreground">{fileName}</span>
        {meta && <span className="font-mono text-[10.5px] text-muted-foreground">{meta}</span>}
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] text-diff-foreground">
          <span className="h-2.5 w-2.5 rounded-sm border-l-2 border-diff bg-diff/35" />
          valeur issue de la fiche
        </span>
      </div>

      <div className="tfgen-scroll overflow-x-auto py-2.5 font-mono text-[12.5px] leading-[22px]">
        {lines.map((line, i) => {
          const changed = line.kind === "kv" && line.changed;
          const indent = "indent" in line ? (line.indent ?? 0) : 0;
          return (
            <div
              key={i}
              className={cn(
                "flex items-baseline border-l-2 border-transparent",
                changed && "border-l-diff bg-diff/[0.11]",
              )}
            >
              {showLineNumbers && (
                <span className="w-[46px] shrink-0 select-none pr-3.5 text-right text-[#4B463F]">
                  {i + 1}
                </span>
              )}
              <span className="whitespace-pre" style={{ paddingLeft: indent }}>
                {line.kind === "blank" && " "}
                {line.kind === "comment" && <span className="text-[#6A635A]">{line.text}</span>}
                {line.kind === "block" && <span className="text-[#EFC079]">{line.text}</span>}
                {line.kind === "kv" && (
                  <>
                    <span className="text-[#E5B378]">{line.key}</span>
                    <span className="text-[#5E584F]"> = </span>
                    <span className={line.numeric ? "text-[#F2B672]" : "text-[#A6E0BF]"}>
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
