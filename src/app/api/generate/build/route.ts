import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildTfvars, VariableForGeneration } from "@/lib/tfvars-generator";
import { buildStorageAccountTfvars, isStorageAccountTemplate } from "@/lib/storage-account-generator";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { templateId, fileName, variables, extracted, sourceFileBase64, sourceFileMime } = body as {
    templateId: string;
    fileName: string;
    variables?: VariableForGeneration[];
    extracted?: { key: string; value: string }[];
    sourceFileBase64?: string;
    sourceFileMime?: string;
  };

  if (!templateId || (!variables && !extracted)) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { tfContent: true },
  });

  let content: string;
  let diff: ReturnType<typeof buildTfvars>["diff"];

  if (isStorageAccountTemplate(template?.tfContent) && extracted) {
    content = buildStorageAccountTfvars(template!.tfContent!, extracted);
    diff = [];
  } else {
    if (!variables) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }
    ({ content, diff } = buildTfvars(variables, template?.tfContent));
  }

  const generation = await prisma.generation.create({
    data: {
      templateId,
      fileName: fileName || "fiche.xlsx",
      resultTfvars: content,
      diffJson: JSON.stringify(diff),
      sourceFileData: sourceFileBase64 ? Buffer.from(sourceFileBase64, "base64") : undefined,
      sourceFileMime: sourceFileBase64 ? sourceFileMime || "application/octet-stream" : undefined,
    },
  });

  return NextResponse.json({ id: generation.id, content, diff });
}
