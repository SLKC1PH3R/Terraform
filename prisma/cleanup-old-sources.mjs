// Purge les fiches sources brutes (sourceFileData) des générations plus
// anciennes que N jours, pour éviter une croissance indéfinie de la base
// (chaque fiche Excel pèse ~50-100 Ko, stockée en Bytes dans Postgres).
//
// Le reste de la génération (résultat .tfvars, diff, historique) est
// conservé — seule la fiche source brute est effacée, plus utile après un
// certain temps puisqu'elle ne sert qu'au "re-téléchargement" occasionnel.
//
// Usage :
//   node prisma/cleanup-old-sources.mjs [jours]
//   (par défaut : 365 jours, ou la variable d'env SOURCE_FILE_RETENTION_DAYS)
//
// Ce script n'est PAS exécuté automatiquement au démarrage du conteneur —
// c'est une action de maintenance à déclencher manuellement (ou via une
// tâche planifiée externe, ex. cron Dokploy) une fois la politique de
// rétention validée.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const days = parseInt(process.argv[2] || process.env.SOURCE_FILE_RETENTION_DAYS || "365", 10);

if (!Number.isFinite(days) || days <= 0) {
  console.error("[cleanup-old-sources] nombre de jours invalide :", process.argv[2]);
  process.exit(1);
}

async function main() {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const candidates = await prisma.generation.count({
    where: { createdAt: { lt: cutoff }, sourceFileData: { not: null } },
  });

  if (candidates === 0) {
    console.log(`[cleanup-old-sources] aucune fiche source de plus de ${days} jours à purger.`);
    return;
  }

  const result = await prisma.generation.updateMany({
    where: { createdAt: { lt: cutoff }, sourceFileData: { not: null } },
    data: { sourceFileData: null, sourceFileMime: null },
  });

  console.log(
    `[cleanup-old-sources] ${result.count} fiche(s) source(s) purgée(s) (générations créées avant ${cutoff.toISOString()}, soit plus de ${days} jours).`
  );
}

main()
  .catch((e) => {
    console.error("[cleanup-old-sources] échec :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
