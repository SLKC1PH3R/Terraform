export interface VariableForGeneration {
  name: string;
  type: string; // string | number | bool | list | map
  defaultValue: string | null;
  finalValue: string;
  group?: string | null; // si renseigné, la variable est recomposée comme sous-clé du map <group>
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
      // format "cle=valeur, cle2=valeur2" (saisie manuelle d'une variable de type map)
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

/**
 * Génère le contenu .tfvars à partir des variables. Les variables partageant
 * le même `group` (ex. Builder/Environment/Deployment avec group="tags_always")
 * sont recomposées en un unique bloc map `tags_always = { Builder = "...", ... }`,
 * à la position de la première variable du groupe rencontrée.
 */
export function buildTfvars(variables: VariableForGeneration[]): {
  content: string;
  diff: DiffEntry[];
} {
  const lines: string[] = [];
  const diff: DiffEntry[] = [];
  const renderedGroups = new Set<string>();

  for (const v of variables) {
    const group = v.group || "";

    if (group) {
      if (!renderedGroups.has(group)) {
        renderedGroups.add(group);
        const members = variables.filter((x) => (x.group || "") === group);
        const innerLines = members.map(
          (m) => `  ${m.name} = ${formatValue(m.type, m.finalValue)}`
        );
        lines.push(`${group} = {\n${innerLines.join("\n")}\n}`);
      }
    } else {
      lines.push(`${v.name} = ${formatValue(v.type, v.finalValue)}`);
    }

    const changed = (v.defaultValue ?? "").trim() !== (v.finalValue ?? "").trim();

    diff.push({
      name: v.name,
      defaultValue: v.defaultValue,
      finalValue: v.finalValue,
      changed,
    });
  }

  return { content: lines.join("\n") + "\n", diff };
}

const RG_NAME_PATTERN = /^rg-(.+)-(prod|ppd|qual|sdbx|homl)-\d+$/i;

/**
 * Découpe un nom de Resource Group Fidal (ex. "rg-azdevops-ppd-001") en
 * service_fullname ("azdevops") et env ("ppd"), tels qu'attendus par le
 * template RG. Retourne null si le nom ne suit pas la convention.
 */
export function parseResourceGroupName(
  rgName: string
): { serviceFullname: string; env: string } | null {
  const match = rgName.trim().match(RG_NAME_PATTERN);
  if (!match) return null;
  return { serviceFullname: match[1], env: match[2].toLowerCase() };
}

/**
 * Complète les paires clé/valeur extraites de la fiche FIS d'un serveur avec
 * "env" et "service_fullname", déduits du champ "Resource Group" (ex.
 * "rg-azdevops-ppd-001" -> env=ppd, service_fullname=azdevops). Les autres
 * variables du template RG (Builder, Environment, Deployment, ROS,
 * Service_Name, Service_ID, Description) matchent directement les balises de
 * la fiche FIS, qui les expose déjà à plat sous ces mêmes noms. Retourne null
 * si le champ "Resource Group" est absent ou hors convention de nommage.
 */
export function deriveRgExtractedFields(
  extracted: { key: string; value: string }[]
): { extracted: { key: string; value: string }[]; serviceFullname: string; env: string } | null {
  const map = new Map(extracted.map((e) => [e.key, e.value]));
  const rgValue = map.get("resource_group");
  if (!rgValue) return null;

  const parsed = parseResourceGroupName(rgValue);
  if (!parsed) return null;

  return {
    extracted: [
      ...extracted,
      { key: "env", value: parsed.env },
      { key: "service_fullname", value: parsed.serviceFullname },
    ],
    serviceFullname: parsed.serviceFullname,
    env: parsed.env,
  };
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
    group?: string | null;
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
      group: tv.group || "",
    };
  });
}
