import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authFromRequest } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = authFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPER_ADMIN", "AGENCY_ADMIN"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const game = await prisma.gameDefinition.findUnique({
      where: { id: params.id },
    });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const newStatus = game.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    const updated = await prisma.gameDefinition.update({
      where: { id: params.id },
      data: { status: newStatus },
    });

    await prisma.auditLog.create({
      data: {
        action: "TOGGLE_STATUS",
        entity: "GameDefinition",
        entityId: params.id,
        data: { from: game.status, to: newStatus },
        userId: auth.sub,
      },
    });

    return NextResponse.json({ game: updated });
  } catch (error) {
    console.error("Game toggle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
