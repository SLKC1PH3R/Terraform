"use client";

import { cn } from "@/lib/utils";

/**
 * Sidebar item. The active state is a 1px gradient outline
 * (padding-box / border-box trick) over the page ground.
 */
export function NavItem({
  active,
  icon,
  onClick,
  children,
}: {
  active?: boolean;
  icon: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left text-sm transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:bg-popover hover:text-foreground",
      )}
      style={
        active
          ? {
              background:
                "linear-gradient(var(--background), var(--background)) padding-box, var(--nav-active) border-box",
            }
          : undefined
      }
    >
      <span className="[&_svg]:size-4">{icon}</span>
      {children}
    </button>
  );
}
