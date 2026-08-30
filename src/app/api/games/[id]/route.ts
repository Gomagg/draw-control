import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = authFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const game = await prisma.gameDefinition.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { tickets: true, draws: true, riskAlerts: true } },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error("Game get error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const existing = await prisma.gameDefinition.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const { name, type, config, riskThreshold, description, status } =
      await req.json();

    const game = await prisma.gameDefinition.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(config !== undefined && { config }),
        ...(riskThreshold !== undefined && { riskThreshold }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "GameDefinition",
        entityId: game.id,
        data: { before: existing, after: game },
        userId: auth.sub,
      },
    });

    return NextResponse.json({ game });
  } catch (error) {
    console.error("Game update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = authFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.gameDefinition.findUnique({
      where: { id: params.id },
      include: { _count: { select: { tickets: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (existing._count.tickets > 0) {
      return NextResponse.json(
        { error: "Cannot delete game with existing tickets" },
        { status: 409 }
      );
    }

    await prisma.gameDefinition.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: {
        action: "DELETE",
        entity: "GameDefinition",
        entityId: params.id,
        data: existing,
        userId: auth.sub,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Game delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
