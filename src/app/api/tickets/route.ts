import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authFromRequest } from "@/lib/auth";
import { hashTicket, generateTicketNumber } from "@/lib/hash";

export async function GET(req: NextRequest) {
  try {
    const auth = authFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get("gameId");
    const status = searchParams.get("status");
    const terminalId = searchParams.get("terminalId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: Record<string, unknown> = {};
    if (gameId) where.gameId = gameId;
    if (status) where.status = status;

    if (auth.role === "CASHIER" && auth.terminalId) {
      where.terminalId = auth.terminalId;
    } else if (auth.role === "TERMINAL_SUPERVISOR" && auth.terminalId) {
      where.terminalId = auth.terminalId;
    } else if (auth.role === "AGENCY_ADMIN" && auth.agencyId) {
      where.terminal = { agencyId: auth.agencyId };
    } else if (terminalId) {
      where.terminalId = terminalId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo + "T23:59:59.999Z") }),
      };
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          game: { select: { id: true, name: true, type: true } },
          terminal: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ]);

    return NextResponse.json({
      tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Tickets list error:", error);
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

    if (!["CASHIER", "SUPER_ADMIN"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { gameId, terminalId, selections, amount } = await req.json();

    if (!gameId || !terminalId || !selections || amount === undefined) {
      return NextResponse.json(
        { error: "gameId, terminalId, selections, and amount are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be positive" },
        { status: 400 }
      );
    }

    const game = await prisma.gameDefinition.findUnique({
      where: { id: gameId },
    });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (game.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Game is not active" },
        { status: 409 }
      );
    }

    const terminal = await prisma.terminal.findUnique({
      where: { id: terminalId },
    });
    if (!terminal) {
      return NextResponse.json(
        { error: "Terminal not found" },
        { status: 404 }
      );
    }

    const config = game.config as Record<string, unknown>;
    const maxAmount = (config as { maxAmount?: number })?.maxAmount;
    if (maxAmount && amount > maxAmount) {
      return NextResponse.json(
        { error: `Amount exceeds maximum of ${maxAmount}` },
        { status: 400 }
      );
    }

    const lastTicket = await prisma.ticket.findFirst({
      orderBy: { createdAt: "desc" },
      select: { hash: true },
    });
    const prevHash = lastTicket?.hash || "0000000000000000";

    const ticketNumber = generateTicketNumber();
    const ticketData = {
      ticketNumber,
      gameId,
      terminalId,
      userId: auth.sub,
      selections,
      amount,
    };

    const hash = hashTicket(ticketData, prevHash);

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        selections,
        amount,
        status: "CONFIRMED",
        hash,
        prevHash,
        gameId,
        terminalId,
        userId: auth.sub,
      },
      include: {
        game: { select: { id: true, name: true, type: true } },
        terminal: { select: { id: true, name: true, code: true } },
      },
    });

    await prisma.gameDefinition.update({
      where: { id: gameId },
      data: {
        riskThreshold: {
          decrement: amount,
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "SELL",
        entity: "Ticket",
        entityId: ticket.id,
        data: { ticketNumber, amount, gameId, terminalId },
        userId: auth.sub,
      },
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error("Ticket sell error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
