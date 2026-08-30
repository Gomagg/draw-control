import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = authFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const agencyId = searchParams.get("agencyId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    if (auth.role === "AGENCY_ADMIN" && auth.agencyId) {
      where.agencyId = auth.agencyId;
    } else if (auth.role === "TERMINAL_SUPERVISOR" && auth.terminalId) {
      where.id = auth.terminalId;
    } else if (agencyId) {
      where.agencyId = agencyId;
    }

    const terminals = await prisma.terminal.findMany({
      where,
      include: {
        agency: { select: { id: true, name: true, code: true } },
        _count: { select: { tickets: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ terminals });
  } catch (error) {
    console.error("Terminals list error:", error);
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

    if (!["SUPER_ADMIN", "AGENCY_ADMIN"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, code, agencyId, geoLat, geoLng, ipAddress } =
      await req.json();

    if (!name || !code || !agencyId) {
      return NextResponse.json(
        { error: "Name, code, and agencyId are required" },
        { status: 400 }
      );
    }

    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) {
      return NextResponse.json(
        { error: "Agency not found" },
        { status: 404 }
      );
    }

    const existing = await prisma.terminal.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: "Terminal code already exists" },
        { status: 409 }
      );
    }

    const terminal = await prisma.terminal.create({
      data: {
        name,
        code,
        agencyId,
        geoLat: geoLat || null,
        geoLng: geoLng || null,
        ipAddress: ipAddress || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "Terminal",
        entityId: terminal.id,
        data: terminal,
        userId: auth.sub,
      },
    });

    return NextResponse.json({ terminal }, { status: 201 });
  } catch (error) {
    console.error("Terminal create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
