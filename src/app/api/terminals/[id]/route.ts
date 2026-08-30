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

    const terminal = await prisma.terminal.findUnique({
      where: { id: params.id },
      include: {
        agency: { select: { id: true, name: true, code: true } },
        _count: { select: { tickets: true } },
      },
    });

    if (!terminal) {
      return NextResponse.json(
        { error: "Terminal not found" },
        { status: 404 }
      );
    }

    if (
      auth.role === "AGENCY_ADMIN" &&
      auth.agencyId !== terminal.agencyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ terminal });
  } catch (error) {
    console.error("Terminal get error:", error);
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

    const existing = await prisma.terminal.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Terminal not found" },
        { status: 404 }
      );
    }

    if (
      auth.role === "AGENCY_ADMIN" &&
      auth.agencyId !== existing.agencyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const {
      name,
      code,
      status,
      geoLocked,
      geoLat,
      geoLng,
      ipAddress,
      offlineMode,
    } = await req.json();

    if (code && code !== existing.code) {
      const duplicate = await prisma.terminal.findUnique({ where: { code } });
      if (duplicate) {
        return NextResponse.json(
          { error: "Terminal code already exists" },
          { status: 409 }
        );
      }
    }

    const terminal = await prisma.terminal.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(status !== undefined && { status }),
        ...(geoLocked !== undefined && { geoLocked }),
        ...(geoLat !== undefined && { geoLat: geoLat || null }),
        ...(geoLng !== undefined && { geoLng: geoLng || null }),
        ...(ipAddress !== undefined && { ipAddress: ipAddress || null }),
        ...(offlineMode !== undefined && { offlineMode }),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "Terminal",
        entityId: terminal.id,
        data: { before: existing, after: terminal },
        userId: auth.sub,
      },
    });

    return NextResponse.json({ terminal });
  } catch (error) {
    console.error("Terminal update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = authFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.terminal.findUnique({
      where: { id: params.id },
      include: { _count: { select: { tickets: true } } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Terminal not found" },
        { status: 404 }
      );
    }

    if (existing._count.tickets > 0) {
      return NextResponse.json(
        { error: "Cannot delete terminal with existing tickets" },
        { status: 409 }
      );
    }

    await prisma.terminal.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: {
        action: "DELETE",
        entity: "Terminal",
        entityId: params.id,
        data: existing,
        userId: auth.sub,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Terminal delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
