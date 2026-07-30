import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const generation = await prisma.generation.findUnique({
    where: { id: params.id },
    include: { template: true },
  });

  if (!generation) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const safeName = generation.template.name.replace(/[^a-zA-Z0-9-_]/g, "_");

  return new NextResponse(generation.resultTfvars, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.auto.tfvars"`,
    },
  });
}
