import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
