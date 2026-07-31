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

  // Le fichier est nommé d'après la valeur de la variable "env" du .tfvars
  // généré (ex. env = "ppd" -> ppd.tfvars) ; à défaut, on retombe sur le nom
  // du template.
  const envMatch = generation.resultTfvars.match(/^env\s*=\s*"([^"]*)"\s*$/m);
  const safeName = (envMatch?.[1] || generation.template.name).replace(/[^a-zA-Z0-9-_]/g, "_");
  const fileName = envMatch ? `${safeName}.tfvars` : `${safeName}.auto.tfvars`;

  return new NextResponse(generation.resultTfvars, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
