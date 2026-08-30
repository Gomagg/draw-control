import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authFromRequest } from "@/lib/auth";

function calculateWinnings(
  ticketSelections: number[],
  drawNumbers: number[],
  amount: number,
  gameConfig: Record<string, unknown>
): number {
  const config = gameConfig as {
    prizeTiers?: { matches: number; multiplier: number }[];
  };
  const prizeTiers = config.prizeTiers || [];

  const matching = ticketSelections.filter((n) => drawNumbers.includes(n)).length;

  if (matching === 0) return 0;

  for (const tier of prizeTiers) {
    if (matching >= tier.matches) {
      return amount * tier.multiplier;
    }
  }

  if (matching >= 3) {
    return amount * matching;
  }

  return 0;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = authFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPER_ADMIN"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const draw = await prisma.draw.findUnique({
      where: { id: params.id },
      include: { game: true },
    });

    if (!draw) {
      return NextResponse.json({ error: "Draw not found" }, { status: 404 });
    }

    if (draw.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Draw already processed" },
        { status: 409 }
      );
    }

    await prisma.draw.update({
      where: { id: params.id },
      data: { status: "PROCESSING" },
    });

    const drawNumbers = draw.numbers as number[];
    const gameConfig = draw.game.config as Record<string, unknown>;

    const tickets = await prisma.ticket.findMany({
      where: {
        gameId: draw.gameId,
        status: { in: ["CONFIRMED", "PRINTED"] },
      },
    });

    let totalWins = 0;
    let totalPayout = 0;
    const winResults: {
      ticketId: string;
      prizeAmount: number;
      drawId: string;
    }[] = [];

    for (const ticket of tickets) {
      const selections = ticket.selections as number[];
      const prizeAmount = calculateWinnings(
        selections,
        drawNumbers,
        ticket.amount,
        gameConfig
      );

      if (prizeAmount > 0) {
        totalWins++;
        totalPayout += prizeAmount;

        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: "WIN", payoutAmount: prizeAmount },
        });

        winResults.push({
          ticketId: ticket.id,
          prizeAmount,
          drawId: draw.id,
        });
      } else {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: "LOSS" },
        });
      }
    }

    if (winResults.length > 0) {
      await prisma.winResult.createMany({ data: winResults });
    }

    const updated = await prisma.draw.update({
      where: { id: params.id },
      data: {
        status: "COMPLETED",
        drawnAt: new Date(),
        resultsHash: JSON.stringify({
          drawNumbers,
          totalTickets: tickets.length,
          totalWins,
          totalPayout,
        }),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "PROCESS",
        entity: "Draw",
        entityId: draw.id,
        data: {
          drawNumber: draw.drawNumber,
          totalTickets: tickets.length,
          totalWins,
          totalPayout,
        },
        userId: auth.sub,
      },
    });

    return NextResponse.json({
      draw: updated,
      results: {
        totalTickets: tickets.length,
        totalWins,
        totalPayout,
      },
    });
  } catch (error) {
    console.error("Draw process error:", error);

    await prisma.draw.update({
      where: { id: params.id },
      data: { status: "OPEN" },
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
