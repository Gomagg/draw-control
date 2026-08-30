import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = authFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get("gameId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: Record<string, unknown> = {};
    if (gameId) where.gameId = gameId;
    if (status) where.status = status;

    const [draws, total] = await Promise.all([
      prisma.draw.findMany({
        where,
        include: {
          game: { select: { id: true, name: true, type: true } },
          _count: { select: { winResults: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.draw.count({ where }),
    ]);

    return NextResponse.json({
      draws,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Draws list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = authFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPER_ADMIN", "AGENCY_ADMIN"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { gameId, numbers, drawNumber } = await req.json();

    if (!gameId || !numbers) {
      return NextResponse.json(
        { error: "gameId and numbers are required" },
        { status: 400 }
      );
    }

    const game = await prisma.gameDefinition.findUnique({
      where: { id: gameId },
    });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const autoDrawNumber =
      drawNumber || `DRW-${Date.now().toString(36).toUpperCase()}`;

    const draw = await prisma.draw.create({
      data: {
        drawNumber: autoDrawNumber,
        numbers,
        status: "OPEN",
        gameId,
        createdBy: auth.sub,
      },
      include: {
        game: { select: { id: true, name: true, type: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "Draw",
        entityId: draw.id,
        data: { drawNumber: autoDrawNumber, gameId, numbers },
        userId: auth.sub,
      },
    });

    return NextResponse.json({ draw }, { status: 201 });
  } catch (error) {
    console.error("Draw create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
