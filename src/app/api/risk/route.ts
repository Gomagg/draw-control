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

    const games = await prisma.gameDefinition.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        type: true,
        riskThreshold: true,
        config: true,
      },
    });

    const riskData = await Promise.all(
      games.map(async (game) => {
        const ticketAgg = await prisma.ticket.aggregate({
          where: {
            gameId: game.id,
            status: { in: ["CONFIRMED", "PRINTED"] },
          },
          _sum: { amount: true },
          _count: true,
        });

        const currentLiability = ticketAgg._sum.amount || 0;
        const threshold = game.riskThreshold;
        const usagePercent =
          threshold > 0 ? (currentLiability / threshold) * 100 : 0;

        let level: "NORMAL" | "WARNING" | "BREACH" | "CRITICAL" = "NORMAL";
        if (usagePercent >= 95) level = "CRITICAL";
        else if (usagePercent >= 80) level = "BREACH";
        else if (usagePercent >= 60) level = "WARNING";

        const alerts = await prisma.riskAlert.findMany({
          where: {
            gameId: game.id,
            resolvedAt: null,
          },
          orderBy: { createdAt: "desc" },
        });

        return {
          gameId: game.id,
          gameName: game.name,
          gameType: game.type,
          currentLiability,
          threshold,
          usagePercent: Math.round(usagePercent * 100) / 100,
          level,
          activeTickets: ticketAgg._count,
          alerts,
        };
      })
    );

    return NextResponse.json({ risk: riskData });
  } catch (error) {
    console.error("Risk status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
