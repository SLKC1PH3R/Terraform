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

function computeDiff(variables: VariableForGeneration[]): DiffEntry[] {
  return variables.map((v) => ({
    name: v.name,
    defaultValue: v.defaultValue,
    finalValue: v.finalValue,
    changed: (v.defaultValue ?? "").trim() !== (v.finalValue ?? "").trim(),
  }));
}

/**
 * Génère le contenu .tfvars "à plat" à partir des variables, sans référence.
 * Les variables partageant le même `group` (ex. Builder/Environment/Deployment
 * avec group="tags_always") sont recomposées en un unique bloc map
 * `tags_always = { Builder = "...", ... }`, à la position de la première
 * variable du groupe rencontrée.
 */
function buildFlatTfvars(variables: VariableForGeneration[]): string {
  const lines: string[] = [];
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
  }

  return lines.join("\n") + "\n";
}

/**
 * Génère le .tfvars en réutilisant le texte de référence du template
 * (`tfContent`) comme gabarit : chaque assignation `key = value` (au premier
 * niveau ou à l'intérieur d'un bloc map) dont le nom correspond à une
 * variable voit uniquement sa valeur remplacée — commentaires, lignes vides
 * et structure du fichier d'origine restent intacts. Les variables sans
 * correspondance dans le texte de référence sont ajoutées à la fin (rendu à
 * plat) pour ne rien perdre.
 */
function buildTfvarsFromReference(tfContent: string, variables: VariableForGeneration[]): string {
  const byTop = new Map<string, VariableForGeneration>();
  const byGroup = new Map<string, VariableForGeneration>();
  for (const v of variables) {
    if (v.group) byGroup.set(`${v.group}::${v.name}`, v);
    else byTop.set(v.name, v);
  }

  const usedTop = new Set<string>();
  const usedGroup = new Set<string>();

  const lines = tfContent.split(/\r?\n/);
  const out: string[] = [];
  let currentGroup: string | null = null;

  const assignPattern = /^(\s*)([a-zA-Z_][\w-]*)(\s*=\s*)(.*)$/;

  for (const line of lines) {
    if (currentGroup === null) {
      const openMatch = line.match(/^(\s*)([a-zA-Z_][\w-]*)\s*=\s*\{\s*$/);
      if (openMatch) {
        currentGroup = openMatch[2];
        out.push(line);
        continue;
      }

      const assignMatch = line.match(assignPattern);
      if (assignMatch) {
        const [, indent, key, sep] = assignMatch;
        const v = byTop.get(key);
        if (v) {
          usedTop.add(key);
          out.push(`${indent}${key}${sep}${formatValue(v.type, v.finalValue)}`);
          continue;
        }
      }
      out.push(line);
      continue;
    }

    if (/^\s*\}\s*$/.test(line)) {
      currentGroup = null;
      out.push(line);
      continue;
    }

    const assignMatch = line.match(assignPattern);
    if (assignMatch) {
      const [, indent, key, sep] = assignMatch;
      const gkey = `${currentGroup}::${key}`;
      const v = byGroup.get(gkey);
      if (v) {
        usedGroup.add(gkey);
        out.push(`${indent}${key}${sep}${formatValue(v.type, v.finalValue)}`);
        continue;
      }
    }
    out.push(line);
  }

  const leftovers = variables.filter((v) =>
    v.group ? !usedGroup.has(`${v.group}::${v.name}`) : !usedTop.has(v.name)
  );

  let content = out.join("\n");
  if (!content.endsWith("\n")) content += "\n";
  if (leftovers.length) content += "\n" + buildFlatTfvars(leftovers);

  return content;
}

/**
 * Génère le contenu .tfvars à partir des variables. Si le template a un
 * `tfContent` de référence, il est utilisé comme gabarit (commentaires et
 * structure préservés, valeurs substituées) ; sinon un rendu "à plat" est
 * généré directement depuis les variables.
 */
export function buildTfvars(
  variables: VariableForGeneration[],
  tfContent?: string | null
): { content: string; diff: DiffEntry[] } {
  const diff = computeDiff(variables);
  const content =
    tfContent && tfContent.trim()
      ? buildTfvarsFromReference(tfContent, variables)
      : buildFlatTfvars(variables);
  return { content, diff };
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

/** Code d'environnement sur une lettre, tel qu'utilisé par les variables VM
 * (ex. env = "q") — dérivé du code à 3 lettres du nom du RG (prod/ppd/qual/homl).
 * Pas de lettre définie pour sdbx. */
const ENV_TO_VM_TYPE: Record<string, string> = {
  prod: "p",
  ppd: "u",
  qual: "q",
  homl: "h",
};

/**
 * Complète les paires clé/valeur extraites de la fiche FIS d'un serveur avec
 * les alias attendus par le template VM :
 * - "Resource Group" -> vm_rg
 * - "ASG 1" -> asg1_name
 * - "Subnet 1" -> subnet1_name
 * - "V-Net" -> vnet_name
 * - vm_type, dérivé du code d'environnement à 3 lettres (déjà déduit du nom
 *   du RG par deriveRgExtractedFields, ex. "ppd" -> "u")
 * Chaque alias n'est ajouté que si la valeur source est présente.
 */
export function deriveVmExtractedFields(
  extracted: { key: string; value: string }[]
): { key: string; value: string }[] {
  const map = new Map(extracted.map((e) => [e.key, e.value]));
  const result = [...extracted];

  const alias = (sourceKey: string, targetKey: string) => {
    const value = map.get(sourceKey);
    if (value) result.push({ key: targetKey, value });
  };

  alias("resource_group", "vm_rg");
  alias("asg_1", "asg1_name");
  alias("subnet_1", "subnet1_name");
  alias("v_net", "vnet_name");

  const env = map.get("env");
  if (env && ENV_TO_VM_TYPE[env]) {
    result.push({ key: "vm_type", value: ENV_TO_VM_TYPE[env] });
  }

  return result;
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
