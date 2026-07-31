import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const generations = await prisma.generation.findMany({
    select: {
      id: true,
      fileName: true,
      createdAt: true,
      sourceFileMime: true,
      template: { select: { id: true, name: true, category: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const result = generations.map((g) => ({
    id: g.id,
    fileName: g.fileName,
    createdAt: g.createdAt,
    template: g.template,
    hasSourceFile: !!g.sourceFileMime,
  }));

  return NextResponse.json(result);
}
