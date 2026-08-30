"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Code2,
  Plus,
  Power,
  Eye,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

interface Game {
  id: string;
  name: string;
  type: string;
  version: number;
  status: string;
  riskThreshold: number;
  description: string | null;
  config: Record<string, unknown>;
  createdAt: string;
  _count: { tickets: number; draws: number };
}

const TYPE_BADGES: Record<string, string> = {
  KENO: "bg-teal/15 text-teal",
  SPORTS: "bg-amber/15 text-amber",
  NUMBER_SELECTION: "bg-violet/15 text-violet",
};

const STATUS_PILLS: Record<string, string> = {
  ACTIVE: "bg-teal/15 text-teal",
  INACTIVE: "bg-muted/15 text-muted",
  DRAFT: "bg-amber/15 text-amber",
  ARCHIVED: "bg-red/15 text-red",
};

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: "KENO" as string,
    riskThreshold: 50000,
    description: "",
  });

  const fetchGames = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/games", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGames(data.games || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handlePublish = async () => {
    const token = localStorage.getItem("token");
    if (!token || !form.name) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          riskThreshold: form.riskThreshold,
          description: form.description || undefined,
          config: {},
        }),
      });
      if (res.ok) {
        await fetchGames();
        setForm({ name: "", type: "KENO", riskThreshold: 50000, description: "" });
        setShowForm(false);
      }
    } catch {
      // silent
    } finally {
      setPublishing(false);
    }
  };

  const handleToggle = async (gameId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setToggling(gameId);
    try {
      const res = await fetch(`/api/games/${gameId}/toggle`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchGames();
      }
    } catch {
      // silent
    } finally {
      setToggling(null);
    }
  };

  const livePreview = {
    name: form.name || "—",
    type: form.type,
    version: (games.filter((g) => g.name === form.name).length || 0) + 1,
    status: "DRAFT",
    riskThreshold: form.riskThreshold,
    description: form.description || null,
    config: {},
    publishedAt: null,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Game Engine</h1>
          <p className="text-muted text-sm mt-1">Configure and manage lottery games</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal text-bg text-sm font-semibold hover:bg-teal/90 transition-colors"
        >
          {showForm ? <XCircle size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "New game — no code"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Game list */}
        <div className="space-y-3">
          <h2 className="font-display font-semibold text-text text-sm">Configured Games</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-surface border border-border rounded-xl p-4">
                  <div className="h-5 bg-surface-alt rounded w-1/2 animate-pulse mb-3" />
                  <div className="h-4 bg-surface-alt rounded w-3/4 animate-pulse" />
                </div>
              ))}
            </div>
          ) : games.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <Code2 size={32} className="mx-auto text-muted mb-3" />
              <p className="text-muted text-sm">No games configured yet</p>
              <p className="text-muted/60 text-xs mt-1">Create your first game to get started</p>
            </div>
          ) : (
            games.map((game) => (
              <div
                key={game.id}
                className="bg-surface border border-border rounded-xl overflow-hidden hover:border-border/80 transition-colors animate-grow-in"
              >
                <div className="p-4 flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    onClick={() => setExpandedGame(expandedGame === game.id ? null : game.id)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center flex-shrink-0">
                      <Code2 size={18} className="text-teal" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text text-sm truncate">{game.name}</p>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${TYPE_BADGES[game.type] || "bg-muted/15 text-muted"}`}>
                          {game.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5 font-mono">v{game.version}</p>
                    </div>
                    {expandedGame === game.id ? (
                      <ChevronUp size={16} className="text-muted" />
                    ) : (
                      <ChevronDown size={16} className="text-muted" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${STATUS_PILLS[game.status] || "bg-muted/15 text-muted"}`}>
                      {game.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(game.id);
                      }}
                      disabled={toggling === game.id}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                        game.status === "ACTIVE"
                          ? "bg-teal/15 text-teal hover:bg-teal/25"
                          : "bg-surface-alt text-muted hover:bg-surface-alt/80"
                      }`}
                      title={game.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    >
                      {toggling === game.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Power size={15} />
                      )}
                    </button>
                  </div>
                </div>

                {expandedGame === game.id && (
                  <div className="border-t border-border px-4 py-3 bg-surface-alt/50 text-xs space-y-1.5 animate-grow-in">
                    <div className="flex justify-between">
                      <span className="text-muted">Risk Threshold</span>
                      <span className="font-mono text-text">${game.riskThreshold.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Tickets Sold</span>
                      <span className="font-mono text-text">{game._count.tickets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Draws</span>
                      <span className="font-mono text-text">{game._count.draws}</span>
                    </div>
                    {game.description && (
                      <div className="flex justify-between">
                        <span className="text-muted">Description</span>
                        <span className="text-text text-right max-w-[60%]">{game.description}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right: Form + Preview */}
        <div className="space-y-4">
          {showForm && (
            <div className="bg-surface border border-border rounded-xl p-5 animate-grow-in">
              <h2 className="font-display font-semibold text-text text-sm mb-4 flex items-center gap-2">
                <Plus size={16} className="text-teal" />
                New Game Definition
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Game Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Lucky Keno"
                    className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-teal/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Game Type</label>
                  <div className="relative">
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:border-teal/50 appearance-none"
                    >
                      <option value="KENO">Keno</option>
                      <option value="SPORTS">Sports</option>
                      <option value="NUMBER_SELECTION">Number Selection</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Liability Threshold ($)
                  </label>
                  <input
                    type="number"
                    value={form.riskThreshold}
                    onChange={(e) => setForm({ ...form, riskThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:border-teal/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    placeholder="Optional description..."
                    className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-teal/50 resize-none"
                  />
                </div>
                <button
                  onClick={handlePublish}
                  disabled={!form.name || publishing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal text-bg text-sm font-semibold hover:bg-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Publish Game
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Live JSON Preview */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
              <Eye size={14} className="text-violet" />
              <span className="text-xs font-semibold text-text uppercase tracking-wider">
                Live JSON Preview
              </span>
            </div>
            <pre className="p-5 text-xs font-mono text-text/80 overflow-x-auto max-h-[400px] overflow-y-auto console-scroll leading-relaxed">
              <code>{JSON.stringify(livePreview, null, 2)}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
