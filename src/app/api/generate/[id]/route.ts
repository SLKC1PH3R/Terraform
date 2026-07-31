import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildTfvars, VariableForGeneration } from "@/lib/tfvars-generator";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const generation = await prisma.generation.findUnique({
    where: { id: params.id },
    include: { template: { include: { variables: { orderBy: { order: "asc" } } } } },
  });

  if (!generation) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    id: generation.id,
    fileName: generation.fileName,
    createdAt: generation.createdAt,
    template: generation.template,
    diff: JSON.parse(generation.diffJson),
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { variables } = body as { variables: VariableForGeneration[] };

  if (!variables) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const generation = await prisma.generation.findUnique({
    where: { id: params.id },
    include: { template: { select: { tfContent: true } } },
  });

  if (!generation) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const { content, diff } = buildTfvars(variables, generation.template.tfContent);

  const updated = await prisma.generation.update({
    where: { id: params.id },
    data: {
      resultTfvars: content,
      diffJson: JSON.stringify(diff),
    },
  });

  return NextResponse.json({ id: updated.id, content, diff });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.generation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
