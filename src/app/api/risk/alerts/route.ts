import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = authFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPER_ADMIN", "RISK_ANALYST"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get("gameId");
    const level = searchParams.get("level");
    const resolved = searchParams.get("resolved");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: Record<string, unknown> = {};
    if (gameId) where.gameId = gameId;
    if (level) where.level = level;
    if (resolved === "true") where.resolvedAt = { not: null };
    else if (resolved === "false") where.resolvedAt = null;

    const [alerts, total] = await Promise.all([
      prisma.riskAlert.findMany({
        where,
        include: {
          game: { select: { id: true, name: true, type: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.riskAlert.count({ where }),
    ]);

    return NextResponse.json({
      alerts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Risk alerts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
