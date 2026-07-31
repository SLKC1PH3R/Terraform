"use client";

import { useState } from "react";
import { Button, CategoryBadge } from "../components";
import TemplateEditor, { type TemplateFormData } from "@/components/TemplateEditor";
import { ApiTemplate, formatRelative, toDesignCategory } from "./shared";

export default function EditorView({
  templates,
  initialTemplateId,
  onSaved,
}: {
  templates: ApiTemplate[];
  initialTemplateId?: string;
  onSaved?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(initialTemplateId);

  const selected = templates.find((t) => t.id === selectedId);

  const initial: TemplateFormData | undefined = selected
    ? {
        id: selected.id,
        name: selected.name,
        category: selected.category,
        description: selected.description || "",
        tfContent: selected.tfContent || "",
        variables: selected.variables.map((v) => ({
          name: v.name,
          type: v.type,
          defaultValue: v.defaultValue || "",
          description: v.description || "",
          required: v.required,
          group: v.group || "",
        })),
      }
    : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontSize: 28, margin: "0 0 6px", fontWeight: 600 }}>Éditeur de template</h1>
          <p style={{ margin: 0, fontFamily: "monospace", fontSize: 13, color: "#A3A3A3" }}>
            {selected ? selected.name : "Nouveau template"}
          </p>
        </div>
        <Button variant="primary" onClick={() => setSelectedId(undefined)}>
          + Nouveau template
        </Button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedId(t.id)}
            style={{
              flex: "0 0 auto",
              textAlign: "left",
              font: "inherit",
              cursor: "pointer",
              padding: "8px 12px",
              borderRadius: 10,
              background: "#171717",
              border: `1px solid ${t.id === selectedId ? "#A855F7" : "#262626"}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#FAFAFA",
            }}
          >
            <CategoryBadge category={toDesignCategory(t.category)} size="sm" />
            <span style={{ fontFamily: "monospace", fontSize: 12.5 }}>{t.name}</span>
            <span style={{ fontSize: 10.5, color: "#737373" }}>{formatRelative(t.updatedAt)}</span>
          </button>
        ))}
      </div>

      <TemplateEditor key={selectedId || "new"} initial={initial} onSaved={onSaved} onDeleted={onSaved} />
    </div>
  );
}
