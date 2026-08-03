"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "./components";
import { activeNavGradient, color, font } from "./tokens";
import DashboardView from "./views/DashboardView";
import GenerateView from "./views/GenerateView";
import EditorView from "./views/EditorView";
import HistoryView from "./views/HistoryView";
import EditTfvarsView from "./views/EditTfvarsView";
import { ApiGeneration, ApiTemplate } from "./views/shared";

type View = "dashboard" | "generate" | "editor" | "history" | "edit-tfvars";

const NAV: { view: View; label: string; icon: string }[] = [
  {
    view: "dashboard",
    label: "Tableau de bord",
    icon: "M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z",
  },
  {
    view: "generate",
    label: "Génération",
    icon: "M223.85,47.42a16,16,0,0,0-15.27-15.27c-16.79-.78-46.72,2.66-70.85,26.79L128,68.68V56a16,16,0,0,0-27.32-11.31L60.69,84.68A16,16,0,0,0,56,96v12.7l-8.9,8.9a16,16,0,0,0,0,22.62l19.6,19.6a16,16,0,0,0,22.63,0l8.9-8.9H112a16,16,0,0,0,11.31-4.69l40-40A16,16,0,0,0,168,94.63l9.74-9.74C201.19,61.44,224.64,64.21,223.85,47.42ZM72,96l40-40v28.68L83.31,113.37,72,102.06Zm40,56H97.94l29.37-29.37,11.32,11.32Zm54.4-78.79L143.16,96.44,159.56,112.8,182.79,89.6c14.14-14.15,17.5-32,17.06-41.45C190.4,47.71,172.55,51.07,158.4,65.2Z",
  },
  {
    view: "editor",
    label: "Éditeur de template",
    icon: "M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z",
  },
  {
    view: "edit-tfvars",
    label: "Éditeur tfvars",
    icon: "M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z",
  },
  {
    view: "history",
    label: "Historique",
    icon: "M128,24A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z",
  },
];

export default function AppShell() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialView = (searchParams.get("view") as View) || "dashboard";
  const initialTemplate = searchParams.get("template") || undefined;

  const [view, setView] = React.useState<View>(initialView);
  const [generateTemplateId, setGenerateTemplateId] = React.useState<string | undefined>(
    initialView === "generate" ? initialTemplate : undefined
  );
  const [editTemplateId, setEditTemplateId] = React.useState<string | undefined>(
    initialView === "editor" ? initialTemplate : undefined
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

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: color.bg,
        color: color.text,
        fontFamily: font.ui,
        fontSize: 14,
      }}
    >
      <aside
        style={{
          width: 256,
          flex: "0 0 256px",
          background: "transparent",
          padding: "18px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 26,
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          height: "100vh",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${color.borderStrong}`,
              display: "grid",
              placeItems: "center",
              fontFamily: font.mono,
              fontSize: 13,
              fontWeight: 600,
              color: color.generate,
            }}
          >
            tf
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>TFGen</div>
            <div style={{ fontFamily: font.mono, fontSize: 9.5, color: color.textDim }}>
              terraform.digitalstack.cloud
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div
            style={{
              fontSize: 9.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: color.textFaint,
              padding: "0 8px 6px",
            }}
          >
            Pilotage
          </div>
          {NAV.map((item) => {
            const active = view === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => setView(item.view)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  textAlign: "left",
                  font: "inherit",
                  cursor: "pointer",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid transparent",
                  background: active ? activeNavGradient : "transparent",
                  color: active ? color.text : color.textMuted,
                }}
              >
                <svg viewBox="0 0 256 256" width={16} height={16} fill="currentColor" style={{ flex: "0 0 16px" }}>
                  <path d={item.icon} />
                </svg>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            padding: "10px 8px",
            borderTop: `1px solid ${color.border}`,
          }}
        >
          <Button size="sm" variant="secondary" onClick={handleLogout} style={{ width: "100%", justifyContent: "center" }}>
            Se déconnecter
          </Button>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          margin: "10px 10px 10px 0",
          border: `1px solid ${color.border}`,
          borderRadius: 16,
          background: "#121110",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            height: 50,
            flex: "0 0 50px",
            borderBottom: `1px solid ${color.border}`,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 26px",
          }}
        >
          <div style={{ fontFamily: font.mono, fontSize: 11.5, color: color.textDim }}>
            tfgen / <span style={{ color: color.textSecondary }}>{view}</span>
          </div>
        </header>

        <div style={{ flex: 1, padding: "26px 26px 64px", maxWidth: 1240 }}>
          {view === "dashboard" && (
            <DashboardView
              templates={templates}
              generations={generations}
              loading={loading}
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
            />
          )}

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

          {view === "edit-tfvars" && <EditTfvarsView generations={generations} onSaved={refetchAll} />}
        </div>
      </main>
    </div>
  );
}
