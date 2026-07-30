"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { value: "RG", label: "Resource Group" },
  { value: "STORAGE", label: "Storage Account" },
  { value: "NSG_ASG", label: "NSG / ASG" },
  { value: "VM_WINDOWS_MARKETPLACE", label: "VM Windows (Marketplace)" },
  { value: "VM_WINDOWS_CUSTOM", label: "VM Windows (Custom)" },
  { value: "VM_LINUX", label: "VM Linux" },
];

const VAR_TYPES = ["string", "number", "bool", "list", "map"];

export interface TemplateVariableForm {
  name: string;
  type: string;
  defaultValue: string;
  description: string;
  required: boolean;
}

export interface TemplateFormData {
  id?: string;
  name: string;
  category: string;
  description: string;
  tfContent: string;
  variables: TemplateVariableForm[];
}

export default function TemplateEditor({ initial }: { initial?: TemplateFormData }) {
  const router = useRouter();
  const [form, setForm] = useState<TemplateFormData>(
    initial || {
      name: "",
      category: "RG",
      description: "",
      tfContent: "",
      variables: [],
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateVariable(index: number, patch: Partial<TemplateVariableForm>) {
    setForm((f) => {
      const variables = [...f.variables];
      variables[index] = { ...variables[index], ...patch };
      return { ...f, variables };
    });
  }

  function addVariable() {
    setForm((f) => ({
      ...f,
      variables: [
        ...f.variables,
        { name: "", type: "string", defaultValue: "", description: "", required: false },
      ],
    }));
  }

  function removeVariable(index: number) {
    setForm((f) => ({ ...f, variables: f.variables.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const url = form.id ? `/api/templates/${form.id}` : "/api/templates";
    const method = form.id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erreur lors de l'enregistrement");
    }
  }

  async function handleDelete() {
    if (!form.id) return;
    if (!confirm("Supprimer ce template ? Cette action est irréversible.")) return;
    await fetch(`/api/templates/${form.id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Nom du template</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Catégorie</label>
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <input
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Contenu .tf (référence, optionnel)</label>
          <textarea
            className="input font-mono text-xs"
            rows={8}
            value={form.tfContent}
            onChange={(e) => setForm({ ...form, tfContent: e.target.value })}
            placeholder={`resource "azurerm_resource_group" "rg" {\n  name     = var.rg_name\n  location = var.location\n}`}
          />
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            Variables ({form.variables.length})
          </h2>
          <button type="button" onClick={addVariable} className="btn-secondary text-sm">
            + Ajouter une variable
          </button>
        </div>

        {form.variables.length === 0 && (
          <p className="text-slate-500 text-sm">
            Aucune variable. Le nom de chaque variable doit correspondre à la clé
            attendue dans la fiche FIS (ex : <code>rg_name</code>, <code>location</code>).
          </p>
        )}

        <div className="space-y-3">
          {form.variables.map((v, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start bg-slate-800/50 rounded-lg p-3">
              <div className="md:col-span-3">
                <label className="label">Nom (clé)</label>
                <input
                  className="input"
                  value={v.name}
                  onChange={(e) => updateVariable(i, { name: e.target.value })}
                  placeholder="rg_name"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Type</label>
                <select
                  className="input"
                  value={v.type}
                  onChange={(e) => updateVariable(i, { type: e.target.value })}
                >
                  {VAR_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="label">Valeur par défaut</label>
                <input
                  className="input"
                  value={v.defaultValue}
                  onChange={(e) => updateVariable(i, { defaultValue: e.target.value })}
                />
              </div>
              <div className="md:col-span-3">
                <label className="label">Description</label>
                <input
                  className="input"
                  value={v.description}
                  onChange={(e) => updateVariable(i, { description: e.target.value })}
                />
              </div>
              <div className="md:col-span-1 flex items-center gap-2 pt-6">
                <label className="flex items-center gap-1 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={v.required}
                    onChange={(e) => updateVariable(i, { required: e.target.checked })}
                  />
                  requis
                </label>
              </div>
              <div className="md:col-span-12 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeVariable(i)}
                  className="text-red-400 text-xs hover:underline"
                >
                  Supprimer cette variable
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex items-center justify-between">
        <div>
          {form.id && (
            <button type="button" onClick={handleDelete} className="text-red-400 text-sm hover:underline">
              Supprimer le template
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => router.push("/")} className="btn-secondary">
            Annuler
          </button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </form>
  );
}
