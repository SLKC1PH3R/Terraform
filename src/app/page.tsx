import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  RG: "Resource Group",
  STORAGE: "Storage Account",
  NSG_ASG: "NSG / ASG",
  VM_WINDOWS_MARKETPLACE: "VM Windows (Marketplace)",
  VM_WINDOWS_CUSTOM: "VM Windows (Custom)",
  VM_LINUX: "VM Linux",
};

export default async function DashboardPage() {
  const templates = await prisma.template.findMany({
    include: { _count: { select: { variables: true } } },
    orderBy: { createdAt: "desc" },
  });

  const recentGenerations = await prisma.generation.findMany({
    include: { template: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">TFGen</h1>
          <p className="text-slate-400 text-sm">
            Générateur de configurations Terraform à partir des fiches FIS
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/templates/new" className="btn-secondary">
            + Nouveau template
          </Link>
          <Link href="/generate" className="btn">
            Générer un tfvars
          </Link>
        </div>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3">Templates ({templates.length})</h2>
        {templates.length === 0 ? (
          <p className="text-slate-500 text-sm">
            Aucun template pour le moment.{" "}
            <Link href="/templates/new" className="text-orange-500 underline">
              En créer un
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <Link key={t.id} href={`/templates/${t.id}`} className="card hover:border-orange-600 transition-colors">
                <span className="text-xs uppercase tracking-wide text-orange-500">
                  {CATEGORY_LABELS[t.category] || t.category}
                </span>
                <h3 className="font-semibold mt-1">{t.name}</h3>
                {t.description && (
                  <p className="text-slate-400 text-sm mt-1 line-clamp-2">{t.description}</p>
                )}
                <p className="text-slate-500 text-xs mt-3">
                  {t._count.variables} variable(s)
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Dernières générations</h2>
        {recentGenerations.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucune génération pour le moment.</p>
        ) : (
          <div className="card divide-y divide-slate-800">
            {recentGenerations.map((g) => (
              <div key={g.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium text-sm">{g.template.name}</p>
                  <p className="text-slate-500 text-xs">
                    {g.fileName} · {new Date(g.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <a href={`/api/generate/${g.id}/download`} className="btn-secondary text-sm">
                  Télécharger
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
