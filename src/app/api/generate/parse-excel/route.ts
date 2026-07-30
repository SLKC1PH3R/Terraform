import { NextRequest, NextResponse } from "next/server";
import { parseFISExcel } from "@/lib/excel-parser";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const extracted = parseFISExcel(buffer);
    return NextResponse.json({ fileName: file.name, extracted });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Impossible de lire le fichier Excel : " + e.message },
      { status: 400 }
    );
  }
}
