"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  TriangleAlert,
  Shield,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Zap,
} from "lucide-react";

interface RiskItem {
  gameId: string;
  gameName: string;
  gameType: string;
  currentLiability: number;
  threshold: number;
  usagePercent: number;
  level: string;
  activeTickets: number;
  alerts: {
    id: string;
    level: string;
    message: string;
    autoSuspended: boolean;
    createdAt: string;
  }[];
}

interface AlertLog {
  id: string;
  level: string;
  message: string;
  autoSuspended: boolean;
  createdAt: string;
  game: { name: string; type: string };
}

function getGaugeColor(pct: number): string {
  if (pct >= 100) return "#EF4444";
  if (pct >= 75) return "#F5A623";
  return "#2DD4BF";
}

function getLevelBadge(level: string) {
  switch (level) {
    case "CRITICAL":
    case "BREACH":
      return { bg: "bg-red/15", text: "text-red", label: level };
    case "WARNING":
      return { bg: "bg-amber/15", text: "text-amber", label: "WARNING" };
    default:
      return { bg: "bg-teal/15", text: "text-teal", label: "NORMAL" };
  }
}

function CircularGauge({ percent, size = 120 }: { percent: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(percent, 100);
  const offset = circumference - (clampedPercent / 100) * circumference;
  const color = getGaugeColor(percent);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#232B36"
        strokeWidth={8}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
      <text
        x={size / 2}
        y={size / 2 - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        className="transform rotate-90 origin-center"
        fill="#EDEFF2"
        fontSize={size > 100 ? 22 : 16}
        fontFamily="JetBrains Mono, monospace"
        fontWeight="700"
      >
        {Math.round(percent)}%
      </text>
      <text
        x={size / 2}
        y={size / 2 + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        className="transform rotate-90 origin-center"
        fill="#7C8697"
        fontSize={9}
        fontFamily="Inter, sans-serif"
      >
        of threshold
      </text>
    </svg>
  );
}

export default function RiskPage() {
  const [riskData, setRiskData] = useState<RiskItem[]>([]);
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const [riskRes, alertsRes] = await Promise.all([
        fetch("/api/risk", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/risk/alerts?resolved=false", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (riskRes.ok) {
        const data = await riskRes.json();
        setRiskData(data.risk || []);
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const breachedGames = riskData.filter((r) => r.usagePercent >= 100);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text flex items-center gap-2">
            <Shield size={24} className="text-amber" />
            Risk Console
          </h1>
          <p className="text-muted text-sm mt-1">Real-time liability monitoring &amp; alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-teal opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal" />
          </span>
          <span className="text-xs font-mono text-muted">Polling every 5s</span>
        </div>
      </div>

      {breachedGames.length > 0 && (
        <div className="bg-red/5 border border-red/20 rounded-xl p-4 animate-grow-in">
          <div className="flex items-center gap-2 mb-2">
            <AlertOctagon size={18} className="text-red" />
            <span className="text-sm font-semibold text-red">Threshold Breaches Detected</span>
          </div>
          <div className="space-y-1">
            {breachedGames.map((g) => (
              <p key={g.gameId} className="text-xs font-mono text-red/80">
                {g.gameName}: {g.usagePercent.toFixed(1)}% — AUTO-SUSPENDED
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Gauges */}
        <div className="lg:col-span-2">
          <h2 className="font-display font-semibold text-text text-sm mb-3 flex items-center gap-2">
            <Zap size={14} className="text-teal" />
            Liability Gauges — Active Games
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-surface border border-border rounded-xl p-6 flex items-center justify-center">
                  <div className="w-[120px] h-[120px] rounded-full bg-surface-alt animate-pulse" />
                </div>
              ))}
            </div>
          ) : riskData.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <Shield size={32} className="mx-auto text-muted mb-3" />
              <p className="text-muted text-sm">No active games to monitor</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {riskData.map((item) => {
                const badge = getLevelBadge(item.level);
                return (
                  <div
                    key={item.gameId}
                    className="bg-surface border border-border rounded-xl p-5 hover:border-border/80 transition-colors animate-grow-in"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium text-text text-sm">{item.gameName}</p>
                        <p className="text-[10px] font-mono text-muted uppercase">{item.gameType}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-center">
                      <CircularGauge percent={item.usagePercent} />
                    </div>
                    <div className="mt-4 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted">Liability</span>
                        <span className="font-mono text-text">${item.currentLiability.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Threshold</span>
                        <span className="font-mono text-text">${item.threshold.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Active Tickets</span>
                        <span className="font-mono text-text">{item.activeTickets}</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-alt rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(item.usagePercent, 100)}%`,
                            backgroundColor: getGaugeColor(item.usagePercent),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Alert log */}
        <div>
          <h2 className="font-display font-semibold text-text text-sm mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber" />
            Alert Log
          </h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto console-scroll">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <div className="h-4 bg-surface-alt rounded w-3/4 animate-pulse mb-2" />
                    <div className="h-3 bg-surface-alt rounded w-1/2 animate-pulse" />
                  </div>
                ))
              ) : alerts.length === 0 ? (
                <div className="p-8 text-center">
                  <Shield size={24} className="mx-auto text-muted mb-2" />
                  <p className="text-muted text-sm">No active alerts</p>
                </div>
              ) : (
                alerts.map((alert) => {
                  const badge = getLevelBadge(alert.level);
                  return (
                    <div
                      key={alert.id}
                      className="p-4 hover:bg-surface-alt/50 transition-colors animate-grow-in"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                        {alert.autoSuspended && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red/15 text-red uppercase tracking-wider">
                            AUTO-SUSPENDED
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text mb-1">{alert.message}</p>
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span className="font-mono">{alert.game.name}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(alert.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
