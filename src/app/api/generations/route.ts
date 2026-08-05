import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SELECT = {
  id: true,
  fileName: true,
  createdAt: true,
  sourceFileMime: true,
  template: { select: { id: true, name: true, category: true } },
} as const;

function mapGeneration(g: {
  id: string;
  fileName: string;
  createdAt: Date;
  sourceFileMime: string | null;
  template: { id: string; name: string; category: string };
}) {
  return {
    id: g.id,
    fileName: g.fileName,
    createdAt: g.createdAt,
    template: g.template,
    hasSourceFile: !!g.sourceFileMime,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const paginated = searchParams.has("take") || searchParams.has("skip");

  // Comportement historique, inchangé : liste courte utilisée pour l'état
  // global léger de l'app (tableau de bord, recherche ⌘K, badges de nav).
  if (!paginated) {
    const generations = await prisma.generation.findMany({
      select: SELECT,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(generations.map(mapGeneration));
  }

  // Pagination réelle pour l'historique complet (Historique) : au-delà de
  // 100 générations, la liste ci-dessus se tronque silencieusement — cette
  // route paginée permet d'en récupérer davantage, page par page.
  const take = Math.min(Math.max(parseInt(searchParams.get("take") || "50", 10) || 50, 1), 100);
  const skip = Math.max(parseInt(searchParams.get("skip") || "0", 10) || 0, 0);

  const [items, total] = await Promise.all([
    prisma.generation.findMany({
      select: SELECT,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.generation.count(),
  ]);

  return NextResponse.json({
    items: items.map(mapGeneration),
    total,
    hasMore: skip + items.length < total,
  });
}
