import crypto from "crypto";

export function chainHash(payload: string, prevHash: string): string {
  return crypto.createHash("sha256").update(payload + prevHash).digest("hex").slice(0, 16);
}

export function hashTicket(data: Record<string, unknown>, prevHash: string): string {
  return chainHash(JSON.stringify(data), prevHash);
}

export function generateTicketNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TKT-${ts}-${rnd}`;
}