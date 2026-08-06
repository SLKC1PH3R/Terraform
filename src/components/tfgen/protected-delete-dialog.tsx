"use client";

import * as React from "react";
import { Icon, ICONS } from "./icons";
import { PROTECTED_TEMPLATE_MESSAGE } from "./views/shared";

/**
 * Pop-up affiché lorsqu'on tente de supprimer un template protégé
 * (Model-Ressource). Le texte est celui demandé explicitement — ne pas
 * reformuler. La suppression reste possible (bouton "Supprimer quand même")
 * pour ne pas bloquer un usage légitime, mais force à lire l'avertissement.
 */
export function ProtectedDeleteDialog({
  templateName,
  onCancel,
  onConfirm,
}: {
  templateName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        className="flex w-full max-w-[440px] flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[#5C4420] bg-accent/13 text-accent">
            <Icon path={ICONS.lock} size={17} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="font-mono text-[13px] text-foreground">{templateName}</span>
            <span className="text-[11.5px] text-muted-foreground">Template protégé</span>
          </div>
        </div>

        <p className="whitespace-pre-line text-pretty text-[13px] leading-[1.6] text-secondary-foreground">
          {PROTECTED_TEMPLATE_MESSAGE}
        </p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border bg-transparent px-3 py-1.5 text-[12.5px] font-medium text-secondary-foreground transition-colors hover:border-[#38342E] hover:bg-secondary"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg border border-[#54302A] bg-destructive/12 px-3 py-1.5 text-[12.5px] font-semibold text-destructive transition-colors hover:bg-destructive/20"
          >
            Supprimer quand même
          </button>
        </div>
      </div>
    </div>
  );
}
