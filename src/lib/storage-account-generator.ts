import { buildTfvars, type VariableForGeneration } from "./tfvars-generator";

export interface ExtractedPair {
  key: string;
  value: string;
}

/**
 * Générateur dédié aux fiches "Storage Account" (fichier de référence
 * `locals { ... SA_list = [ {...} ] }`), structurellement différent des
 * .tfvars plats/à un niveau de map que gère tfvars-generator.ts. Plusieurs
 * blocs de la fiche de référence sont des listes d'objets optionnelles,
 * commentées par défaut (Containers, azure_file_shares, ACL_subnets, règles
 * LCM, identités, private endpoints) : ce module les active et les remplit
 * automatiquement quand la fiche Excel contient les données correspondantes,
 * et les laisse en liste vide `[]` sinon (comme demandé par les commentaires
 * du fichier de référence lui-même).
 */
export function isStorageAccountTemplate(tfContent: string | null | undefined): boolean {
  return !!tfContent && /SA_list\s*=\s*\[/.test(tfContent);
}

function splitLines(v: string | undefined): string[] {
  if (!v) return [];
  return v
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitCommas(v: string | undefined): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function hcl(v: string): string {
  return `"${v.replace(/"/g, '\\"')}"`;
}

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((l) => (l ? pad + l : l))
    .join("\n");
}

function boolStr(v: string | undefined, fallback: "true" | "false" = "false"): string {
  if (v === undefined || v === "") return fallback;
  const s = v.trim().toLowerCase();
  if (["true", "vrai", "oui", "1", "yes"].includes(s)) return "true";
  if (["false", "faux", "non", "0", "no"].includes(s)) return "false";
  return fallback;
}

function stringList(v: string | undefined): string {
  const items = splitCommas(v);
  if (items.length === 0) return "[]";
  return `[${items.map(hcl).join(", ")}]`;
}

/** Assignations de rôle : produit toutes les paires (groupe × rôle) listées
 * pour cette ressource — un groupe demandant plusieurs rôles obtient une
 * entrée par rôle. Les rôles écrits avec des underscores dans la fiche sont
 * normalisés en espaces (nom de rôle Azure RBAC). */
function renderRoleAssignments(groupsRaw: string | undefined, rolesRaw: string | undefined): string {
  const groups = splitCommas(groupsRaw);
  const roles = splitCommas(rolesRaw).map((r) => r.replace(/_/g, " "));
  if (groups.length === 0 || roles.length === 0) return "[]";

  const entries: string[] = [];
  for (const g of groups) {
    for (const r of roles) {
      entries.push(`{ group_name = ${hcl(g)}, role = ${hcl(r)} }`);
    }
  }
  return `[\n${indent(entries.join("\n"), 2)}\n]`;
}

function renderAclSubnets(map: Map<string, string>): string {
  const raw = splitLines(map.get("acl_subnets"));
  if (raw.length === 0) return "[]";
  const entries = raw
    .map((line) => {
      const [name, vnet, rg] = line.split(",").map((s) => s.trim());
      if (!name) return null;
      return (
        `{\n` +
        `  name                 = ${hcl(name)}\n` +
        `  virtual_network_name = ${hcl(vnet || "")}\n` +
        `  resource_group_name  = ${hcl(rg || "")}\n` +
        `}`
      );
    })
    .filter((x): x is string => !!x);
  if (entries.length === 0) return "[]";
  return `[\n${indent(entries.join("\n"), 2)}\n]`;
}

function renderUserAssignedIdentities(map: Map<string, string>): string {
  const name = map.get("user_assigned_identity_name");
  if (!name) return "[]";
  const rg = map.get("user_assigned_identity_rg") || "";
  return `[\n  {\n    name           = ${hcl(name)}\n    resource_group = ${hcl(rg)}\n  }\n]`;
}

function renderKvCmk(map: Map<string, string>): string {
  const kvName = map.get("kv_cmk_name");
  if (!kvName) return "{}";
  return (
    `{\n` +
    `  kv_name     = ${hcl(kvName)}\n` +
    `  kv_rg       = ${hcl(map.get("kv_cmk_rg") || "")}\n` +
    `  kv_key_name = ${hcl(map.get("kv_cmk_key_name") || "")}\n` +
    `}`
  );
}

function renderPrivateEndpoint(map: Map<string, string>, prefix: "afs" | "blob"): string {
  return (
    `{\n` +
    `  pe_create      = ${boolStr(map.get(`${prefix}_private_endpoint`))}\n` +
    `  pe_subnet_name = ${hcl(map.get(`${prefix}_pe_subnet_name`) || "")}\n` +
    `  pe_vnet_name   = ${hcl(map.get(`${prefix}_pe_vnet_name`) || "")}\n` +
    `  pe_vnet_rg     = ${hcl(map.get(`${prefix}_pe_vnet_rg`) || "")}\n` +
    `  pe_asg_name    = ${hcl(map.get(`${prefix}_pe_asg_name`) || "")}\n` +
    `  pe_asg_rg      = ${hcl(map.get(`${prefix}_pe_asg_rg`) || "")}\n` +
    `  pe_ip_address  = ${hcl(map.get(`${prefix}_pe_ip_address`) || "")}\n` +
    `}`
  );
}

interface LcmFieldKeys {
  namesKey: string;
  blockTypesKey: string;
  prefixKey?: string;
  deleteCreatedKey: string;
  deleteModifiedKey: string;
  coolCreatedKey: string;
  coolModifiedKey: string;
  coldCreatedKey: string;
  coldModifiedKey: string;
  archiveCreatedKey: string;
  archiveModifiedKey: string;
  snapshotDeleteKey: string;
  versionDeleteKey: string;
}

/** Une règle LCM par nom trouvé dans <namesKey> ; les autres champs sont
 * appariés par index (même position dans leur liste \n-séparée). Une valeur
 * manquante, vide ou "-1" devient `null` (comportement par défaut Azure). */
function renderLcmRules(map: Map<string, string>, f: LcmFieldKeys): string {
  const names = splitLines(map.get(f.namesKey));
  if (names.length === 0) return "[]";

  const blockTypesList = splitLines(map.get(f.blockTypesKey));
  const prefixList = f.prefixKey ? splitLines(map.get(f.prefixKey)) : [];

  const numField = (key: string, i: number): string => {
    const vals = splitLines(map.get(key));
    const v = vals[i];
    if (v === undefined || v === "" || v === "-1") return "null";
    return v;
  };

  const entries = names.map((name, i) => {
    const blockTypesRaw = blockTypesList[i] || blockTypesList[0] || "blockBlob";
    const blockTypes = splitCommas(blockTypesRaw).map(hcl).join(", ");

    const lines = [`name = ${hcl(name)}`, `blob_types = [${blockTypes}]`];

    if (f.prefixKey) {
      const prefixVal = prefixList[i];
      lines.push(`prefix = [${prefixVal ? splitCommas(prefixVal).map(hcl).join(", ") : ""}]`);
    }

    lines.push(
      `politique = {`,
      indent(
        [
          `delete_created = ${numField(f.deleteCreatedKey, i)}`,
          `delete_modified = ${numField(f.deleteModifiedKey, i)}`,
          `move_to_cool_created = ${numField(f.coolCreatedKey, i)}`,
          `move_to_cool_modified = ${numField(f.coolModifiedKey, i)}`,
          `move_to_cold_created = ${numField(f.coldCreatedKey, i)}`,
          `move_to_cold_modified = ${numField(f.coldModifiedKey, i)}`,
          `move_to_archive_created = ${numField(f.archiveCreatedKey, i)}`,
          `move_to_archive_modified = ${numField(f.archiveModifiedKey, i)}`,
          `snapshop_delete = ${numField(f.snapshotDeleteKey, i)}`,
          `version_delete = ${numField(f.versionDeleteKey, i)}`,
        ].join("\n"),
        2
      ),
      `}`
    );

    return `{\n${indent(lines.join("\n"), 2)}\n}`;
  });

  return `[\n${indent(entries.join("\n"), 2)}\n]`;
}

const CONTAINER_LCM_KEYS: LcmFieldKeys = {
  namesKey: "container_lcm_rules_names",
  blockTypesKey: "container_lcm_rules_block_types",
  prefixKey: "container_lcm_prefix_match",
  deleteCreatedKey: "container_lcm_rule_blob_delete_after_days_since_creation_greater_than",
  deleteModifiedKey: "container_lcm_rule_blob_delete_after_days_since_modification_greater_than",
  coolCreatedKey: "container_lcm_blob_to_cool_after_days_since_creation_greater_than",
  coolModifiedKey: "container_lcm_blob_to_cool_after_days_since_modification_greater_than",
  coldCreatedKey: "container_lcm_blob_to_cold_after_days_since_creation_greater_than",
  coldModifiedKey: "container_lcm_blob_to_cold_after_days_since_modification_greater_than",
  archiveCreatedKey: "container_lcm_blob_to_archive_after_days_since_creation_greater_than",
  archiveModifiedKey: "container_lcm_blob_to_archive_after_days_since_modification_greater_than",
  snapshotDeleteKey: "container_lcm_snapshot_delete_after_days_since_creation_greater_than",
  versionDeleteKey: "container_lcm_version_delete_after_days_since_creation",
};

const ACCOUNT_LCM_KEYS: LcmFieldKeys = {
  namesKey: "account_lcm_rules_names",
  blockTypesKey: "account_lcm_rules_block_types",
  deleteCreatedKey: "account_lcm_rule_blob_delete_after_days_since_creation_greater_than",
  deleteModifiedKey: "account_lcm_rule_blob_delete_after_days_since_modification_greater_than",
  coolCreatedKey: "account_lcm_blob_to_cool_after_days_since_creation_greater_than",
  coolModifiedKey: "account_lcm_blob_to_cool_after_days_since_modification_greater_than",
  coldCreatedKey: "account_lcm_blob_to_cold_after_days_since_creation_greater_than",
  coldModifiedKey: "account_lcm_blob_to_cold_after_days_since_modification_greater_than",
  archiveCreatedKey: "account_lcm_blob_to_archive_after_days_since_creation_greater_than",
  archiveModifiedKey: "account_lcm_blob_to_archive_after_days_since_modification_greater_than",
  snapshotDeleteKey: "account_lcm_snapshot_delete_after_days_since_creation_greater_than",
  versionDeleteKey: "account_lcm_version_delete_after_days_since_creation",
};

/** Un conteneur par nom trouvé dans container_names ; les autres champs sont
 * appariés par index. Les règles LCM de conteneur (champs non indexés côté
 * fiche Excel) ne s'appliquent qu'au 1er conteneur. */
function renderContainers(map: Map<string, string>): string {
  const names = splitLines(map.get("container_names"));
  if (names.length === 0) return "[]";

  const accessTypes = splitLines(map.get("container_access_type"));
  const rbacGroups = splitLines(map.get("container_rbac_group_assignments"));
  const rbacRoles = splitLines(map.get("container_rbac_role_assignments"));

  const entries = names.map((name, i) => {
    const lines = [
      `name        = ${hcl(name)}`,
      `access_type = ${hcl(accessTypes[i] || "private")}`,
      ``,
      `role_assignments = ${renderRoleAssignments(rbacGroups[i], rbacRoles[i])}`,
      ``,
      `lcm_rules = ${i === 0 ? renderLcmRules(map, CONTAINER_LCM_KEYS) : "[]"}`,
      ``,
      `immutability_policy = {`,
      `  time_based_enabled = false`,
      `  time_based_retention_days = 1`,
      `  time_based_locked  = false`,
      `  time_based_protected_append_writes = "none"`,
      `}`,
    ];
    return `{\n${indent(lines.join("\n"), 2)}\n}`;
  });

  return `[\n${indent(entries.join("\n"), 2)}\n]`;
}

/** Un partage de fichiers par nom trouvé dans file_share_names ; les autres
 * champs sont appariés par index. */
function renderFileShares(map: Map<string, string>): string {
  const names = splitLines(map.get("file_share_names"));
  if (names.length === 0) return "[]";

  const quotas = splitLines(map.get("file_share_quotas"));
  const tiers = splitLines(map.get("file_share_access_tiers"));
  const protocols = splitLines(map.get("file_share_protocols"));
  const rbacGroups = splitLines(map.get("file_share_rbac_group_assignments"));
  const rbacRoles = splitLines(map.get("file_share_rbac_role_assignments"));

  const entries = names.map((name, i) => {
    const lines = [
      `name             = ${hcl(name)}`,
      `quota            = ${quotas[i] || "1"}`,
      `access_tier      = ${hcl(tiers[i] || "Hot")}`,
      `enabled_protocol = ${hcl(protocols[i] || "SMB")}`,
      `role_assignments = ${renderRoleAssignments(rbacGroups[i], rbacRoles[i])}`,
    ];
    return `{\n${indent(lines.join("\n"), 2)}\n}`;
  });

  return `[\n${indent(entries.join("\n"), 2)}\n]`;
}

function renderStorageAccountObject(map: Map<string, string>, index: number): string {
  const name = map.get("storage_account_name") || "";
  const idx = map.get("storage_account_index") || String(index + 1);

  const lines = [
    `# ${hcl(name)}`,
    `name                            = format("%s%02d", module.naming_SA.result, ${hcl(String(idx))})`,
    `account_tier                    = ${hcl(map.get("account_tier") || "Standard")}`,
    `account_replication_type        = ${hcl(map.get("replication_type") || "LRS")}`,
    `access_tier                     = ${hcl(map.get("access_tier_blob") || "Hot")}`,
    `allow_nested_items_to_be_public = "false"`,
    `public_network_access_enabled   = ${hcl(boolStr(map.get("public_network_access_enabled"), "true"))}`,
    `is_hns_enabled                  = ${hcl(boolStr(map.get("hns_enabled")))}`,
    `nfsv3_enabled                   = ${hcl(boolStr(map.get("nfsv3_enabled")))}`,
    `sftp_enabled                    = ${hcl(boolStr(map.get("sftp_enabled")))}`,
    ``,
    `tags = merge(local.tags_always, local.tags_service,`,
    `  {`,
    `    Backup      = ${hcl(map.get("backup_tag") || "nobackup")}`,
    `    Description = ${hcl(map.get("description_tag") || "")}`,
    `  }`,
    `)`,
    ``,
    `ACL_ip_rules       = ${stringList(map.get("acl_ip_rules"))}`,
    `ACL_bypass         = ${map.get("acl_bypass") ? stringList(map.get("acl_bypass")) : `["AzureServices", "Metrics"]`}`,
    `ACL_default_action = ${hcl(map.get("acl_default_action") || "Deny")}`,
    `ACL_subnets = ${renderAclSubnets(map)}`,
    ``,
    `identity = ${hcl(map.get("identity") || "None")}`,
    `user_assigned_identities = ${renderUserAssignedIdentities(map)}`,
    `kv_cmk = ${renderKvCmk(map)}`,
    ``,
    `Containers = ${renderContainers(map)}`,
    ``,
    `azure_file_shares = ${renderFileShares(map)}`,
    ``,
    `account_role_assignments = []`,
    ``,
    `account_lcm_rules = ${renderLcmRules(map, ACCOUNT_LCM_KEYS)}`,
    ``,
    `AFS_private_endpoint = ${renderPrivateEndpoint(map, "afs")}`,
    ``,
    `BLOB_private_endpoint = ${renderPrivateEndpoint(map, "blob")}`,
  ];

  return `{\n${indent(lines.join("\n"), 2)}\n}`;
}

function buildHeaderVariables(map: Map<string, string>): VariableForGeneration[] {
  const g = (k: string) => map.get(k) || "";
  return [
    { name: "env", type: "string", defaultValue: null, finalValue: g("env") },
    { name: "service_fullname", type: "string", defaultValue: null, finalValue: g("service_fullname") },
    { name: "SA_rg", type: "string", defaultValue: null, finalValue: g("sa_rg") },
    { name: "Builder", type: "string", defaultValue: null, finalValue: g("builder_tag"), group: "tags_always" },
    { name: "Environment", type: "string", defaultValue: null, finalValue: g("environment_tag"), group: "tags_always" },
    { name: "Deployment", type: "string", defaultValue: null, finalValue: g("deployment_tag"), group: "tags_always" },
    { name: "ROS", type: "string", defaultValue: null, finalValue: g("ros_tag"), group: "tags_service" },
    { name: "Service_Name", type: "string", defaultValue: null, finalValue: g("service_name_tag"), group: "tags_service" },
    { name: "Service_ID", type: "string", defaultValue: null, finalValue: g("service_id_tag"), group: "tags_service" },
  ];
}

/**
 * Génère le .tfvars pour un template "Storage Account" : substitue les
 * scalaires/tags d'en-tête (env, service_fullname, SA_rg, tags_always,
 * tags_service) via le moteur générique, puis remplace intégralement le
 * bloc `SA_list = [ ... ]` par un objet reconstruit à partir de la fiche
 * Excel — listes optionnelles (Containers, azure_file_shares, ACL_subnets,
 * règles LCM, identités, private endpoints) activées et remplies quand la
 * fiche contient les données correspondantes, sinon laissées à `[]`/`{}`
 * comme demandé par les commentaires du fichier de référence.
 */
export function buildStorageAccountTfvars(tfContent: string, extracted: ExtractedPair[]): string {
  const map = new Map(extracted.map((e) => [e.key, e.value]));

  const saListMatch = tfContent.match(/SA_list\s*=\s*\[/);
  if (!saListMatch || saListMatch.index === undefined) {
    return tfContent;
  }

  const arrayStart = tfContent.indexOf("[", saListMatch.index);
  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < tfContent.length; i++) {
    if (tfContent[i] === "[") depth++;
    else if (tfContent[i] === "]") {
      depth--;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }
  if (arrayEnd === -1) return tfContent;

  const headerPart = tfContent.slice(0, saListMatch.index);
  const afterArray = tfContent.slice(arrayEnd + 1); // après le "]" d'origine

  const { content: renderedHeader } = buildTfvars(buildHeaderVariables(map), headerPart);

  const renderedObject = renderStorageAccountObject(map, 0);
  const saListBlock = `SA_list = [\n${indent(renderedObject, 4)}\n]`;

  return `${renderedHeader.replace(/\s*$/, "")}\n\n${saListBlock}${afterArray}`;
}
