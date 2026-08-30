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

    if (auth.role === "AGENCY_ADMIN" && auth.agencyId !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const agency = await prisma.agency.findUnique({
      where: { id: params.id },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: { select: { id: true, name: true, code: true, status: true } },
        _count: { select: { terminals: true, users: true } },
      },
    });

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    return NextResponse.json({ agency });
  } catch (error) {
    console.error("Agency get error:", error);
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

    const existing = await prisma.agency.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    const { name, code, commission, salesLimit, status, parentId } =
      await req.json();

    if (code && code !== existing.code) {
      const duplicate = await prisma.agency.findUnique({ where: { code } });
      if (duplicate) {
        return NextResponse.json(
          { error: "Agency code already exists" },
          { status: 409 }
        );
      }
    }

    const agency = await prisma.agency.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(commission !== undefined && { commission }),
        ...(salesLimit !== undefined && { salesLimit }),
        ...(status !== undefined && { status }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "Agency",
        entityId: agency.id,
        data: { before: existing, after: agency },
        userId: auth.sub,
      },
    });

    return NextResponse.json({ agency });
  } catch (error) {
    console.error("Agency update error:", error);
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

    const existing = await prisma.agency.findUnique({
      where: { id: params.id },
      include: { _count: { select: { terminals: true, users: true, children: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    if (
      existing._count.terminals > 0 ||
      existing._count.users > 0 ||
      existing._count.children > 0
    ) {
      return NextResponse.json(
        { error: "Cannot delete agency with existing relations" },
        { status: 409 }
      );
    }

    await prisma.agency.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: {
        action: "DELETE",
        entity: "Agency",
        entityId: params.id,
        data: existing,
        userId: auth.sub,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Agency delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
