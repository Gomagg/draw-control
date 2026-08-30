import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = authFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPER_ADMIN", "AGENCY_ADMIN", "AUDITOR"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const groupBy = searchParams.get("groupBy") || "day";
    const gameId = searchParams.get("gameId");
    const agencyId = searchParams.get("agencyId");
    const terminalId = searchParams.get("terminalId");

    const where: Record<string, unknown> = {
      status: { in: ["CONFIRMED", "PRINTED", "WIN", "SETTLED"] },
    };

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo + "T23:59:59.999Z") }),
      };
    }

    if (gameId) where.gameId = gameId;
    if (terminalId) where.terminalId = terminalId;

    if (auth.role === "AGENCY_ADMIN" && auth.agencyId) {
      where.terminal = { agencyId: auth.agencyId };
    } else if (agencyId) {
      where.terminal = { agencyId };
    }

    const tickets = await prisma.ticket.findMany({
      where,
      select: {
        id: true,
        amount: true,
        payoutAmount: true,
        status: true,
        createdAt: true,
        gameId: true,
        terminalId: true,
        game: { select: { id: true, name: true, type: true } },
        terminal: {
          select: {
            id: true,
            name: true,
            agencyId: true,
            agency: { select: { id: true, name: true, commission: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const grouped: Record<
      string,
      {
        totalSales: number;
        totalPayout: number;
        totalTickets: number;
        wins: number;
        losses: number;
      }
    > = {};

    for (const ticket of tickets) {
      let key: string;
      const date = new Date(ticket.createdAt);

      if (groupBy === "game") {
        key = ticket.game.name;
      } else if (groupBy === "agency") {
        key = ticket.terminal?.agency?.name || "Unknown";
      } else if (groupBy === "terminal") {
        key = ticket.terminal?.name || "Unknown";
      } else {
        key = date.toISOString().split("T")[0];
      }

      if (!grouped[key]) {
        grouped[key] = {
          totalSales: 0,
          totalPayout: 0,
          totalTickets: 0,
          wins: 0,
          losses: 0,
        };
      }

      grouped[key].totalSales += ticket.amount;
      grouped[key].totalPayout += ticket.payoutAmount || 0;
      grouped[key].totalTickets += 1;
      if (ticket.status === "WIN") grouped[key].wins += 1;
      else grouped[key].losses += 1;
    }

    const totalSales = tickets.reduce((sum, t) => sum + t.amount, 0);
    const totalPayout = tickets.reduce(
      (sum, t) => sum + (t.payoutAmount || 0),
      0
    );

    return NextResponse.json({
      summary: {
        totalSales,
        totalPayout,
        netRevenue: totalSales - totalPayout,
        totalTickets: tickets.length,
        winRate:
          tickets.length > 0
            ? Math.round(
                (tickets.filter((t) => t.status === "WIN").length /
                  tickets.length) *
                  10000
              ) / 100
            : 0,
      },
      grouped,
    });
  } catch (error) {
    console.error("Sales report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
