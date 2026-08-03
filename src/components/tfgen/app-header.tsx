"use client";

import * as React from "react";
import { Icon, ICONS } from "./icons";
import { cn } from "@/lib/utils";

/**
 * v2 header: breadcrumb + screen title (replaces the in-content <h1>),
 * a ⌘K search field and the screen's primary actions.
 */
export function AppHeader({
  breadcrumb,
  title,
  onSearch,
  actions,
}: {
  breadcrumb: string[];
  title: string;
  onSearch?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex shrink-0 items-center gap-3.5 border-b border-secondary px-5.5 py-3">
      <div className="flex shrink-0 flex-col gap-0.5">
        <div className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[10.5px] text-muted-foreground">
          <span>tfgen</span>
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={crumb}>
              <span className="text-[#45403A]">/</span>
              <span className={i === breadcrumb.length - 1 ? "text-muted-foreground" : undefined}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
        <h1 className="m-0 truncate text-[17px] font-semibold tracking-[-0.02em]">{title}</h1>
      </div>

      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-8 min-w-[88px] max-w-[320px] flex-1 items-center gap-2 rounded-[9px] border border-border bg-code px-2.5 text-muted-foreground transition-colors hover:border-[#38342E]"
        >
          <Icon path={ICONS.search} size={14} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left text-[12.5px]">
            Rechercher un template, une fiche…
          </span>
          <span className="shrink-0 rounded-[5px] border border-border px-1.5 py-px font-mono text-[10px]">
            ⌘K
          </span>
        </button>
        {actions}
      </div>
    </header>
  );
}

/** Header action button — `tone` picks the semantic role. */
export function HeaderAction({
  tone = "secondary",
  icon,
  onClick,
  children,
}: {
  tone?: "primary" | "secondary";
  icon?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] border px-3 text-[12.5px] transition-colors",
        tone === "primary"
          ? "border-primary/42 bg-primary/11 font-semibold text-[#9BE3B8] hover:border-primary hover:bg-primary/20"
          : "border-border bg-transparent font-medium text-secondary-foreground hover:border-[#38342E] hover:bg-card",
      )}
    >
      {icon && <Icon path={icon} size={14} />}
      {children}
    </button>
  );
}
