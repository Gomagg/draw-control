import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  agencyId?: string;
  terminalId?: string;
}

export function signAccess(p: TokenPayload) {
  return jwt.sign(p, SECRET, { expiresIn: "15m" });
}

export function signRefresh(p: TokenPayload) {
  return jwt.sign(p, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccess(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload;
}

export function verifyRefresh(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}

export function authFromRequest(req: Request): TokenPayload | null {
  const h = req.headers.get("authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!t) return null;
  try { return verifyAccess(t); } catch { return null; }
}