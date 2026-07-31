export interface ParsedTfVariable {
  name: string;
  type: string; // string | number | bool | list | map
  defaultValue: string;
  description: string;
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

/** Convertit un bloc HCL `{ cle = "valeur" ... }` vers le format attendu par
 * l'app pour les variables de type "map" : "cle=valeur, cle2=valeur2" */
function mapBlockToAppFormat(raw: string): string {
  const inner = raw.trim().replace(/^\{/, "").replace(/\}$/, "");
  const pairs: string[] = [];
  for (const rawLine of inner.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    const strMatch = val.match(/^"([\s\S]*)"$/);
    if (strMatch) val = strMatch[1];
    pairs.push(`${m[1]}=${val}`);
  }
  return pairs.join(", ");
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
  if (type === "map") return mapBlockToAppFormat(v);
  if (type === "list") return listToAppFormat(v);
  if (type === "string") {
    const m = v.match(/^"([\s\S]*)"$/);
    return m ? m[1] : v;
  }
  return v;
}

/**
 * Extrait les variables d'un fichier .tfvars (ou les assignations
 * `key = value` d'un fichier .tf) : nom, type déduit, valeur par défaut, et
 * description (déduite du commentaire précédant l'assignation).
 */
export function parseTfvars(content: string): ParsedTfVariable[] {
  const rawLines = content.split(/\r?\n/);
  const results: ParsedTfVariable[] = [];
  const seen = new Set<string>();

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
      // ignore les lignes décoratives (séparateurs faits de ponctuation)
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
    let fullValue = stripInlineComment(match[2]);
    let depthBrace = countChar(fullValue, "{") - countChar(fullValue, "}");
    let depthBracket = countChar(fullValue, "[") - countChar(fullValue, "]");

    let j = i;
    while (depthBrace > 0 || depthBracket > 0) {
      j++;
      if (j >= rawLines.length) break;
      const nextTrimmed = rawLines[j].trim();
      if (nextTrimmed.startsWith("#") || nextTrimmed.startsWith("//")) continue;
      const nextLine = stripInlineComment(rawLines[j]);
      depthBrace += countChar(nextLine, "{") - countChar(nextLine, "}");
      depthBracket += countChar(nextLine, "[") - countChar(nextLine, "]");
      fullValue += "\n" + nextLine;
    }

    const type = inferType(fullValue);
    const defaultValue = extractDefaultValue(type, fullValue);
    const description = pendingComments.join(" ").trim();

    if (!seen.has(name)) {
      seen.add(name);
      results.push({ name, type, defaultValue, description });
    }

    pendingComments = [];
    i = j + 1;
  }

  return results;
}
