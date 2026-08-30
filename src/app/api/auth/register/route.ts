import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAccess, signRefresh } from "@/lib/auth";
import { hashSync } from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
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

    const passwordHash = hashSync(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role || "CASHIER",
        agencyId: agencyId || null,
        terminalId: terminalId || null,
      },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId ?? undefined,
      terminalId: user.terminalId ?? undefined,
    };

    const token = signAccess(payload);
    const refreshToken = signRefresh(payload);

    await prisma.session.create({
      data: {
        token,
        refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: user.agencyId,
        terminalId: user.terminalId,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
