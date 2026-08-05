"use client";

import * as React from "react";
import { Icon, ICONS } from "./icons";
import { cn } from "@/lib/utils";

/** Bouton "Copier" générique — copie `text` dans le presse-papiers et
 * affiche une confirmation brève (icône + libellé) avant de revenir à
 * l'état initial. */
export function CopyButton({
  text,
  label = "Copier",
  copiedLabel = "Copié",
  className,
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // repli pour les contextes sans permission clipboard (ex. http non sécurisé)
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1800);
  }

  React.useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-1 text-[11px] font-medium transition-colors",
        copied
          ? "border-primary/45 bg-primary/12 text-[#9BE3B8]"
          : "border-border bg-transparent text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
        className,
      )}
    >
      <Icon path={copied ? ICONS.check : ICONS.copy} size={12} />
      {copied ? copiedLabel : label}
    </button>
  );
}
