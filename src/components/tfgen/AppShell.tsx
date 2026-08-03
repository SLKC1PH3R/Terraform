"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NavItem } from "./nav-item";
import { Icon, ICONS } from "./icons";
import DashboardView from "./views/DashboardView";
import GenerateView from "./views/GenerateView";
import EditorView from "./views/EditorView";
import HistoryView from "./views/HistoryView";
import EditTfvarsView from "./views/EditTfvarsView";
import type { ResumeItem } from "./resume-queue";
import { ApiGeneration, ApiTemplate } from "./views/shared";

type View = "dashboard" | "generate" | "editor" | "history" | "edit-tfvars";

/**
 * v2 shell. Différences par rapport à v1 :
 *  - nav répartie en deux groupes libellés, une icône distincte par entrée
 *    et un compteur par entrée ;
 *  - indicateur de santé API + identité utilisateur ; déconnexion en bouton icône ;
 *  - le <h1> a migré dans l'AppHeader de chaque vue, qui porte le fil
 *    d'Ariane, le titre, la recherche ⌘K et les actions principales.
 */
export default function AppShell() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialView = (searchParams.get("view") as View) || "dashboard";
  const initialTemplate = searchParams.get("template") || undefined;

  const [view, setView] = React.useState<View>(initialView);
  const [generateTemplateId, setGenerateTemplateId] = React.useState<string | undefined>(
    initialView === "generate" ? initialTemplate : undefined,
  );
  const [editTemplateId, setEditTemplateId] = React.useState<string | undefined>(
    initialView === "editor" ? initialTemplate : undefined,
  );

  const [templates, setTemplates] = React.useState<ApiTemplate[]>([]);
  const [generations, setGenerations] = React.useState<ApiGeneration[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refetchAll = React.useCallback(async () => {
    const [t, g] = await Promise.all([
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/generations").then((r) => r.json()),
    ]);
    setTemplates(t);
    setGenerations(g);
  }, []);

  React.useEffect(() => {
    refetchAll().finally(() => setLoading(false));
  }, [refetchAll]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleDelete(generation: ApiGeneration) {
    if (
      !confirm(
        `Supprimer « ${generation.fileName} » et le .tfvars généré ? Cette action est irréversible.`,
      )
    )
      return;
    await fetch(`/api/generate/${generation.id}`, { method: "DELETE" });
    refetchAll();
  }

  /** Générations non finalisées / bloquées. À remplacer par un vrai état de brouillon. */
  const resumeItems: ResumeItem[] = React.useMemo(
    () =>
      generations
        .filter((g) => !g.hasSourceFile)
        .slice(0, 3)
        .map((g) => ({
          id: g.id,
          fileName: g.fileName,
          category: g.template.category,
          detail: "Fiche source absente — réimporter pour rejouer la génération",
          blocked: true,
          action: "Corriger",
        })),
    [generations],
  );

  const NAV_GROUPS: { label: string; items: { view: View; label: string; icon: string; count?: string }[] }[] = [
    {
      label: "Pilotage",
      items: [
        { view: "dashboard", label: "Tableau de bord", icon: ICONS.dashboard },
        {
          view: "generate",
          label: "Génération",
          icon: ICONS.wand,
          count: resumeItems.length ? String(resumeItems.length) : undefined,
        },
        {
          view: "history",
          label: "Historique",
          icon: ICONS.clock,
          count: generations.length ? String(generations.length) : undefined,
        },
      ],
    },
    {
      label: "Bibliothèque",
      items: [
        {
          view: "editor",
          label: "Éditeur de template",
          icon: ICONS.pencil,
          count: templates.length ? String(templates.length) : undefined,
        },
        { view: "edit-tfvars", label: "Éditeur tfvars", icon: ICONS.brackets },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen bg-background text-[14px] tracking-[-0.003em] text-foreground">
      <aside className="sticky top-0 flex h-screen w-61 shrink-0 flex-col gap-5.5 self-start bg-transparent p-3">
        <div className="flex items-center gap-2.5 px-1.5 pt-0.5">
          <div className="grid size-[30px] shrink-0 place-items-center rounded-[9px] border border-[#5C4420] bg-gradient-to-br from-accent/16 to-[#A8443C]/10 font-mono text-xs font-medium text-accent">
            tf
          </div>
          <div className="flex min-w-0 flex-col gap-px">
            <div className="text-[15px] font-semibold tracking-[-0.015em]">TFGen</div>
            <div className="font-mono text-[9.5px] text-muted-foreground">digitalstack.cloud</div>
          </div>
        </div>

        <nav className="flex flex-col gap-4.5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              <div className="px-2 pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.label}
              </div>
              {group.items.map((item) => (
                <NavItem
                  key={item.view}
                  active={view === item.view}
                  icon={<Icon path={item.icon} />}
                  count={item.count}
                  onClick={() => setView(item.view)}
                >
                  {item.label}
                </NavItem>
              ))}
            </div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2.5">
          <div className="flex items-center gap-2 rounded-[10px] border border-secondary bg-card px-2.5 py-2">
            <span className="size-2 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px_rgba(95,208,138,0.14)]" />
            <div className="flex min-w-0 flex-col gap-px">
              <span className="text-[11.5px] text-secondary-foreground">API opérationnelle</span>
              <span className="font-mono text-[9.5px] text-muted-foreground">prisma · xlsx</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 border-t border-secondary pt-2.5">
            <span className="grid size-[26px] shrink-0 place-items-center rounded-full border border-[#5C4420] bg-accent/13 text-[10.5px] font-semibold text-accent">
              ML
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs text-secondary-foreground">m.leroy</span>
              <span className="text-[10px] text-muted-foreground">Infra Azure</span>
            </div>
            <button
              type="button"
              title="Se déconnecter"
              onClick={handleLogout}
              className="ml-auto grid size-[26px] shrink-0 place-items-center rounded-[7px] border border-border bg-transparent text-muted-foreground transition-colors hover:border-[#54302A] hover:text-destructive"
            >
              <Icon path={ICONS.signOut} size={14} />
            </button>
          </div>
        </div>
      </aside>

      <main className="m-2.5 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-[#121110]">
        {view === "dashboard" && (
          <DashboardView
            templates={templates}
            generations={generations}
            loading={loading}
            resumeItems={resumeItems}
            onEdit={(id) => {
              setEditTemplateId(id);
              setView("editor");
            }}
            onGenerate={(id) => {
              setGenerateTemplateId(id);
              setView("generate");
            }}
            onNewTemplate={() => {
              setEditTemplateId(undefined);
              setView("editor");
            }}
            onNewGeneration={() => {
              setGenerateTemplateId(undefined);
              setView("generate");
            }}
            onResume={() => setView("generate")}
            onOpenHistory={() => setView("history")}
            onDelete={handleDelete}
          />
        )}

        {view !== "dashboard" && (
          <div className="tfgen-scroll min-h-0 flex-1 overflow-y-auto">
            <div className="max-w-[1180px] px-5.5 pb-14 pt-6">
              {view === "generate" && (
                <GenerateView
                  key={generateTemplateId || "none"}
                  templates={templates}
                  initialTemplateId={generateTemplateId}
                  onGenerated={refetchAll}
                />
              )}

              {view === "editor" && (
                <EditorView
                  key={editTemplateId || "new"}
                  templates={templates}
                  initialTemplateId={editTemplateId}
                  onSaved={() => {
                    refetchAll();
                    setView("dashboard");
                  }}
                />
              )}

              {view === "history" && (
                <HistoryView generations={generations} loading={loading} onDeleted={refetchAll} />
              )}

              {view === "edit-tfvars" && (
                <EditTfvarsView generations={generations} onSaved={refetchAll} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
