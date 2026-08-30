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

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        game: { select: { id: true, name: true, type: true, config: true } },
        terminal: {
          select: { id: true, name: true, code: true, agencyId: true },
        },
        user: { select: { id: true, name: true, email: true } },
        winResults: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    if (
      auth.role === "CASHIER" &&
      auth.terminalId &&
      ticket.terminalId !== auth.terminalId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Ticket get error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
