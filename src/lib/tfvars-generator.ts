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

function buildMapString(pairs: Record<string, string | undefined>): string {
  return Object.entries(pairs)
    .filter(([, v]) => !!v)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
}

/**
 * Déduit les valeurs des variables du template RG (env, service_fullname,
 * tags_always, tags_service, tags_rg) à partir des champs déjà extraits de la
 * fiche FIS d'un serveur (le champ "Resource Group" donne env/service_fullname,
 * les balises Builder/Environment/Deployment/ROS/Service_Name/Service_ID/
 * Description alimentent les tags). Retourne null si le champ "Resource Group"
 * de la fiche n'est pas exploitable (absent ou hors convention de nommage).
 */
export function deriveRgVariablesFromServerFIS(
  extracted: { key: string; value: string }[],
  rgTemplateVariables: { name: string; type: string; defaultValue: string | null }[]
): { variables: VariableForGeneration[]; serviceFullname: string; env: string } | null {
  const map = new Map(extracted.map((e) => [e.key, e.value]));
  const rgValue = map.get("resource_group");
  if (!rgValue) return null;

  const parsed = parseResourceGroupName(rgValue);
  if (!parsed) return null;

  const derived: Record<string, string> = {
    env: parsed.env,
    service_fullname: parsed.serviceFullname,
    tags_always: buildMapString({
      Builder: map.get("builder"),
      Environment: map.get("environment"),
      Deployment: map.get("deployment"),
    }),
    tags_service: buildMapString({
      ROS: map.get("ros"),
      Service_Name: map.get("service_name"),
      Service_ID: map.get("service_id"),
    }),
    tags_rg: buildMapString({
      Description: map.get("description"),
    }),
  };

  const variables = rgTemplateVariables.map((tv) => ({
    name: tv.name,
    type: tv.type,
    defaultValue: tv.defaultValue,
    finalValue: derived[tv.name] !== undefined && derived[tv.name] !== "" ? derived[tv.name] : tv.defaultValue || "",
  }));

  return { variables, serviceFullname: parsed.serviceFullname, env: parsed.env };
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
