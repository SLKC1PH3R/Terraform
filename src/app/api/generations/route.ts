import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const generations = await prisma.generation.findMany({
    include: { template: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(generations);
}
