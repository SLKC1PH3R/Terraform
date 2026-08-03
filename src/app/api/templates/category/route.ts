import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Nombre de templates utilisant une catégorie donnée — utilisé pour savoir
 * si elle peut être supprimée sans orpheliner des templates. */
export async function GET(req: NextRequest) {
  const category = (req.nextUrl.searchParams.get("category") || "").trim();
  if (!category) {
    return NextResponse.json({ error: "Paramètre manquant" }, { status: 400 });
  }

  const count = await prisma.template.count({ where: { category } });
  return NextResponse.json({ count });
}

/** Renomme une catégorie : met à jour tous les templates qui utilisent
 * l'ancienne valeur pour qu'ils pointent vers la nouvelle. */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const from = (body.from || "").trim();
  const to = (body.to || "").trim();

  if (!from || !to) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  if (from === to) {
    return NextResponse.json({ updated: 0 });
  }

  const result = await prisma.template.updateMany({
    where: { category: from },
    data: { category: to },
  });

  return NextResponse.json({ updated: result.count });
}
