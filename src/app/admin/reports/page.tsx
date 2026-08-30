"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Shield,
  Download,
  Calendar,
  Loader2,
} from "lucide-react";

interface SalesData {
  summary: {
    totalSales: number;
    totalPayout: number;
    netRevenue: number;
    totalTickets: number;
    winRate: number;
  };
  grouped: Record<string, {
    totalSales: number;
    totalPayout: number;
    totalTickets: number;
    wins: number;
    losses: number;
  }>;
}

interface CommissionData {
  commissions: {
    agencyId: string;
    agencyName: string;
    agencyCode: string;
    commissionRate: number;
    totalSales: number;
    totalPayout: number;
    netSales: number;
    commissionAmount: number;
    ticketCount: number;
  }[];
  totalCommission: number;
}

interface RiskData {
  exposure: {
    gameId: string;
    gameName: string;
    gameType: string;
    gameStatus: string;
    currentLiability: number;
    pendingPayouts: number;
    totalSales: number;
    threshold: number;
    utilizationPercent: number;
    activeTickets: number;
    riskLevel: string;
  }[];
  summary: {
    totalLiability: number;
    totalPendingPayouts: number;
    gamesAtRisk: number;
    totalGames: number;
  };
}

type Tab = "sales" | "commissions" | "risk";

const TABS: { key: Tab; label: string; icon: typeof DollarSign }[] = [
  { key: "sales", label: "Sales", icon: TrendingUp },
  { key: "commissions", label: "Commissions", icon: DollarSign },
  { key: "risk", label: "Risk Exposure", icon: Shield },
];

function getRiskColor(pct: number): string {
  if (pct >= 100) return "#EF4444";
  if (pct >= 75) return "#F5A623";
  if (pct >= 50) return "#F5A623";
  return "#2DD4BF";
}

