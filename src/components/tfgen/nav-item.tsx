"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Sidebar item — v2.
 * Active state is a filled chip (no gradient outline) plus an optional count.
 */
export function NavItem({
  active,
  icon,
  count,
  onClick,
  children,
}: {
  active?: boolean;
  icon: React.ReactNode;
  count?: string | number;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[9px] border border-transparent px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors",
        active
          ? "bg-popover text-foreground"
          : "text-muted-foreground hover:bg-card hover:text-foreground",
      )}
    >
      <span className={cn("shrink-0 [&_svg]:size-4", active ? "opacity-100" : "opacity-70")}>
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count !== undefined && count !== "" && (
        <span
          className={cn(
            "rounded-full px-1.5 py-px font-mono text-[10px] tabular-nums",
            active ? "bg-accent/12 text-[#F3C88C]" : "bg-secondary text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
