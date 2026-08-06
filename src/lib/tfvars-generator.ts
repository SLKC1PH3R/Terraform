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

/** Découpe une chaîne sur les virgules de premier niveau uniquement (ignore
 * celles à l'intérieur de guillemets ou de blocs {...}/[...] imbriqués). */
function splitTopLevel(s: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let inQuotes = false;
  let current = "";

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' && s[i - 1] !== "\\") inQuotes = !inQuotes;
    if (!inQuotes) {
      if (ch === "{" || ch === "[") depth++;
      if (ch === "}" || ch === "]") depth--;
    }
    if (ch === "," && depth === 0 && !inQuotes) {
      items.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) items.push(current.trim());

  return items;
}

/** Formate un élément de liste : laisse tel quel ce qui ressemble déjà à un
 * littéral HCL (chaîne entre guillemets, objet, liste, nombre, booléen),
 * sinon encadre la valeur brute de guillemets. */
function formatListItem(item: string): string {
  const t = item.trim();
  if (!t) return t;
  if (t.startsWith('"') || t.startsWith("{") || t.startsWith("[")) return t;
  if (/^(true|false)$/i.test(t)) return t.toLowerCase();
  if (/^-?\d+(\.\d+)?$/.test(t)) return t;
  return `"${t.replace(/"/g, '\\"')}"`;
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
      // Certaines fiches FIS renseignent directement un littéral HCL complet
      // dans la cellule (ex. "[51.124.104.72/32, 20.56.51.3/32]" ou
      // "[{group_name = \"...\", role = \"...\"}]") plutôt qu'une simple
      // liste de valeurs séparées par des virgules. On retire les crochets
      // englobants s'ils sont présents, on découpe au niveau supérieur
      // (en ignorant les virgules à l'intérieur de guillemets/accolades/
      // crochets imbriqués), puis on ne ré-encadre de guillemets que les
      // éléments qui n'en ont pas déjà (chaîne simple) — les objets/listes
      // imbriqués et déjà entre guillemets sont laissés tels quels.
      let inner = trimmed;
      if (inner.startsWith("[") && inner.endsWith("]")) {
        inner = inner.slice(1, -1);
      }
      const items = splitTopLevel(inner).map(formatListItem);
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

/** Retire un commentaire de fin de ligne (# ...), en ignorant les '#' à
 * l'intérieur d'une chaîne entre guillemets. */
function stripInlineComment(line: string): string {
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i - 1] !== "\\") inQuotes = !inQuotes;
    if (ch === "#" && !inQuotes) return line.slice(0, i);
  }
  return line;
}

/** Profondeur nette de crochets/accolades d'une ligne (hors chaînes entre
 * guillemets), utilisée pour détecter une valeur `key = [ ... ]` ou
 * `key = { ... }` qui s'étend sur plusieurs lignes. */
function bracketDelta(s: string): number {
  let depth = 0;
  let inQuotes = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' && s[i - 1] !== "\\") inQuotes = !inQuotes;
    if (inQuotes) continue;
    if (ch === "[" || ch === "{") depth++;
    if (ch === "]" || ch === "}") depth--;
  }
  return depth;
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

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (currentGroup === null) {
      const openMatch = line.match(/^(\s*)([a-zA-Z_][\w-]*)\s*=\s*\{\s*$/);
      if (openMatch) {
        currentGroup = openMatch[2];
        out.push(line);
        i++;
        continue;
      }

      const assignMatch = line.match(assignPattern);
      if (assignMatch) {
        const [, indent, key, sep, rest] = assignMatch;

        // Valeur multi-lignes (ex. `key = [` ... `]`) : on repère la fin du
        // bloc pour soit la remplacer intégralement (si une variable
        // correspond), soit préserver les lignes d'origine telles quelles.
        let depth = bracketDelta(rest);
        let end = i;
        while (depth > 0 && end + 1 < lines.length) {
          end++;
          depth += bracketDelta(lines[end]);
        }

        const v = byTop.get(key);
        if (v) {
          usedTop.add(key);
          out.push(`${indent}${key}${sep}${formatValue(v.type, v.finalValue)}`);
        } else {
          for (let k = i; k <= end; k++) out.push(lines[k]);
        }
        i = end + 1;
        continue;
      }
      out.push(line);
      i++;
      continue;
    }

    if (/^\s*\}\s*$/.test(line)) {
      currentGroup = null;
      out.push(line);
      i++;
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
        i++;
        continue;
      }
    }
    out.push(line);
    i++;
  }

  const leftovers = variables.filter((v) =>
    v.group ? !usedGroup.has(`${v.group}::${v.name}`) : !usedTop.has(v.name)
  );

  let content = out.join("\n");
  if (!content.endsWith("\n")) content += "\n";
  if (leftovers.length) content += "\n" + buildFlatTfvars(leftovers);

  return content;
}