function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (typeof val === "string" && val.includes(",")) return `"${val}"`;
        return String(val ?? "");
      }).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("sales");
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [commData, setCommData] = useState<CommissionData | null>(null);
  const [riskData, setRiskData] = useState<RiskData | null>(null);

  const fetchSales = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const params = new URLSearchParams({ groupBy: "game" });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/reports/sales?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSalesData(await res.json());
    } catch { /* silent */ }
  }, [dateFrom, dateTo]);

  const fetchCommissions = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/reports/commissions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCommData(await res.json());
    } catch { /* silent */ }
  }, [dateFrom, dateTo]);

  const fetchRisk = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/reports/risk", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRiskData(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSales(), fetchCommissions(), fetchRisk()]).finally(() => setLoading(false));
  }, [fetchSales, fetchCommissions, fetchRisk]);

  const maxSales = salesData
    ? Math.max(...Object.values(salesData.grouped).map((g) => g.totalSales), 1)
    : 1;

  const maxLiability = riskData
    ? Math.max(...riskData.exposure.map((e) => e.threshold), 1)
    : 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text flex items-center gap-2">
            <BarChart3 size={24} className="text-amber" />
            Reports &amp; Analytics
          </h1>
          <p className="text-muted text-sm mt-1">Sales, commissions, and risk exposure analytics</p>
        </div>
        <button
          onClick={() => {
            if (tab === "sales" && salesData) {
              exportCSV(
                Object.entries(salesData.grouped).map(([name, data]) => ({
                  name,
                  totalSales: data.totalSales,
                  totalPayout: data.totalPayout,
                  tickets: data.totalTickets,
                  wins: data.wins,
                  losses: data.losses,
                })),
                "sales-report.csv"
              );
            } else if (tab === "commissions" && commData) {
              exportCSV(
                commData.commissions.map((c) => ({
                  agency: c.agencyName,
                  code: c.agencyCode,
                  rate: c.commissionRate,
                  sales: c.totalSales,
                  payout: c.totalPayout,
                  net: c.netSales,
                  commission: c.commissionAmount,
                  tickets: c.ticketCount,
                })),
                "commissions-report.csv"
              );
            } else if (tab === "risk" && riskData) {
              exportCSV(
                riskData.exposure.map((e) => ({
                  game: e.gameName,
                  type: e.gameType,
                  status: e.gameStatus,
                  liability: e.currentLiability,
                  threshold: e.threshold,
                  utilization: e.utilizationPercent,
                  level: e.riskLevel,
                })),
                "risk-report.csv"
              );
            }
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface border border-border text-sm text-text hover:bg-surface-alt transition-colors"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Date range */}
      <div className="flex items-center gap-3">
        <Calendar size={14} className="text-muted" />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text focus:outline-none focus:border-teal/50 font-mono"
        />
        <span className="text-muted text-sm">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text focus:outline-none focus:border-teal/50 font-mono"
        />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
                tab === t.key
                  ? "bg-surface-alt text-text"
                  : "text-muted hover:text-text"
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Sales Tab */}
      {tab === "sales" && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary cards */}
          {salesData && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface border border-border rounded-xl p-5">
                <p className="text-xs text-muted uppercase tracking-wider">Total Sales</p>
                <p className="font-mono text-2xl font-bold text-text mt-1">
                  ${salesData.summary.totalSales.toLocaleString()}
                </p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-5">
                <p className="text-xs text-muted uppercase tracking-wider">Total Payout</p>
                <p className="font-mono text-2xl font-bold text-text mt-1">
                  ${salesData.summary.totalPayout.toLocaleString()}
                </p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-5">
                <p className="text-xs text-muted uppercase tracking-wider">Net Revenue</p>
                <p className={`font-mono text-2xl font-bold mt-1 ${salesData.summary.netRevenue >= 0 ? "text-teal" : "text-red"}`}>
                  ${salesData.summary.netRevenue.toLocaleString()}
                </p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-5">
                <p className="text-xs text-muted uppercase tracking-wider">Win Rate</p>
                <p className="font-mono text-2xl font-bold text-text mt-1">
                  {salesData.summary.winRate}%
                </p>
              </div>
            </div>
          )}

          {/* Bar chart */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold text-text text-sm mb-4">Revenue by Game</h3>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 bg-surface-alt rounded animate-pulse" />
                ))}
              </div>
            ) : salesData && Object.keys(salesData.grouped).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(salesData.grouped)
                  .sort((a, b) => b[1].totalSales - a[1].totalSales)
                  .map(([name, data]) => (
                    <div key={name} className="flex items-center gap-4">
                      <span className="text-sm text-text w-32 truncate flex-shrink-0">{name}</span>
                      <div className="flex-1 h-8 bg-surface-alt rounded-lg overflow-hidden relative">
                        <div
                          className="h-full bg-teal/70 rounded-lg transition-all duration-700"
                          style={{ width: `${(data.totalSales / maxSales) * 100}%` }}
                        />
                        <span className="absolute inset-y-0 right-3 flex items-center font-mono text-xs text-text">
                          ${data.totalSales.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-xs text-muted w-16 text-right flex-shrink-0">{data.totalTickets} tickets</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted text-sm text-center py-8">No sales data available</p>
            )}
          </div>
        </div>
      )}

      {/* Commissions Tab */}
      {tab === "commissions" && (
        <div className="space-y-6 animate-fade-in">
          {commData && (
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-text text-sm">Agency Commissions</h3>
                <span className="font-mono text-sm text-teal">
                  Total: ${commData.totalCommission.toLocaleString()}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase">Agency</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase">Rate</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase">Sales</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase">Payout</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase">Net</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase">Commission</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase">Tickets</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={7} className="px-3 py-3">
                            <div className="h-4 bg-surface-alt rounded animate-pulse" />
                          </td>
                        </tr>
                      ))
                    ) : commData.commissions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-muted text-sm">
                          No commission data
                        </td>
                      </tr>
                    ) : (
                      commData.commissions.map((c) => (
                        <tr key={c.agencyId} className="hover:bg-surface-alt/50 transition-colors">
                          <td className="px-3 py-3">
                            <div>
                              <p className="text-text text-sm">{c.agencyName}</p>
                              <p className="text-xs font-mono text-muted">{c.agencyCode}</p>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-text">{c.commissionRate}%</td>
                          <td className="px-3 py-3 text-right font-mono text-text">${c.totalSales.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right font-mono text-muted">${c.totalPayout.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right font-mono text-text">${c.netSales.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right font-mono text-teal font-bold">
                            ${c.commissionAmount.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-muted">{c.ticketCount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risk Tab */}
      {tab === "risk" && (
        <div className="space-y-6 animate-fade-in">
          {riskData && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-surface border border-border rounded-xl p-5">
                  <p className="text-xs text-muted uppercase tracking-wider">Total Liability</p>
                  <p className="font-mono text-2xl font-bold text-text mt-1">
                    ${riskData.summary.totalLiability.toLocaleString()}
                  </p>
                </div>
                <div className="bg-surface border border-border rounded-xl p-5">
                  <p className="text-xs text-muted uppercase tracking-wider">Pending Payouts</p>
                  <p className="font-mono text-2xl font-bold text-amber mt-1">
                    ${riskData.summary.totalPendingPayouts.toLocaleString()}
                  </p>
                </div>
                <div className="bg-surface border border-border rounded-xl p-5">
                  <p className="text-xs text-muted uppercase tracking-wider">Games at Risk</p>
                  <p className={`font-mono text-2xl font-bold mt-1 ${riskData.summary.gamesAtRisk > 0 ? "text-red" : "text-teal"}`}>
                    {riskData.summary.gamesAtRisk} / {riskData.summary.totalGames}
                  </p>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-5">
                <h3 className="font-display font-semibold text-text text-sm mb-4">Risk Exposure by Game</h3>
                <div className="space-y-4">
                  {riskData.exposure.map((e) => (
                    <div key={e.gameId} className="animate-grow-in">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-text font-medium">{e.gameName}</span>
                          <span className="text-[9px] font-mono text-muted uppercase">{e.gameType}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-text">
                            ${e.currentLiability.toLocaleString()} / ${e.threshold.toLocaleString()}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              color: getRiskColor(e.utilizationPercent),
                              backgroundColor: `${getRiskColor(e.utilizationPercent)}15`,
                            }}
                          >
                            {e.riskLevel}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-3 bg-surface-alt rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(e.utilizationPercent, 100)}%`,
                            backgroundColor: getRiskColor(e.utilizationPercent),
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-muted">
                        <span>{e.utilizationPercent.toFixed(1)}% utilized</span>
                        <span>{e.activeTickets} active tickets</span>
                      </div>
                    </div>
                  ))}
                  {riskData.exposure.length === 0 && (
                    <p className="text-muted text-sm text-center py-8">No risk data available</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
