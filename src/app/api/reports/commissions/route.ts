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
    const agencyId = searchParams.get("agencyId");

    const agencyWhere: Record<string, unknown> = {};
    if (auth.role === "AGENCY_ADMIN" && auth.agencyId) {
      agencyWhere.id = auth.agencyId;
    } else if (agencyId) {
      agencyWhere.id = agencyId;
    }

    const agencies = await prisma.agency.findMany({
      where: agencyWhere,
      select: { id: true, name: true, code: true, commission: true },
    });

    const ticketWhere: Record<string, unknown> = {
      status: { in: ["CONFIRMED", "PRINTED", "WIN", "SETTLED"] },
    };

    if (dateFrom || dateTo) {
      ticketWhere.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo + "T23:59:59.999Z") }),
      };
    }

    const commissions = await Promise.all(
      agencies.map(async (agency) => {
        const tickets = await prisma.ticket.findMany({
          where: {
            ...ticketWhere,
            terminal: { agencyId: agency.id },
          },
          select: { amount: true, payoutAmount: true },
        });

        const totalSales = tickets.reduce((sum, t) => sum + t.amount, 0);
        const totalPayout = tickets.reduce(
          (sum, t) => sum + (t.payoutAmount || 0),
          0
        );
        const netSales = totalSales - totalPayout;
        const commissionAmount = Math.max(0, netSales * (agency.commission / 100));

        return {
          agencyId: agency.id,
          agencyName: agency.name,
          agencyCode: agency.code,
          commissionRate: agency.commission,
          totalSales,
          totalPayout,
          netSales,
          commissionAmount,
          ticketCount: tickets.length,
        };
      })
    );

    const totalCommission = commissions.reduce(
      (sum, c) => sum + c.commissionAmount,
      0
    );

    return NextResponse.json({
      commissions,
      totalCommission,
    });
  } catch (error) {
    console.error("Commission report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
