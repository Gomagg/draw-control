"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Gamepad2,
  Monitor,
  Ticket,
  DollarSign,
  Plus,
  Dices,
  TriangleAlert,
  FileBarChart,
  ArrowUpRight,
  Clock,
  Activity,
} from "lucide-react";

interface Game {
  id: string;
  name: string;
  type: string;
  status: string;
  _count: { tickets: number };
}

interface TicketRecord {
  id: string;
  ticketNumber: string;
  amount: number;
  status: string;
  createdAt: string;
  game: { name: string };
  terminal: { name: string };
}

interface Stats {
  activeGames: number;
  totalTerminals: number;
  ticketsToday: number;
  revenue: number;
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "text-teal bg-teal/10",
  PRINTED: "text-teal bg-teal/10",
  PENDING: "text-amber bg-amber/10",
  WIN: "text-violet bg-violet/10",
  LOSS: "text-muted bg-surface-alt",
  CANCELLED: "text-red bg-red/10",
  SETTLED: "text-teal bg-teal/10",
};

const QUICK_ACTIONS = [
  { label: "New Game", icon: Plus, href: "/admin/games", color: "text-teal bg-teal/10 hover:bg-teal/15" },
  { label: "New Draw", icon: Dices, href: "/admin/draws", color: "text-violet bg-violet/10 hover:bg-violet/15" },
  { label: "View Risk", icon: TriangleAlert, href: "/admin/risk", color: "text-amber bg-amber/10 hover:bg-amber/15" },
  { label: "Export Report", icon: FileBarChart, href: "/admin/reports", color: "text-red bg-red/10 hover:bg-red/15" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ activeGames: 0, totalTerminals: 0, ticketsToday: 0, revenue: 0 });
  const [recentTickets, setRecentTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const [gamesRes, terminalsRes, ticketsRes, salesRes] = await Promise.all([
        fetch("/api/games", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/terminals", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/tickets?limit=10", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/reports/sales", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const gamesData = gamesRes.ok ? await gamesRes.json() : { games: [] };
      const terminalsData = terminalsRes.ok ? await terminalsRes.json() : { terminals: [] };
      const ticketsData = ticketsRes.ok ? await ticketsRes.json() : { tickets: [], total: 0 };
      const salesData = salesRes.ok ? await salesRes.json() : { summary: { totalSales: 0 } };

      setStats({
        activeGames: (gamesData.games || []).filter((g: Game) => g.status === "ACTIVE").length,
        totalTerminals: (terminalsData.terminals || []).length,
        ticketsToday: ticketsData.total || 0,
        revenue: salesData.summary?.totalSales || 0,
      });
      setRecentTickets(ticketsData.tickets || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const statCards = [
    { label: "Active Games", value: stats.activeGames, icon: Gamepad2, color: "text-teal", bg: "bg-teal/10" },
    { label: "Total Terminals", value: stats.totalTerminals, icon: Monitor, color: "text-violet", bg: "bg-violet/10" },
    { label: "Tickets Today", value: stats.ticketsToday, icon: Ticket, color: "text-amber", bg: "bg-amber/10" },
    { label: "Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-teal", bg: "bg-teal/10" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Operations Dashboard</h1>
        <p className="text-muted text-sm mt-1">Real-time lottery operations overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-surface border border-border rounded-xl p-5 hover:border-border/80 transition-colors animate-grow-in"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon size={20} className={card.color} />
                </div>
                <ArrowUpRight size={14} className="text-muted" />
              </div>
              <p className="text-muted text-xs font-medium uppercase tracking-wider">{card.label}</p>
              <p className="font-mono text-2xl font-bold text-text mt-1">
                {loading ? (
                  <span className="inline-block w-16 h-6 bg-surface-alt rounded animate-pulse" />
                ) : (
                  card.value
                )}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-teal" />
              <h2 className="font-display font-semibold text-text text-sm">Live Activity Feed</h2>
            </div>
            <span className="text-xs text-muted font-mono">{recentTickets.length} recent</span>
          </div>
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto console-scroll">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="h-4 bg-surface-alt rounded w-3/4 animate-pulse mb-2" />
                  <div className="h-3 bg-surface-alt rounded w-1/2 animate-pulse" />
                </div>
              ))
            ) : recentTickets.length === 0 ? (
              <div className="px-5 py-12 text-center text-muted text-sm">No tickets yet</div>
            ) : (
              recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-surface-alt/50 transition-colors animate-grow-in"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-teal flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-mono text-sm text-text truncate">{ticket.ticketNumber}</p>
                      <p className="text-xs text-muted truncate">
                        {ticket.game?.name} &middot; {ticket.terminal?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[ticket.status] || "text-muted bg-surface-alt"}`}>
                      {ticket.status}
                    </span>
                    <span className="font-mono text-sm text-text">${ticket.amount.toFixed(2)}</span>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Clock size={11} />
                      {new Date(ticket.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="font-display font-semibold text-text text-sm mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-border transition-all hover:scale-[1.02] ${action.color}`}
                >
                  <Icon size={24} />
                  <span className="text-xs font-medium">{action.label}</span>
                </Link>
              );
            })}
          </div>

          {/* System status */}
          <div className="mt-6 pt-5 border-t border-border">
            <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">System Status</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">API Server</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                  <span className="text-xs font-mono text-teal">Operational</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Database</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                  <span className="text-xs font-mono text-teal">Operational</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Risk Engine</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                  <span className="text-xs font-mono text-teal">Monitoring</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
