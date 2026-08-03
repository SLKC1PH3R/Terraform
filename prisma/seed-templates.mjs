// Peuple la base avec les templates par défaut, à partir des fichiers de
// référence du dossier Model-Ressource/. Idempotent : ne recrée pas un
// template dont le nom existe déjà (permet de relancer ce script sans
// risque à chaque démarrage du conteneur).
//
// Port en JS pur (sans TypeScript) de src/lib/tfvars-parser.ts, car
// l'image runtime ne contient pas de compilateur TypeScript.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = path.join(__dirname, "..", "Model-Ressource");

const prisma = new PrismaClient();

/* ------------------------------------------------------------ tfvars parser
   (copie fonctionnelle de src/lib/tfvars-parser.ts) */

function stripInlineComment(line) {
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i - 1] !== "\\") inQuotes = !inQuotes;
    if (ch === "#" && !inQuotes) return line.slice(0, i);
  }
  return line;
}

function countChar(s, ch) {
  return (s.match(new RegExp(`\\${ch}`, "g")) || []).length;
}

function inferType(raw) {
  const v = raw.trim();
  if (v.startsWith("{")) return "map";
  if (v.startsWith("[")) return "list";
  if (/^(true|false)$/i.test(v)) return "bool";
  if (/^-?\d+(\.\d+)?$/.test(v)) return "number";
  return "string";
}

function listToAppFormat(raw) {
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

function extractDefaultValue(type, raw) {
  const v = raw.trim();
  if (type === "list") return listToAppFormat(v);
  if (type === "string") {
    const m = v.match(/^"([\s\S]*)"$/);
    return m ? m[1] : v;
  }
  return v;
}

function scanAssignments(rawLines) {
  const results = [];
  let pendingComments = [];
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

    const valueLines = [rawLines[i]];
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

function joinValue(valueLines) {
  const parts = [];
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

function innerLinesOfBlock(valueLines) {
  const joined = valueLines.join("\n");
  const start = joined.indexOf("{");
  const end = joined.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return [];
  return joined.slice(start + 1, end).split("\n");
}

function parseTfvars(content) {
  const rawLines = content.split(/\r?\n/);
  const assignments = scanAssignments(rawLines);
  const results = [];
  const seen = new Set();

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
        if (innerType === "map") innerType = "string";

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

/* --------------------------------------------------------------- templates */

const TEMPLATES = [
  { file: "model-RG.tfvars", name: "Resource Group", category: "RG", description: "Groupe de ressources Azure standard." },
  { file: "SA_list_to_complete.tf", name: "Storage Account", category: "STORAGE", description: "Compte(s) de stockage (SA_list) : conteneurs, partages, ACL, LCM, private endpoints." },
  { file: "model-ASG-NSG.tfvars", name: "ASG / NSG", category: "NSG_ASG", description: "Règles ASG/NSG pour un ou plusieurs rôles de VM." },
  { file: "WIN-IMAGE.tfvars", name: "VM Windows (Image)", category: "VM", description: "VM Windows créée depuis une image Azure custom." },
  { file: "WIN-Market.tfvars", name: "VM Windows (Marketplace)", category: "VM", description: "VM Windows créée depuis une image Azure Marketplace." },
  { file: "LNX-IMG.tfvars", name: "VM Linux (Image)", category: "VM", description: "VM Linux créée depuis une image Azure custom." },
  { file: "LNX-Market.tfvars", name: "VM Linux (Marketplace)", category: "VM", description: "VM Linux créée depuis une image Azure Marketplace." },
  { file: "model-ILB.tfvars", name: "Load Balancer", category: "LOAD_BALANCER", description: "Load balancer interne (ILB), règles et sondes par port applicatif." },
  { file: "KeyVault.tfvars", name: "Key Vault", category: "KEY_VAULT", description: "Azure Key Vault : accès réseau, role assignments, private endpoint." },
];

async function main() {
  for (const t of TEMPLATES) {
    const existing = await prisma.template.findFirst({ where: { name: t.name } });
    if (existing) {
      console.log(`[seed-templates] déjà présent, ignoré : ${t.name}`);
      continue;
    }

    const filePath = path.join(MODEL_DIR, t.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[seed-templates] fichier introuvable, ignoré : ${filePath}`);
      continue;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const variables = parseTfvars(content);

    await prisma.template.create({
      data: {
        name: t.name,
        category: t.category,
        description: t.description,
        tfContent: content,
        variables: {
          create: variables.map((v, i) => ({
            name: v.name,
            type: v.type,
            defaultValue: v.defaultValue,
            description: v.description || null,
            required: false,
            order: i,
            group: v.group || null,
          })),
        },
      },
    });

    console.log(`[seed-templates] créé : ${t.name} (${variables.length} variables)`);
  }
}

main()
  .catch((e) => {
    console.error("[seed-templates] échec :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