/** "vm1", "vm2", ... — jeton délimité (ni précédé ni suivi d'un caractère
 * alphanumérique) utilisé par les templates VM (WIN-IMAGE, WIN-Market,
 * LNX-IMG, LNX-Market) pour numéroter les variables/groupes d'une VM
 * (vm1_index, tags_vm1, tags_vm1_datadisk1, ...). */
const VM_INDEX_RE = /(?<![a-z0-9])vm(\d+)(?![a-z0-9])/i;

function vmIndexOf(v: VariableForGeneration): number | null {
  const m = (v.group || v.name).match(VM_INDEX_RE);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Regroupe les variables par index de VM (vm1, vm2, ...), les variables
 * partagées/globales (sans jeton vmN) rejoignant le groupe de la 1ère VM
 * puisque c'est sa section, active dans le template, qui les porte déjà.
 * Retourne `null` si aucune variable ne porte de jeton vmN (template non
 * concerné par la fusion multi-VM, ex. RG, Storage, Key Vault, ILB, ASG/NSG).
 */
function groupRowsByVmIndex(
  variables: VariableForGeneration[]
): Map<number, VariableForGeneration[]> | null {
  let hasAnyVmIndex = false;
  const groups = new Map<number, VariableForGeneration[]>();

  for (const v of variables) {
    const idx = vmIndexOf(v);
    if (idx !== null) hasAnyVmIndex = true;
    const bucket = idx ?? 1;
    if (!groups.has(bucket)) groups.set(bucket, []);
    groups.get(bucket)!.push(v);
  }

  return hasAnyVmIndex ? groups : null;
}

/** Repère, dans le texte d'un template, la ligne où débute le bloc
 * d'exemple commenté d'une VM suivante (bandeau `# ####...` : un "#" isolé
 * suivi d'espace(s) puis d'une longue série de "#" — signature d'un
 * bandeau de section normalement actif qui a été entièrement commenté). */
function findCommentedBannerIndex(lines: string[], fromIndex = 0): number {
  for (let i = fromIndex; i < lines.length; i++) {
    if (/^#\s+#{3,}\s*$/.test(lines[i].trim())) return i;
  }
  return -1;
}

/** Tronque un contenu généré juste avant le premier bandeau commenté
 * (`# ####...`) — c'est-à-dire le bloc d'exemple commenté d'une VM
 * suivante, laissé tel quel par `buildTfvarsFromReference` faute de
 * correspondance. Sans effet si aucun bandeau de ce type n'est trouvé. */
function truncateAtCommentedBanner(content: string): string {
  const lines = content.split(/\r?\n/);
  const idx = findCommentedBannerIndex(lines);
  if (idx === -1) return content;
  return lines.slice(0, idx).join("\n").trimEnd() + "\n";
}

/** Isole la section d'une VM donnée (index `n`) dans le texte du template :
 * du bandeau de commentaires qui la précède (ex. "Define variables for the
 * linux VM1") jusqu'à sa dernière ligne active, sans empiéter sur le bloc
 * d'exemple commenté de la VM suivante. Les blocs multi-lignes (map/list)
 * dont la clé porte le jeton vmN sont inclus en entier. Retourne `null` si
 * aucune ligne active ne porte ce jeton. */
function extractVmSection(tfContent: string, n: number): string | null {
  const lines = tfContent.split(/\r?\n/);
  const tokenRe = new RegExp(`(?<![a-z0-9])vm${n}(?![a-z0-9])`, "i");
  const assignPattern = /^\s*([a-zA-Z_][\w-]*)\s*=/;

  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(assignPattern);
    if (m && tokenRe.test(m[1])) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) return null;

  let headerStart = startIdx;
  while (headerStart > 0 && lines[headerStart - 1].trim() !== "") headerStart--;

  // Le bandeau de section (ex. "###.../ # / # Define variables for the
  // linux VM1 / # / ###...") est souvent séparé du commentaire du 1er champ
  // par une ligne vide : on l'inclut s'il précède immédiatement ainsi.
  if (headerStart > 1 && lines[headerStart - 1].trim() === "") {
    let bannerEnd = headerStart - 1;
    let bannerStart = bannerEnd;
    while (bannerStart > 0 && lines[bannerStart - 1].trim() !== "") bannerStart--;
    const looksLikeBanner = lines.slice(bannerStart, bannerEnd).some((l) => /^#{5,}\s*$/.test(l.trim()));
    if (looksLikeBanner) headerStart = bannerStart;
  }

  let endIdx = startIdx;
  let i = startIdx;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (/^#\s+#{3,}\s*$/.test(trimmed)) break; // bandeau commenté = bloc d'exemple suivant

    const m = lines[i].match(assignPattern);
    if (m) {
      let depth = bracketDelta(stripInlineComment(lines[i]).slice(lines[i].indexOf("=") + 1));
      let j = i;
      while (depth > 0 && j + 1 < lines.length) {
        j++;
        depth += bracketDelta(stripInlineComment(lines[j]));
      }
      if (tokenRe.test(m[1])) endIdx = j;
      i = j + 1;
      continue;
    }
    i++;
  }

  return lines.slice(headerStart, endIdx + 1).join("\n");
}

/** Renomme le jeton "vm<from>" en "vm<to>" dans un texte (délimité, ni
 * précédé ni suivi d'un caractère alphanumérique), en conservant la casse
 * du "vm" d'origine (ex. "VM1" -> "VM2", "vm1" -> "vm2"). */
function renumberVmTokenText(text: string, from: number, to: number): string {
  const re = new RegExp(`(?<![a-z0-9])(vm)${from}(?![a-z0-9])`, "gi");
  return text.replace(re, (_match, prefix: string) => `${prefix}${to}`);
}

/**
 * Génère un .tfvars fusionnant plusieurs VM (vm1, vm2, ...) dans un même
 * fichier. La section vm1 est rendue normalement (elle est déjà active
 * dans le template) ; pour chaque VM suivante, on clone la mise en forme
 * de la section vm1 (en-tête, commentaires, structure des blocs) plutôt
 * que d'essayer de "décommenter" le bloc d'exemple du template — dont le
 * style de commentaire est parfois irrégulier d'un template à l'autre —
 * puis on y substitue les valeurs de cette VM. Le bloc d'exemple commenté
 * d'origine est retiré.
 */
function buildVmMergeTfvars(
  tfContent: string,
  vmGroups: Map<number, VariableForGeneration[]>
): string {
  const indices = Array.from(vmGroups.keys()).sort((a, b) => a - b);
  const firstIndex = indices[0];

  let content = truncateAtCommentedBanner(buildTfvarsFromReference(tfContent, vmGroups.get(firstIndex)!));
  const templateSection = extractVmSection(tfContent, firstIndex);

  for (const idx of indices) {
    if (idx === firstIndex) continue;
    const rowsForThisVm = vmGroups.get(idx)!;

    if (templateSection) {
      const renamedSnippet = renumberVmTokenText(templateSection, firstIndex, idx);
      const block = buildTfvarsFromReference(renamedSnippet, rowsForThisVm);
      content = `${content.trimEnd()}\n\n${block.trimEnd()}\n`;
    } else {
      content = `${content.trimEnd()}\n\n${buildFlatTfvars(rowsForThisVm)}`;
    }
  }

  return content;
}

/**
 * Génère le contenu .tfvars à partir des variables. Si le template a un
 * `tfContent` de référence, il est utilisé comme gabarit (commentaires et
 * structure préservés, valeurs substituées) ; sinon un rendu "à plat" est
 * généré directement depuis les variables. Si les variables couvrent
 * plusieurs VM (vm1_*, vm2_*, ... — cas d'une fusion de plusieurs fiches
 * dans un même fichier), chaque VM au-delà de la 1ère est mise en forme en
 * clonant la section vm1 plutôt qu'en la laissant commentée.
 */
export function buildTfvars(
  variables: VariableForGeneration[],
  tfContent?: string | null
): { content: string; diff: DiffEntry[] } {
  const diff = computeDiff(variables);

  if (!tfContent || !tfContent.trim()) {
    return { content: buildFlatTfvars(variables), diff };
  }

  const vmGroups = groupRowsByVmIndex(variables);
  if (vmGroups && vmGroups.size > 1) {
    return { content: buildVmMergeTfvars(tfContent, vmGroups), diff };
  }

  return { content: buildTfvarsFromReference(tfContent, variables), diff };
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

/** Code d'environnement sur une lettre, tel qu'utilisé par la variable VM
 * `vm_env` (ex. vm_env = "q") — dérivé du code à 3 lettres du nom du RG
 * (prod/ppd/qual/homl/sdbx). Cf. WIN-IMAGE.tfvars / LNX-IMG.tfvars :
 * "p (production), u (uat/preproduction), q (qualification), s (sandbox), h (homologation)". */
const ENV_TO_VM_ENV: Record<string, string> = {
  prod: "p",
  ppd: "u",
  qual: "q",
  sdbx: "s",
  homl: "h",
};

/** "Type de serveur : Infra /Appli" (fiche FIS) -> valeurs attendues par la
 * variable `vm_type` ("infrastructure" ou "application", cf. WIN-IMAGE.tfvars). */
const SERVER_TYPE_TO_VM_TYPE: Record<string, string> = {
  infra: "infrastructure",
  appli: "application",
};

/**
 * Complète les paires clé/valeur extraites de la fiche FIS d'un serveur avec
 * les alias attendus par les templates VM (WIN-IMAGE.tfvars, LNX-IMG.tfvars) :
 * - "Resource Group" -> vm_rg
 * - "ASG 1" -> asg1_name
 * - "Subnet 1" -> subnet1_name
 * - "V-Net" -> vnet_name
 * - vm_env, dérivé du code d'environnement à 3 lettres (déjà déduit du nom du
 *   RG par deriveRgExtractedFields, ex. "ppd" -> "u")
 * - vm_type ("infrastructure" ou "application"), déduit du champ FIS
 *   "Type de serveur : Infra /Appli"
 * - "Gabarits VM" -> vm1_size, "Availability Zone" -> vm1_zone
 * - "OS (publisher)" -> vm1_image_publisher, "OS (Offer)" -> vm1_image_offer,
 *   "OS (SKU)" -> vm1_image_sku, "OS (Image Version)" -> vm1_image_version
 *   (templates "Marketplace" — WIN-Market, LNX-Market)
 * (repris tels quels par vm2_/vm3_/... lors d'une fusion, chaque fiche
 * source portant ses propres valeurs sous la clé "vm1_*" avant
 * renumérotation du jeton — cf. matchRowsForMerge)
 *
 * `vm1_hostnum` n'est PAS déduit automatiquement (l'ancienne déduction à
 * partir du dernier octet de "IP 1" ne correspondait pas fiablement à la
 * numérotation attendue dans le subnet) : c'est un champ obligatoire à
 * saisir à la main dans l'atelier de revue — cf. GenerateView.tsx.
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
  alias("gabarits_vm", "vm1_size");
  alias("availability_zone", "vm1_zone");
  alias("os_publisher", "vm1_image_publisher");
  alias("os_offer", "vm1_image_offer");
  alias("os_sku", "vm1_image_sku");
  alias("os_image_version", "vm1_image_version");

  const env = map.get("env");
  const vmEnvLetter = env ? ENV_TO_VM_ENV[env] : undefined;
  if (vmEnvLetter) {
    result.push({ key: "vm_env", value: vmEnvLetter });
  }

  // "Nom du serveur" suit la convention vm<lettre env><shortname><index> (ex.
  // "vmpolfslv01" = vm + p (prod) + olfslv + 01) : on en extrait le
  // "shortname" en retirant le préfixe vm<lettre env> et l'index numérique
  // final. N'aboutit que si la lettre d'environnement du nom correspond bien
  // à celle déduite du Resource Group, pour éviter une déduction hasardeuse.
  const serverName = map.get("nom_du_serveur");
  if (serverName && vmEnvLetter) {
    const m = serverName.trim().toLowerCase().match(/^vm([a-z])(.+?)(\d+)$/);
    if (m && m[1] === vmEnvLetter) {
      result.push({ key: "vm_shortname", value: m[2] });
    }
  }

  // Clé normalisée du champ FIS "Type de serveur : Infra /Appli" (l'espace
  // insécable mal encodé dans l'en-tête source se retrouve fusionné dans la clé).
  const serverType = map.get("type_de_serveura_infra_appli");
  if (serverType) {
    const vmType = SERVER_TYPE_TO_VM_TYPE[serverType.trim().toLowerCase()];
    if (vmType) result.push({ key: "vm_type", value: vmType });
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
