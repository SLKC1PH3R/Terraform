import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const template = await prisma.template.findUnique({
    where: { id: params.id },
    include: { variables: { orderBy: { order: "asc" } } },
  });
  if (!template) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(template);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, category, description, tfContent, variables } = body;

  // Remplace entièrement les variables (simple et sûr pour un outil interne)
  await prisma.templateVariable.deleteMany({ where: { templateId: params.id } });

  const template = await prisma.template.update({
    where: { id: params.id },
    data: {
      name,
      category,
      description: description || null,
      tfContent: tfContent || null,
      variables: {
        create: (variables || []).map((v: any, i: number) => ({
          name: v.name,
          type: v.type || "string",
          defaultValue: v.defaultValue ?? "",
          description: v.description || null,
          required: !!v.required,
          order: i,
          group: v.group || null,
        })),
      },
    },
    include: { variables: true },
  });

  return NextResponse.json(template);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.template.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
