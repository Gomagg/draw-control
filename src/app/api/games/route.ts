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
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const games = await prisma.gameDefinition.findMany({
      where,
      include: {
        _count: { select: { tickets: true, draws: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ games });
  } catch (error) {
    console.error("Games list error:", error);
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

    const { name, type, config, riskThreshold, description } =
      await req.json();

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.gameDefinition.findFirst({
      where: { name },
      orderBy: { version: "desc" },
    });

    const version = existing ? existing.version + 1 : 1;

    const game = await prisma.gameDefinition.create({
      data: {
        name,
        type,
        version,
        config: config || {},
        riskThreshold: riskThreshold || 50000,
        description: description || null,
        createdBy: auth.sub,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "GameDefinition",
        entityId: game.id,
        data: game,
        userId: auth.sub,
      },
    });

    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    console.error("Game create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
