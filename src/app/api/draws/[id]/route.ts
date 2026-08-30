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

    const draw = await prisma.draw.findUnique({
      where: { id: params.id },
      include: {
        game: { select: { id: true, name: true, type: true, config: true } },
        winResults: {
          include: {
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                selections: true,
                amount: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!draw) {
      return NextResponse.json({ error: "Draw not found" }, { status: 404 });
    }

    return NextResponse.json({ draw });
  } catch (error) {
    console.error("Draw get error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = authFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPER_ADMIN", "AGENCY_ADMIN"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.draw.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Draw not found" }, { status: 404 });
    }

    if (existing.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Cannot modify a completed draw" },
        { status: 409 }
      );
    }

    const { numbers, status, drawnAt } = await req.json();

    const draw = await prisma.draw.update({
      where: { id: params.id },
      data: {
        ...(numbers !== undefined && { numbers }),
        ...(status !== undefined && { status }),
        ...(drawnAt !== undefined && { drawnAt: new Date(drawnAt) }),
      },
    });

    return NextResponse.json({ draw });
  } catch (error) {
    console.error("Draw update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
