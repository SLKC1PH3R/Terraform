export interface ParsedTfVariable {
  name: string;
  type: string; // string | number | bool | list | map
  defaultValue: string;
  description: string;
  group: string; // si non vide, cette variable est une sous-clé du map <group>
}

/**
 * Retire un commentaire de fin de ligne (# ...), en ignorant les '#' à
 * l'intérieur d'une chaîne entre guillemets.
 */
function stripInlineComment(line: string): string {
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i - 1] !== "\\") inQuotes = !inQuotes;
    if (ch === "#" && !inQuotes) return line.slice(0, i);
  }
  return line;
}

function countChar(s: string, ch: string): number {
  return (s.match(new RegExp(`\\${ch}`, "g")) || []).length;
}

function inferType(raw: string): string {
  const v = raw.trim();
  if (v.startsWith("{")) return "map";
  if (v.startsWith("[")) return "list";
  if (/^(true|false)$/i.test(v)) return "bool";
  if (/^-?\d+(\.\d+)?$/.test(v)) return "number";
  return "string";
}

/** Convertit une liste HCL `["a", "b"]` vers le format attendu par l'app pour
 * les variables de type "list" : "a, b" */
function listToAppFormat(raw: string): string {
  const inner = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  const items = inner
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^"([\s\S]*)"$/);
      return m ? m[1] : s;
    });
  return items.join(", ");
}

function extractDefaultValue(type: string, raw: string): string {
  const v = raw.trim();
  if (type === "list") return listToAppFormat(v);
  if (type === "string") {
    const m = v.match(/^"([\s\S]*)"$/);
    return m ? m[1] : v;
  }
  return v; // number / bool telles quelles
}

interface RawAssignment {
  name: string;
  valueLines: string[]; // lignes brutes (avec commentaires), la 1ère contient "name = ..."
  description: string;
}

/**
 * Scanne une séquence de lignes (fichier complet, ou intérieur d'un bloc map)
 * et retourne les assignations `key = value` de premier niveau, avec leurs
 * lignes brutes (pour les valeurs multi-lignes) et la description déduite du
 * commentaire précédent.
 */
function scanAssignments(rawLines: string[]): RawAssignment[] {
  const results: RawAssignment[] = [];
  let pendingComments: string[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const trimmed = rawLines[i].trim();

    if (trimmed === "") {
      i++;
      continue;
    }

    if (trimmed.startsWith("#") || trimmed.startsWith("//")) {
      const text = trimmed.replace(/^(#+|\/\/+)\s?/, "").trim();
      if (text && !/^[-=#*]+$/.test(text)) {
        pendingComments.push(text);
      } else {
        pendingComments = [];
      }
      i++;
      continue;
    }

    const match = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*(.*)$/);
    if (!match) {
      pendingComments = [];
      i++;
      continue;
    }

    const name = match[1];
    const firstValuePart = stripInlineComment(match[2]);
    let depthBrace = countChar(firstValuePart, "{") - countChar(firstValuePart, "}");
    let depthBracket = countChar(firstValuePart, "[") - countChar(firstValuePart, "]");

    const valueLines: string[] = [rawLines[i]];
    let j = i;
    while (depthBrace > 0 || depthBracket > 0) {
      j++;
      if (j >= rawLines.length) break;
      const nextTrimmed = rawLines[j].trim();
      valueLines.push(rawLines[j]);
      if (nextTrimmed.startsWith("#") || nextTrimmed.startsWith("//")) continue;
      const nextLine = stripInlineComment(rawLines[j]);
      depthBrace += countChar(nextLine, "{") - countChar(nextLine, "}");
      depthBracket += countChar(nextLine, "[") - countChar(nextLine, "]");
    }

    results.push({ name, valueLines, description: pendingComments.join(" ").trim() });
    pendingComments = [];
    i = j + 1;
  }

  return results;
}

/** Reconstruit le texte de la valeur (sans commentaires) à partir des lignes brutes. */
function joinValue(valueLines: string[]): string {
  const parts: string[] = [];
  for (let idx = 0; idx < valueLines.length; idx++) {
    const raw = valueLines[idx];
    const trimmed = raw.trim();
    if (idx > 0 && (trimmed.startsWith("#") || trimmed.startsWith("//"))) continue;
    const stripped = stripInlineComment(raw);
    if (idx === 0) {
      parts.push(stripped.slice(stripped.indexOf("=") + 1));
    } else {
      parts.push(stripped);
    }
  }
  return parts.join("\n");
}

/** Extrait les lignes internes d'un bloc `{ ... }` (entre la 1ère `{` et la dernière `}`). */
function innerLinesOfBlock(valueLines: string[]): string[] {
  const joined = valueLines.join("\n");
  const start = joined.indexOf("{");
  const end = joined.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return [];
  return joined.slice(start + 1, end).split("\n");
}

/**
 * Extrait les variables d'un fichier .tfvars (ou les assignations
 * `key = value` d'un fichier .tf). Les blocs map (ex. `tags_service = { ROS =
 * "...", ... }`) sont décomposés en une variable par sous-clé (ROS,
 * Service_Name, ...), chacune avec son propre type/défaut/description, et
 * taguée avec `group` = nom du map parent — ce qui permet à la fois un
 * matching direct avec les fiches FIS (qui exposent ces mêmes clés à plat) et
 * une recomposition correcte du bloc map à la génération du .tfvars final.
 */
export function parseTfvars(content: string): ParsedTfVariable[] {
  const rawLines = content.split(/\r?\n/);
  const assignments = scanAssignments(rawLines);
  const results: ParsedTfVariable[] = [];
  const seen = new Set<string>();

  for (const a of assignments) {
    const fullValue = joinValue(a.valueLines);
    const type = inferType(fullValue);

    if (type === "map") {
      const innerAssignments = scanAssignments(innerLinesOfBlock(a.valueLines));
      for (const inner of innerAssignments) {
        const identity = `${a.name}.${inner.name}`;
        if (seen.has(identity)) continue;
        seen.add(identity);

        const innerValue = joinValue(inner.valueLines);
        let innerType = inferType(innerValue);
        if (innerType === "map") innerType = "string"; // maps imbriqués non supportés : on garde le texte brut

        results.push({
          name: inner.name,
          type: innerType,
          defaultValue: extractDefaultValue(innerType, innerValue),
          description: inner.description,
          group: a.name,
        });
      }
      continue;
    }

    if (seen.has(a.name)) continue;
    seen.add(a.name);

    results.push({
      name: a.name,
      type,
      defaultValue: extractDefaultValue(type, fullValue),
      description: a.description,
      group: "",
    });
  }

  return results;
}
