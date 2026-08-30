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

    if (!["SUPER_ADMIN", "AGENCY_ADMIN"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        agencyId: true,
        terminalId: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        agency: { select: { id: true, name: true, code: true } },
        _count: { select: { tickets: true, auditLogs: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      auth.role === "AGENCY_ADMIN" &&
      auth.agencyId !== user.agencyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("User get error:", error);
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

    const existing = await prisma.user.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      auth.role === "AGENCY_ADMIN" &&
      auth.agencyId !== existing.agencyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, role, isActive, agencyId, terminalId } = await req.json();

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(agencyId !== undefined && { agencyId: agencyId || null }),
        ...(terminalId !== undefined && { terminalId: terminalId || null }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        agencyId: true,
        terminalId: true,
        updatedAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "User",
        entityId: user.id,
        data: { before: existing, after: user },
        userId: auth.sub,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("User update error:", error);
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

    const existing = await prisma.user.findUnique({
      where: { id: params.id },
      include: { _count: { select: { tickets: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (existing.id === auth.sub) {
      return NextResponse.json(
        { error: "Cannot delete yourself" },
        { status: 409 }
      );
    }

    if (existing._count.tickets > 0) {
      await prisma.user.update({
        where: { id: params.id },
        data: { isActive: false },
      });

      return NextResponse.json({
        ok: true,
        message: "User deactivated (has ticket history)",
      });
    }

    await prisma.user.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: {
        action: "DELETE",
        entity: "User",
        entityId: params.id,
        data: existing,
        userId: auth.sub,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("User delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
