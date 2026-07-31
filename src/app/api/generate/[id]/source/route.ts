import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const generation = await prisma.generation.findUnique({
    where: { id: params.id },
    select: { fileName: true, sourceFileData: true, sourceFileMime: true },
  });

  if (!generation || !generation.sourceFileData) {
    return NextResponse.json({ error: "Fichier source introuvable" }, { status: 404 });
  }

  const safeName = generation.fileName.replace(/[^a-zA-Z0-9-_.]/g, "_");

  return new NextResponse(new Uint8Array(generation.sourceFileData), {
    headers: {
      "Content-Type": generation.sourceFileMime || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}"`,
    },
  });
}
