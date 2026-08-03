import { cn } from "@/lib/utils";

export type StatusTone = "ok" | "warn" | "error" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  ok: "bg-diff/10 text-diff-foreground",
  warn: "bg-[#F59E0B]/10 text-[#E0C79A]",
  error: "bg-destructive/10 text-destructive",
  neutral: "bg-secondary text-muted-foreground",
};

export function StatusPill({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]",
        toneClasses[tone],
      )}
    >
      <span className="size-[5px] rounded-full bg-current" />
      {children}
    </span>
  );
}
