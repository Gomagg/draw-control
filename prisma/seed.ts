import { PrismaClient, Role, AgencyStatus, TerminalStatus, PrinterStatus, GameType, GameStatus, TicketStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // Clean existing data (order matters for foreign keys)
  console.log("🗑  Cleaning existing data...");
  await prisma.winResult.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.riskAlert.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.draw.deleteMany();
  await prisma.gameDefinition.deleteMany();
  await prisma.terminal.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agency.deleteMany();
  console.log("✅ Data cleaned\n");

  // ─── Agencies ─────────────────────────────────────────────
  console.log("🏢 Creating agencies...");
  const lagosAgency = await prisma.agency.create({
    data: {
      name: "Lagos Central Agency",
      code: "LAG-001",
      commission: 8.0,
      salesLimit: 50000,
      status: AgencyStatus.ACTIVE,
    },
  });
  console.log(`  ✅ ${lagosAgency.name} (${lagosAgency.code})`);

  const abujaAgency = await prisma.agency.create({
    data: {
      name: "Abuja North Agency",
      code: "ABJ-001",
      commission: 6.5,
      salesLimit: 25000,
      status: AgencyStatus.ACTIVE,
    },
  });
  console.log(`  ✅ ${abujaAgency.name} (${abujaAgency.code})`);

  const kanoAgency = await prisma.agency.create({
    data: {
      name: "Kano West Agency",
      code: "KAN-001",
      commission: 7.0,
      salesLimit: 30000,
      status: AgencyStatus.ACTIVE,
    },
  });
  console.log(`  ✅ ${kanoAgency.name} (${kanoAgency.code})\n`);

  // ─── Terminals ────────────────────────────────────────────
  console.log("🖥️  Creating terminals...");
  const terminal04 = await prisma.terminal.create({
    data: {
      name: "Terminal 04 — Ikeja",
      code: "LAG-T04",
      status: TerminalStatus.ONLINE,
      printerStatus: PrinterStatus.OK,
      agencyId: lagosAgency.id,
      ipAddress: "192.168.1.104",
      geoLat: 6.6059,
      geoLng: 3.3495,
    },
  });
  console.log(`  ✅ ${terminal04.name} (${terminal04.code})`);

  const terminal07 = await prisma.terminal.create({
    data: {
      name: "Terminal 07 — Yaba",
      code: "LAG-T07",
      status: TerminalStatus.ONLINE,
      printerStatus: PrinterStatus.LOW_PAPER,
      agencyId: lagosAgency.id,
      ipAddress: "192.168.1.107",
      geoLat: 6.5158,
      geoLng: 3.3898,
    },
  });
  console.log(`  ✅ ${terminal07.name} (${terminal07.code})`);

  const terminal02 = await prisma.terminal.create({
    data: {
      name: "Terminal 02 — Wuse",
      code: "ABJ-T02",
      status: TerminalStatus.ONLINE,
      printerStatus: PrinterStatus.OK,
      agencyId: abujaAgency.id,
      ipAddress: "192.168.2.102",
      geoLat: 9.0579,
      geoLng: 7.4951,
    },
  });
  console.log(`  ✅ ${terminal02.name} (${terminal02.code})`);

  const terminal01 = await prisma.terminal.create({
    data: {
      name: "Terminal 01 — Kano City",
      code: "KAN-T01",
      status: TerminalStatus.OFFLINE,
      printerStatus: PrinterStatus.OK,
      agencyId: kanoAgency.id,
      ipAddress: "192.168.3.101",
      geoLat: 12.0022,
      geoLng: 8.5920,
    },
  });
  console.log(`  ✅ ${terminal01.name} (${terminal01.code})\n`);

  // ─── Users ────────────────────────────────────────────────
  console.log("👤 Creating users...");
  const passwordHash = await hash("admin123", 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: "super@drawcontrol.com",
      passwordHash,
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
    },
  });
  console.log(`  ✅ ${superAdmin.name} (${superAdmin.email})`);

  const agencyAdmin = await prisma.user.create({
    data: {
      email: "agency@drawcontrol.com",
      passwordHash,
      name: "Agency Admin",
      role: Role.AGENCY_ADMIN,
      agencyId: lagosAgency.id,
    },
  });
  console.log(`  ✅ ${agencyAdmin.name} (${agencyAdmin.email})`);

  const supervisor = await prisma.user.create({
    data: {
      email: "supervisor@drawcontrol.com",
      passwordHash,
      name: "Terminal Supervisor",
      role: Role.TERMINAL_SUPERVISOR,
      agencyId: lagosAgency.id,
    },
  });
  console.log(`  ✅ ${supervisor.name} (${supervisor.email})`);

  const cashier = await prisma.user.create({
    data: {
      email: "cashier@drawcontrol.com",
      passwordHash,
      name: "Cashier",
      role: Role.CASHIER,
      agencyId: lagosAgency.id,
      terminalId: terminal04.id,
    },
  });
  console.log(`  ✅ ${cashier.name} (${cashier.email})`);

  const riskAnalyst = await prisma.user.create({
    data: {
      email: "risk@drawcontrol.com",
      passwordHash,
      name: "Risk Analyst",
      role: Role.RISK_ANALYST,
    },
  });
  console.log(`  ✅ ${riskAnalyst.name} (${riskAnalyst.email})`);

  const auditor = await prisma.user.create({
    data: {
      email: "auditor@drawcontrol.com",
      passwordHash,
      name: "Auditor",
      role: Role.AUDITOR,
    },
  });
  console.log(`  ✅ ${auditor.name} (${auditor.email})\n`);

  // ─── Games ────────────────────────────────────────────────
  console.log("🎮 Creating games...");

  const keno = await prisma.gameDefinition.create({
    data: {
      name: "Lucky 6 Keno",
      type: GameType.KENO,
      version: 3,
      status: GameStatus.ACTIVE,
      riskThreshold: 12000,
      description: "Pick up to 10 numbers from 1-80. Draw every 5 minutes. Match 6 to win the top prize.",
      createdBy: superAdmin.id,
      config: {
        numbersToPick: 6,
        maxNumber: 80,
        drawInterval: "5min",
        ticketPrice: 2,
        prizeTiers: [
          { match: 6, prize: 10000 },
          { match: 5, prize: 500 },
          { match: 4, prize: 50 },
          { match: 3, prize: 5 },
        ],
      },
    },
  });
  console.log(`  ✅ ${keno.name} (v${keno.version})`);

  const sports = await prisma.gameDefinition.create({
    data: {
      name: "Match Day Sports",
      type: GameType.SPORTS,
      version: 1,
      status: GameStatus.ACTIVE,
      riskThreshold: 30000,
      description: "Bet on daily football matches. Choose home, draw, or away. Odds multiplier applies to all correct predictions.",
      createdBy: superAdmin.id,
      config: {
        matchesPerDay: 8,
        betTypes: ["home", "draw", "away", "doubleChance"],
        ticketPrice: 5,
        oddsMultiplier: 2.5,
      },
    },
  });
  console.log(`  ✅ ${sports.name} (v${sports.version})`);

  const numberDraw = await prisma.gameDefinition.create({
    data: {
      name: "Number Draw Classic",
      type: GameType.NUMBER_SELECTION,
      version: 5,
      status: GameStatus.ACTIVE,
      riskThreshold: 8000,
      description: "Pick 6 numbers from 1-49. Draw every Wednesday and Saturday at 20:00. Jackpot starts at ₦50,000.",
      createdBy: superAdmin.id,
      config: {
        numbersToPick: 6,
        maxNumber: 49,
        drawSchedule: "Wed,Sat 20:00",
        ticketPrice: 1,
        jackpot: 50000,
        prizeTiers: [
          { match: 6, jackpot: true },
          { match: 5, prize: 500 },
          { match: 4, prize: 50 },
          { match: 3, prize: 5 },
        ],
      },
    },
  });
  console.log(`  ✅ ${numberDraw.name} (v${numberDraw.version})\n`);

  // ─── Sample Tickets ───────────────────────────────────────
  console.log("🎫 Creating sample tickets...");
  const sampleTickets = [
    {
      ticketNumber: "TKT-LAG2026-001",
      selections: { numbers: [7, 23, 41, 56, 68, 80] },
      amount: 2,
      status: TicketStatus.CONFIRMED,
      hash: "a1b2c3d4e5f60718",
      prevHash: "0000000000000000",
      gameId: keno.id,
      terminalId: terminal04.id,
      userId: cashier.id,
      printedAt: new Date(),
    },
    {
      ticketNumber: "TKT-LAG2026-002",
      selections: { numbers: [3, 11, 19, 28, 35, 42] },
      amount: 1,
      status: TicketStatus.CONFIRMED,
      hash: "b2c3d4e5f6071829",
      prevHash: "a1b2c3d4e5f60718",
      gameId: numberDraw.id,
      terminalId: terminal04.id,
      userId: cashier.id,
      printedAt: new Date(),
    },
    {
      ticketNumber: "TKT-ABJ2026-001",
      selections: [
        { matchId: "match-1", bet: "home" },
        { matchId: "match-3", bet: "draw" },
        { matchId: "match-5", bet: "away" },
      ],
      amount: 5,
      status: TicketStatus.CONFIRMED,
      hash: "c3d4e5f60718293a",
      prevHash: "b2c3d4e5f6071829",
      gameId: sports.id,
      terminalId: terminal02.id,
      userId: cashier.id,
      printedAt: new Date(),
    },
    {
      ticketNumber: "TKT-LAG2026-003",
      selections: { numbers: [1, 14, 27, 33, 55, 72] },
      amount: 2,
      status: TicketStatus.CONFIRMED,
      hash: "d4e5f60718293a4b",
      prevHash: "c3d4e5f60718293a",
      gameId: keno.id,
      terminalId: terminal07.id,
      userId: cashier.id,
      printedAt: new Date(),
    },
    {
      ticketNumber: "TKT-KAN2026-001",
      selections: { numbers: [5, 18, 22, 36, 41, 49] },
      amount: 1,
      status: TicketStatus.CONFIRMED,
      hash: "e5f60718293a4b5c",
      prevHash: "d4e5f60718293a4b",
      gameId: numberDraw.id,
      terminalId: terminal01.id,
      userId: cashier.id,
      printedAt: new Date(),
    },
  ];

  for (const ticket of sampleTickets) {
    await prisma.ticket.create({ data: ticket });
  }
  console.log(`  ✅ ${sampleTickets.length} sample tickets created\n`);

  // ─── Draws ────────────────────────────────────────────────
  console.log("🎲 Creating sample draws...");
  const kenoDraw = await prisma.draw.create({
    data: {
      drawNumber: "KENO-2026-0001",
      numbers: [5, 12, 23, 34, 45, 56, 61, 72, 78, 3],
      status: "COMPLETED",
      drawnAt: new Date(Date.now() - 5 * 60 * 1000),
      resultsHash: "f60718293a4b5c6d",
      gameId: keno.id,
      createdBy: superAdmin.id,
    },
  });
  console.log(`  ✅ ${kenoDraw.drawNumber}`);

  const numberDrawRecord = await prisma.draw.create({
    data: {
      drawNumber: "NUM-2026-0047",
      numbers: [7, 14, 21, 33, 41, 48],
      status: "COMPLETED",
      drawnAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      resultsHash: "0718293a4b5c6d7e",
      gameId: numberDraw.id,
      createdBy: superAdmin.id,
    },
  });
  console.log(`  ✅ ${numberDrawRecord.drawNumber}`);

  const sportsDraw = await prisma.draw.create({
    data: {
      drawNumber: "SPT-2026-0012",
      numbers: ["1", "X", "2", "1", "1", "X", "2", "1"],
      status: "PENDING",
      gameId: sports.id,
      createdBy: superAdmin.id,
    },
  });
  console.log(`  ✅ ${sportsDraw.drawNumber}\n`);

  // ─── Audit Logs ───────────────────────────────────────────
  console.log("📝 Creating audit logs...");
  const auditEntries = [
    { action: "LOGIN", entity: "User", entityId: superAdmin.id, data: { ip: "10.0.0.1" }, userId: superAdmin.id },
    { action: "CREATE", entity: "GameDefinition", entityId: keno.id, data: { name: "Lucky 6 Keno", version: 3 }, userId: superAdmin.id },
    { action: "SELL", entity: "Ticket", entityId: sampleTickets[0].ticketNumber, data: { amount: 2, game: "Lucky 6 Keno" }, userId: cashier.id },
    { action: "SELL", entity: "Ticket", entityId: sampleTickets[1].ticketNumber, data: { amount: 1, game: "Number Draw Classic" }, userId: cashier.id },
    { action: "UPDATE", entity: "Terminal", entityId: terminal07.id, data: { printerStatus: "LOW_PAPER" }, userId: supervisor.id },
    { action: "VIEW", entity: "Reports", data: { reportType: "daily-sales" }, userId: agencyAdmin.id },
    { action: "EXPORT", entity: "Reports", data: { reportType: "commission" }, userId: auditor.id },
    { action: "PROCESS", entity: "Draw", entityId: kenoDraw.id, data: { drawNumber: "KENO-2026-0001" }, userId: superAdmin.id },
  ];

  for (const log of auditEntries) {
    await prisma.auditLog.create({ data: log as any });
  }
  console.log(`  ✅ ${auditEntries.length} audit log entries\n`);

  // ─── Risk Alerts ──────────────────────────────────────────
  console.log("⚠️  Creating risk alerts...");
  const riskAlerts = [
    {
      level: "WARNING" as const,
      message: "Keno sales approaching threshold (82%)",
      threshold: 12000,
      current: 9840,
      autoSuspended: false,
      gameId: keno.id,
    },
    {
      level: "BREACH" as const,
      message: "Sports betting threshold breached",
      threshold: 30000,
      current: 31200,
      autoSuspended: true,
      gameId: sports.id,
    },
  ];

  for (const alert of riskAlerts) {
    await prisma.riskAlert.create({ data: alert });
  }
  console.log(`  ✅ ${riskAlerts.length} risk alerts created\n`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Seed complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`
  Agencies:    3
  Terminals:   4
  Users:       6
  Games:       3
  Tickets:     5
  Draws:       3
  Audit Logs:  ${auditEntries.length}
  Risk Alerts: ${riskAlerts.length}

  Login credentials (all users):
  Email:    super@drawcontrol.com | agency@drawcontrol.com | supervisor@drawcontrol.com
            cashier@drawcontrol.com | risk@drawcontrol.com | auditor@drawcontrol.com
  Password: admin123
  `);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  prisma.$disconnect();
  process.exit(1);
});
