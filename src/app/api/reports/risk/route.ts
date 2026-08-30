import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = authFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPER_ADMIN", "RISK_ANALYST", "AUDITOR"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const games = await prisma.gameDefinition.findMany({
      where: { status: { in: ["ACTIVE", "INACTIVE"] } },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        riskThreshold: true,
      },
    });

    const exposure = await Promise.all(
      games.map(async (game) => {
        const ticketAgg = await prisma.ticket.aggregate({
          where: {
            gameId: game.id,
            status: { in: ["CONFIRMED", "PRINTED"] },
          },
          _sum: { amount: true },
          _count: true,
        });

        const pendingWinAgg = await prisma.ticket.aggregate({
          where: {
            gameId: game.id,
            status: "WIN",
          },
          _sum: { payoutAmount: true },
          _count: true,
        });

        const totalSalesAgg = await prisma.ticket.aggregate({
          where: { gameId: game.id },
          _sum: { amount: true },
        });

        const recentAlerts = await prisma.riskAlert.findMany({
          where: { gameId: game.id },
          orderBy: { createdAt: "desc" },
          take: 5,
        });

        const currentLiability = ticketAgg._sum.amount || 0;
        const pendingPayouts = pendingWinAgg._sum.payoutAmount || 0;
        const totalSales = totalSalesAgg._sum.amount || 0;
        const threshold = game.riskThreshold;
        const utilizationPercent =
          threshold > 0 ? (currentLiability / threshold) * 100 : 0;

        return {
          gameId: game.id,
          gameName: game.name,
          gameType: game.type,
          gameStatus: game.status,
          currentLiability,
          pendingPayouts,
          totalSales,
          threshold,
          utilizationPercent: Math.round(utilizationPercent * 100) / 100,
          activeTickets: ticketAgg._count,
          pendingWinTickets: pendingWinAgg._count,
          recentAlerts,
          riskLevel:
            utilizationPercent >= 95
              ? "CRITICAL"
              : utilizationPercent >= 80
                ? "BREACH"
                : utilizationPercent >= 60
                  ? "WARNING"
                  : "NORMAL",
        };
      })
    );

    const totalLiability = exposure.reduce(
      (sum, e) => sum + e.currentLiability,
      0
    );
    const totalPendingPayouts = exposure.reduce(
      (sum, e) => sum + e.pendingPayouts,
      0
    );

    return NextResponse.json({
      exposure,
      summary: {
        totalLiability,
        totalPendingPayouts,
        gamesAtRisk: exposure.filter((e) => e.riskLevel !== "NORMAL").length,
        totalGames: exposure.length,
      },
    });
  } catch (error) {
    console.error("Risk report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
