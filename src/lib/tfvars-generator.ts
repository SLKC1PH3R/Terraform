export interface VariableForGeneration {
  name: string;
  type: string; // string | number | bool | list | map
  defaultValue: string | null;
  finalValue: string;
}

export interface DiffEntry {
  name: string;
  defaultValue: string | null;
  finalValue: string;
  changed: boolean;
}

function formatValue(type: string, value: string): string {
  const trimmed = value.trim();

  switch (type) {
    case "number":
      return trimmed === "" ? "null" : trimmed;
    case "bool": {
      const v = trimmed.toLowerCase();
      if (["true", "vrai", "oui", "1", "yes"].includes(v)) return "true";
      if (["false", "faux", "non", "0", "no"].includes(v)) return "false";
      return trimmed || "false";
    }
    case "list": {
      // valeurs séparées par des virgules -> ["a", "b", "c"]
      const items = trimmed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => `"${s.replace(/"/g, '\\"')}"`);
      return `[${items.join(", ")}]`;
    }
    case "map": {
      // format "cle=valeur, cle2=valeur2"
      const pairs = trimmed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((pair) => {
          const [k, ...rest] = pair.split("=");
          const v = rest.join("=").trim();
          return `    "${k.trim()}" = "${v.replace(/"/g, '\\"')}"`;
        });
      return `{\n${pairs.join("\n")}\n  }`;
    }
    default:
      return `"${trimmed.replace(/"/g, '\\"')}"`;
  }
}

export function buildTfvars(variables: VariableForGeneration[]): {
  content: string;
  diff: DiffEntry[];
} {
  const lines: string[] = [];
  const diff: DiffEntry[] = [];

  for (const v of variables) {
    const formatted = formatValue(v.type, v.finalValue);
    lines.push(`${v.name} = ${formatted}`);

    const changed =
      (v.defaultValue ?? "").trim() !== (v.finalValue ?? "").trim();

    diff.push({
      name: v.name,
      defaultValue: v.defaultValue,
      finalValue: v.finalValue,
      changed,
    });
  }

  return { content: lines.join("\n") + "\n", diff };
}

/**
 * Fait correspondre les variables extraites du fichier Excel (clé/valeur normalisée)
 * aux variables définies dans le template. Les variables du template sans
 * correspondance conservent leur valeur par défaut.
 */
export function matchVariables(
  templateVariables: {
    name: string;
    type: string;
    defaultValue: string | null;
  }[],
  extracted: { key: string; value: string }[]
): VariableForGeneration[] {
  const extractedMap = new Map(extracted.map((e) => [e.key, e.value]));

  return templateVariables.map((tv) => {
    const found = extractedMap.get(tv.name.toLowerCase());
    return {
      name: tv.name,
      type: tv.type,
      defaultValue: tv.defaultValue,
      finalValue: found !== undefined ? found : tv.defaultValue || "",
    };
  });
}
