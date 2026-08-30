import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authFromRequest } from "@/lib/auth";
import { hashSync } from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const auth = authFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPER_ADMIN", "AGENCY_ADMIN"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const agencyId = searchParams.get("agencyId");
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (isActive !== null) where.isActive = isActive === "true";

    if (auth.role === "AGENCY_ADMIN" && auth.agencyId) {
      where.agencyId = auth.agencyId;
    } else if (agencyId) {
      where.agencyId = agencyId;
    }

    const users = await prisma.user.findMany({
      where,
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
        agency: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Users list error:", error);
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

    const { email, password, name, role, agencyId, terminalId } =
      await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    if (auth.role === "AGENCY_ADMIN" && role !== "CASHIER" && role !== "TERMINAL_SUPERVISOR") {
      return NextResponse.json(
        { error: "Agency admins can only create cashiers and supervisors" },
        { status: 403 }
      );
    }

    const finalAgencyId =
      auth.role === "AGENCY_ADMIN" ? auth.agencyId : agencyId || null;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashSync(password, 12),
        name,
        role: role || "CASHIER",
        agencyId: finalAgencyId,
        terminalId: terminalId || null,
        invitedById: auth.sub,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        agencyId: true,
        terminalId: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "User",
        entityId: user.id,
        data: { email, name, role: user.role },
        userId: auth.sub,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("User create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
