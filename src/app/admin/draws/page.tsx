"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dices,
  Plus,
  Play,
  ChevronDown,
  Clock,
  Loader2,
  Trophy,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface Game {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface Draw {
  id: string;
  drawNumber: string;
  numbers: number[];
  status: string;
  drawnAt: string | null;
  createdAt: string;
  game: { id: string; name: string; type: string };
  _count: { winResults: number };
}

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "bg-amber/15", text: "text-amber" },
  OPEN: { bg: "bg-teal/15", text: "text-teal" },
  CLOSED: { bg: "bg-muted/15", text: "text-muted" },
  PROCESSING: { bg: "bg-amber/15", text: "text-amber" },
  COMPLETED: { bg: "bg-violet/15", text: "text-violet" },
};

export default function DrawsPage() {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedDraw, setSelectedDraw] = useState<string | null>(null);

  const [form, setForm] = useState({
    gameId: "",
    numbers: "",
    drawNumber: "",
  });

  const fetchDraws = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/draws?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDraws(data.draws || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGames = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/games", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setGames((data.games || []).filter((g: Game) => g.status === "ACTIVE" || g.status === "DRAFT"));
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchDraws();
    fetchGames();
  }, [fetchDraws, fetchGames]);

  const handleCreate = async () => {
    const token = localStorage.getItem("token");
    if (!token || !form.gameId || !form.numbers) return;
    setCreating(true);
    try {
      const numbers = form.numbers
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n));
      if (numbers.length === 0) return;

      const res = await fetch("/api/draws", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: form.gameId,
          numbers,
          drawNumber: form.drawNumber || undefined,
        }),
      });
      if (res.ok) {
        await fetchDraws();
        setForm({ gameId: "", numbers: "", drawNumber: "" });
        setShowForm(false);
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  const handleProcess = async (drawId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setProcessing(drawId);
    try {
      const res = await fetch(`/api/draws/${drawId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchDraws();
      }
    } catch {
      // silent
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text flex items-center gap-2">
            <Dices size={24} className="text-violet" />
            Draws Management
          </h1>
          <p className="text-muted text-sm mt-1">Create, process, and audit lottery draws</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet text-bg text-sm font-semibold hover:bg-violet/90 transition-colors"
        >
          {showForm ? <XCircle size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "New Draw"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-surface border border-border rounded-xl p-5 animate-grow-in">
          <h3 className="font-display font-semibold text-text text-sm mb-4">Create Draw</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <select
                value={form.gameId}
                onChange={(e) => setForm({ ...form, gameId: e.target.value })}
                className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:border-teal/50 appearance-none"
              >
                <option value="">Select game</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
            <input
              placeholder="Numbers (comma-separated)"
              value={form.numbers}
              onChange={(e) => setForm({ ...form, numbers: e.target.value })}
              className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-teal/50 font-mono"
            />
            <input
              placeholder="Draw # (auto if empty)"
              value={form.drawNumber}
              onChange={(e) => setForm({ ...form, drawNumber: e.target.value })}
              className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-teal/50 font-mono"
            />
            <button
              onClick={handleCreate}
              disabled={!form.gameId || !form.numbers || creating}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-violet text-bg text-sm font-semibold hover:bg-violet/90 transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Draw
            </button>
          </div>
        </div>
      )}

      {/* Draws list */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Draw #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Game</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Numbers</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Winners</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-4 bg-surface-alt rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : draws.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted text-sm">
                    No draws yet
                  </td>
                </tr>
              ) : (
                draws.map((draw) => {
                  const badge = STATUS_BADGES[draw.status] || STATUS_BADGES.PENDING;
                  return (
                    <tr
                      key={draw.id}
                      className="hover:bg-surface-alt/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedDraw(selectedDraw === draw.id ? null : draw.id)}
                    >
                      <td className="px-4 py-3 font-mono text-text text-xs">{draw.drawNumber}</td>
                      <td className="px-4 py-3 text-text">{draw.game?.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                          {draw.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(draw.numbers || []).slice(0, 8).map((n: number, i: number) => (
                            <span key={i} className="w-6 h-6 rounded bg-surface-alt text-text font-mono text-[10px] font-bold flex items-center justify-center">
                              {n}
                            </span>
                          ))}
                          {(draw.numbers || []).length > 8 && (
                            <span className="w-6 h-6 rounded bg-surface-alt text-muted font-mono text-[10px] flex items-center justify-center">
                              +{(draw.numbers || []).length - 8}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-text text-xs">{draw._count.winResults}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {draw.status === "OPEN" || draw.status === "PENDING" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProcess(draw.id);
                            }}
                            disabled={processing === draw.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-teal/10 text-teal text-xs font-semibold hover:bg-teal/20 transition-colors ml-auto disabled:opacity-50"
                          >
                            {processing === draw.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Play size={12} />
                            )}
                            Process
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Expanded draw detail */}
              {!loading &&
                draws
                  .filter((d) => selectedDraw === d.id)
                  .map((draw) => {
                    const results = draw.status === "COMPLETED" ? JSON.parse(draw.drawNumber ? "{}" : "{}") : null;
                    return (
                      <tr key={`${draw.id}-detail`} className="bg-surface-alt/30 animate-grow-in">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="text-muted mb-1">Draw Numbers</p>
                              <div className="flex flex-wrap gap-1.5">
                                {(draw.numbers || []).map((n: number, i: number) => (
                                  <span key={i} className="w-8 h-8 rounded-lg bg-teal/10 text-teal font-mono font-bold flex items-center justify-center">
                                    {n}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-muted mb-1">Drawn At</p>
                              <p className="text-text flex items-center gap-1.5">
                                <Clock size={11} className="text-muted" />
                                {draw.drawnAt ? new Date(draw.drawnAt).toLocaleString() : "Not drawn yet"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted mb-1">Winners</p>
                              <p className="text-text flex items-center gap-1.5">
                                <Trophy size={11} className="text-amber" />
                                {draw._count.winResults} winning tickets
                              </p>
                            </div>
                            <div>
                              <p className="text-muted mb-1">Created</p>
                              <p className="text-text">
                                {new Date(draw.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
