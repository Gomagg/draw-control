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
    const status = searchParams.get("status");
    const parentId = searchParams.get("parentId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    if (auth.role === "AGENCY_ADMIN" && auth.agencyId) {
      where.id = auth.agencyId;
    } else if (parentId) {
      where.parentId = parentId;
    }

    const agencies = await prisma.agency.findMany({
      where,
      include: {
        _count: { select: { terminals: true, users: true, children: true } },
        parent: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ agencies });
  } catch (error) {
    console.error("Agencies list error:", error);
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

    if (!["SUPER_ADMIN"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, code, commission, salesLimit, parentId } = await req.json();

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.agency.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: "Agency code already exists" },
        { status: 409 }
      );
    }

    const agency = await prisma.agency.create({
      data: {
        name,
        code,
        commission: commission ?? 5.0,
        salesLimit: salesLimit ?? 100000,
        parentId: parentId || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "Agency",
        entityId: agency.id,
        data: agency,
        userId: auth.sub,
      },
    });

    return NextResponse.json({ agency }, { status: 201 });
  } catch (error) {
    console.error("Agency create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
