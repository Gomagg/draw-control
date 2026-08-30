import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authFromRequest } from "@/lib/auth";

const CANCELLATION_WINDOW_MS = 5 * 60 * 1000;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = authFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["CASHIER", "SUPER_ADMIN", "AGENCY_ADMIN"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    if (auth.role === "CASHIER" && auth.terminalId !== ticket.terminalId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (ticket.status !== "CONFIRMED" && ticket.status !== "PRINTED") {
      return NextResponse.json(
        { error: `Cannot cancel ticket in ${ticket.status} status` },
        { status: 409 }
      );
    }

    const elapsed = Date.now() - ticket.createdAt.getTime();
    if (elapsed > CANCELLATION_WINDOW_MS) {
      return NextResponse.json(
        { error: "Cancellation window has expired (5 minutes)" },
        { status: 409 }
      );
    }

    const { reason } = await req.json().catch(() => ({}));

    const cancelled = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason || "Cancelled by user",
      },
    });

    await prisma.gameDefinition.update({
      where: { id: ticket.gameId },
      data: {
        riskThreshold: {
          increment: ticket.amount,
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CANCEL",
        entity: "Ticket",
        entityId: ticket.id,
        data: { ticketNumber: ticket.ticketNumber, reason },
        userId: auth.sub,
      },
    });

    return NextResponse.json({ ticket: cancelled });
  } catch (error) {
    console.error("Ticket cancel error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
