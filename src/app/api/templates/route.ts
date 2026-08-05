import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const templates = await prisma.template.findMany({
    include: { variables: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, category, description, tfContent, variables } = body;

  if (!name || !category) {
    return NextResponse.json({ error: "name et category sont requis" }, { status: 400 });
  }

  const template = await prisma.template.create({
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
          order: i,
          group: v.group || null,
        })),
      },
    },
    include: { variables: true },
  });

  return NextResponse.json(template, { status: 201 });
}
