import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildTfvars, VariableForGeneration } from "@/lib/tfvars-generator";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { templateId, fileName, variables } = body as {
    templateId: string;
    fileName: string;
    variables: VariableForGeneration[];
  };

  if (!templateId || !variables) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { tfContent: true },
  });

  const { content, diff } = buildTfvars(variables, template?.tfContent);

  const generation = await prisma.generation.create({
    data: {
      templateId,
      fileName: fileName || "fiche.xlsx",
      resultTfvars: content,
      diffJson: JSON.stringify(diff),
    },
  });

  return NextResponse.json({ id: generation.id, content, diff });
}
