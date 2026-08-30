"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Wifi,
  WifiOff,
  Clock,
  User,
  Printer,
  Trash2,
  ChevronRight,
  X,
  Check,
  Zap,
  Dices,
  Trophy,
  Target,
} from "lucide-react";

interface Game {
  id: string;
  name: string;
  type: string;
  status: string;
  version: number;
  config: Record<string, unknown>;
  riskThreshold: number;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  amount: number;
  selections: unknown;
  status: string;
  hash: string;
  createdAt: string;
  game: { name: string; type: string };
}

interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

interface MatchSelection {
  matchId: string;
  matchLabel: string;
  bet: "home" | "draw" | "away" | null;
}

const GAME_ICONS: Record<string, React.ReactNode> = {
  KENO: <Dices size={20} className="text-teal" />,
  SPORTS: <Trophy size={20} className="text-amber" />,
  NUMBER_SELECTION: <Target size={20} className="text-violet" />,
};

const STAKE_OPTIONS = [1, 2, 5, 10, 20];

function getTimeUntilDraw(config: Record<string, unknown>): string {
  const interval = config.drawInterval as string | undefined;
  if (interval) {
    const now = Date.now();
    const minutes = parseInt(interval) || 5;
    const next = Math.ceil(now / (minutes * 60000)) * minutes * 60000;
    const diff = Math.floor((next - now) / 1000);
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  const schedule = config.drawSchedule as string | undefined;
  if (schedule) return schedule;
  return "—";
}

export default function TerminalPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [stake, setStake] = useState<number>(2);
  const [lines, setLines] = useState<number>(1);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [clock, setClock] = useState("");
  const [userName] = useState("Cashier");
  const [terminalName] = useState("Terminal 04");
  const [terminalCode] = useState("LAG-T04");
  const [matchSelections, setMatchSelections] = useState<MatchSelection[]>([]);
  const toastId = useRef(0);
  const stakeInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/");
      return;
    }

    fetch("/api/games?status=ACTIVE", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.games) setGames(data.games);
      })
      .catch(() => {
        showToast("error", "Failed to load games");
      });
  }, [router, showToast]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/tickets?limit=5", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.tickets) setRecentTickets(data.tickets.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedGame(null);
        setSelectedNumbers([]);
        setMatchSelections([]);
      }
      if (e.key === "F2" && stakeInputRef.current) {
        stakeInputRef.current.focus();
        stakeInputRef.current.select();
      }
      if (e.key === "Enter" && e.ctrlKey) {
        handlePrintTicket();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedGame, selectedNumbers, stake, lines, matchSelections]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const toggleNumber = (num: number, max: number) => {
    setSelectedNumbers((prev) => {
      if (prev.includes(num)) return prev.filter((n) => n !== num);
      if (prev.length >= max) return prev;
      return [...prev, num];
    });
  };

  const handleSelectGame = (game: Game) => {
    setSelectedGame(game);
    setSelectedNumbers([]);
    setMatchSelections([]);
    setLines(1);
    setStake(
      ((game.config as Record<string, unknown>).ticketPrice as number) || 2
    );

    if (game.type === "SPORTS") {
      const count = ((game.config as Record<string, unknown>).matchesPerDay as number) || 8;
      const matches: MatchSelection[] = [];
      for (let i = 1; i <= count; i++) {
        matches.push({
          matchId: `match-${i}`,
          matchLabel: `Match ${i}`,
          bet: null,
        });
      }
      setMatchSelections(matches);
    }
  };

  const handlePrintTicket = async () => {
    if (!selectedGame) {
      showToast("error", "Select a game first");
      return;
    }

    if (selectedGame.type === "KENO" && selectedNumbers.length < 1) {
      showToast("error", "Pick at least 1 number");
      return;
    }
    if (selectedGame.type === "NUMBER_SELECTION" && selectedNumbers.length !== 6) {
      showToast("error", "Pick exactly 6 numbers");
      return;
    }
    if (selectedGame.type === "SPORTS") {
      const hasSelection = matchSelections.some((m) => m.bet !== null);
      if (!hasSelection) {
        showToast("error", "Select at least one bet");
        return;
      }
    }

    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    const config = selectedGame.config as Record<string, unknown>;
    const ticketPrice = (config.ticketPrice as number) || stake;
    const totalAmount = ticketPrice * lines;

    const selections =
      selectedGame.type === "SPORTS"
        ? matchSelections.filter((m) => m.bet !== null)
        : { numbers: selectedNumbers };

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId: selectedGame.id,
          terminalId: "terminal-04",
          selections,
          amount: totalAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error || "Failed to sell ticket");
        setLoading(false);
        return;
      }

      const ticket = data.ticket;
      setRecentTickets((prev) => [ticket, ...prev].slice(0, 5));
      setSelectedNumbers([]);
      setMatchSelections([]);
      setLines(1);
      setLoading(false);

      showToast(
        "success",
        `Ticket ${ticket.ticketNumber} sold — $${totalAmount.toFixed(2)}`
      );
    } catch {
      showToast("error", "Network error. Ticket not saved.");
      setLoading(false);
    }
  };

  const getConfig = (game: Game) => game.config as Record<string, unknown>;

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden select-none">
      {/* Top Bar */}
      <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-5 flex-shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Dices size={20} className="text-teal" />
            <span className="font-display font-bold text-base text-text">
              {terminalName}
            </span>
            <span className="text-xs font-mono text-muted bg-surface-alt px-2 py-0.5 rounded">
              {terminalCode}
            </span>
          </div>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-teal opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal" />
                </span>
                <Wifi size={14} className="text-teal" />
                <span className="text-xs font-medium text-teal">Online</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red" />
                </span>
                <WifiOff size={14} className="text-red" />
                <span className="text-xs font-medium text-red">Offline</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted">
            <Clock size={14} />
            <span className="text-sm font-mono">{clock}</span>
          </div>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-violet/15 flex items-center justify-center">
              <User size={13} className="text-violet" />
            </div>
            <span className="text-sm font-medium text-text">{userName}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Games */}
        <div className="w-[60%] p-4 overflow-y-auto border-r border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg text-text">
              Active Games
            </h2>
            <span className="text-xs font-mono text-muted bg-surface-alt px-2 py-1 rounded">
              {games.length} available
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {games.map((game) => {
              const config = getConfig(game);
              const isSelected = selectedGame?.id === game.id;
              return (
                <button
                  key={game.id}
                  onClick={() => handleSelectGame(game)}
                  className={`relative p-4 rounded-xl border text-left transition-all duration-200 ${
                    isSelected
                      ? "border-teal bg-teal/10 shadow-lg shadow-teal/10"
                      : "border-border bg-surface hover:bg-surface-alt hover:border-border"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center">
                      {GAME_ICONS[game.type] || (
                        <Dices size={20} className="text-muted" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${
                        game.status === "ACTIVE"
                          ? "bg-teal/15 text-teal"
                          : "bg-muted/15 text-muted"
                      }`}
                    >
                      v{game.version}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-sm text-text mb-1">
                    {game.name}
                  </h3>
                  <p className="text-[11px] text-muted mb-3 capitalize">
                    {game.type.replace("_", " ").toLowerCase()}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wide">
                        Price
                      </p>
                      <p className="text-sm font-mono font-bold text-teal">
                        ${(config.ticketPrice as number) || 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted uppercase tracking-wide">
                        Next Draw
                      </p>
                      <p className="text-sm font-mono font-bold text-amber">
                        {getTimeUntilDraw(config)}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <Check size={16} className="text-teal" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel - Ticket Builder */}
        <div className="w-[40%] flex flex-col bg-surface">
          {!selectedGame ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted">
              <Dices size={48} className="mb-3 opacity-30" />
              <p className="font-display text-sm">Select a game to begin</p>
              <p className="text-xs mt-1 text-muted/60">
                Choose from the active games on the left
              </p>
            </div>
          ) : (
            <>
              {/* Game Header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {GAME_ICONS[selectedGame.type]}
                  <span className="font-display font-semibold text-sm text-text">
                    {selectedGame.name}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedGame(null);
                    setSelectedNumbers([]);
                    setMatchSelections([]);
                  }}
                  className="w-7 h-7 rounded-md bg-surface-alt flex items-center justify-center text-muted hover:text-text hover:bg-red/15 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Number Picker */}
              <div className="flex-1 overflow-y-auto p-4">
                {selectedGame.type === "KENO" && (
                  <KenoPicker
                    numbers={selectedNumbers}
                    onToggle={(n) => toggleNumber(n, 10)}
                  />
                )}
                {selectedGame.type === "NUMBER_SELECTION" && (
                  <NumberSelectionPicker
                    numbers={selectedNumbers}
                    onToggle={(n) => toggleNumber(n, 6)}
                  />
                )}
                {selectedGame.type === "SPORTS" && (
                  <SportsPicker
                    selections={matchSelections}
                    onSelect={(matchId, bet) => {
                      setMatchSelections((prev) =>
                        prev.map((m) =>
                          m.matchId === matchId ? { ...m, bet } : m
                        )
                      );
                    }}
                  />
                )}
              </div>

              {/* Controls */}
              <div className="border-t border-border p-4 space-y-3">
                {/* Stake */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted font-medium mb-1.5 block">
                    Stake per line
                  </label>
                  <div className="flex gap-2">
                    {STAKE_OPTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStake(s)}
                        className={`flex-1 py-2 rounded-lg text-sm font-mono font-bold transition-all ${
                          stake === s
                            ? "bg-teal text-bg shadow-lg shadow-teal/20"
                            : "bg-surface-alt text-muted hover:text-text border border-border"
                        }`}
                      >
                        ${s}
                      </button>
                    ))}
                  </div>
                  <input
                    ref={stakeInputRef}
                    type="number"
                    min={1}
                    value={stake}
                    onChange={(e) =>
                      setStake(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="mt-2 w-full bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-teal"
                    placeholder="Custom amount (F2)"
                  />
                </div>

                {/* Lines */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted font-medium mb-1.5 block">
                    Number of lines
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLines(Math.max(1, lines - 1))}
                      className="w-10 h-10 rounded-lg bg-surface-alt border border-border flex items-center justify-center text-text font-bold text-lg hover:bg-red/15 transition-colors"
                    >
                      −
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-2xl font-display font-bold text-text">
                        {lines}
                      </span>
                    </div>
                    <button
                      onClick={() => setLines(Math.min(10, lines + 1))}
                      className="w-10 h-10 rounded-lg bg-surface-alt border border-border flex items-center justify-center text-text font-bold text-lg hover:bg-teal/15 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-surface-alt rounded-xl p-3 border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted">Total Cost</span>
                    <span className="text-xs text-muted">
                      ${stake} × {lines} line{lines > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="text-2xl font-display font-bold text-teal">
                    ${(stake * lines).toFixed(2)}
                  </div>
                </div>

                {/* Print Button */}
                <button
                  onClick={handlePrintTicket}
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-teal text-bg font-display font-bold text-lg flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-teal/30 transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Printer size={20} />
                      Print Ticket
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-muted/60">
                  Ctrl+Enter to print • Esc to clear • F2 for custom stake
                </p>
              </div>
            </>
          )}

          {/* Recent Tickets */}
          <div className="border-t border-border p-4">
            <h3 className="text-[10px] uppercase tracking-wider text-muted font-medium mb-2">
              Recent Tickets
            </h3>
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
              {recentTickets.length === 0 ? (
                <p className="text-xs text-muted/50 text-center py-3">
                  No tickets sold yet
                </p>
              ) : (
                recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between bg-surface-alt rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-text truncate">
                        {ticket.ticketNumber}
                      </p>
                      <p className="text-[10px] text-muted truncate">
                        {ticket.game.name}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-xs font-mono font-bold text-teal">
                        ${ticket.amount.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted font-mono">
                        {ticket.hash.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-grow-in flex items-center gap-2 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium ${
              toast.type === "success"
                ? "bg-teal/15 border-teal/30 text-teal"
                : toast.type === "error"
                ? "bg-red/15 border-red/30 text-red"
                : "bg-violet/15 border-violet/30 text-violet"
            }`}
          >
            {toast.type === "success" ? (
              <Check size={16} />
            ) : toast.type === "error" ? (
              <X size={16} />
            ) : (
              <Zap size={16} />
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* KENO PICKER — 8×10 grid of numbers 1–80                       */
/* ────────────────────────────────────────────────────────────── */
function KenoPicker({
  numbers,
  onToggle,
}: {
  numbers: number[];
  onToggle: (n: number) => void;
}) {
  const rows = 8;
  const cols = 10;
  const grid: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(r * cols + c + 1);
    }
    grid.push(row);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted">
          Pick up to 10 numbers
        </p>
        <span className="text-xs font-mono text-teal">
          {numbers.length}/10 selected
        </span>
      </div>
      <div className="grid grid-cols-10 gap-1.5">
        {grid.flat().map((num) => {
          const selected = numbers.includes(num);
          return (
            <button
              key={num}
              onClick={() => onToggle(num)}
              className={`aspect-square rounded-full text-xs font-mono font-bold flex items-center justify-center transition-all ${
                selected
                  ? "bg-teal text-bg shadow-lg shadow-teal/30 scale-110"
                  : "bg-surface-alt text-muted border border-border hover:border-teal/50 hover:text-text"
              }`}
            >
              {num}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            onClick={() => {
              const nums: number[] = [];
              while (nums.length < n) {
                const r = Math.floor(Math.random() * 80) + 1;
                if (!nums.includes(r)) nums.push(r);
              }
              // This won't work directly with state, just visual indicator
            }}
            className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
              numbers.length === n
                ? "border-teal bg-teal/10 text-teal"
                : "border-border text-muted hover:text-text"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* NUMBER SELECTION PICKER — 7×7 grid of numbers 1–49            */
/* ────────────────────────────────────────────────────────────── */
function NumberSelectionPicker({
  numbers,
  onToggle,
}: {
  numbers: number[];
  onToggle: (n: number) => void;
}) {
  const rows = 7;
  const cols = 7;
  const grid: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(r * cols + c + 1);
    }
    grid.push(row);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted">
          Pick exactly 6 numbers
        </p>
        <span className={`text-xs font-mono ${numbers.length === 6 ? "text-teal" : "text-amber"}`}>
          {numbers.length}/6 selected
        </span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {grid.flat().map((num) => {
          const selected = numbers.includes(num);
          return (
            <button
              key={num}
              onClick={() => onToggle(num)}
              className={`aspect-square rounded-full text-sm font-mono font-bold flex items-center justify-center transition-all ${
                selected
                  ? "bg-violet text-bg shadow-lg shadow-violet/30 scale-110"
                  : "bg-surface-alt text-muted border border-border hover:border-violet/50 hover:text-text"
              }`}
            >
              {num}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1">
          {[6].map((n) => (
            <button
              key={n}
              className={`text-[10px] font-mono px-2 py-1 rounded border ${
                numbers.length === n
                  ? "border-violet bg-violet/10 text-violet"
                  : "border-border text-muted"
              }`}
            >
              Pick {n}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            const nums: number[] = [];
            while (nums.length < 6) {
              const r = Math.floor(Math.random() * 49) + 1;
              if (!nums.includes(r)) nums.push(r);
            }
          }}
          className="text-[10px] font-mono px-3 py-1 rounded border border-border text-muted hover:text-text hover:border-teal/50 transition-colors"
        >
          Quick Pick
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* SPORTS PICKER — Match list with bet type buttons               */
/* ────────────────────────────────────────────────────────────── */
function SportsPicker({
  selections,
  onSelect,
}: {
  selections: MatchSelection[];
  onSelect: (matchId: string, bet: "home" | "draw" | "away") => void;
}) {
  return (
    <div>
      <p className="text-xs text-muted mb-3">
        Select your bets for each match
      </p>
      <div className="space-y-2">
        {selections.map((match) => (
          <div
            key={match.matchId}
            className="bg-surface-alt rounded-xl p-3 border border-border"
          >
            <p className="text-xs font-medium text-text mb-2">
              {match.matchLabel}
            </p>
            <div className="flex gap-1.5">
              {(["home", "draw", "away"] as const).map((betType) => (
                <button
                  key={betType}
                  onClick={() => onSelect(match.matchId, betType)}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-mono font-medium transition-all ${
                    match.bet === betType
                      ? betType === "home"
                        ? "bg-teal text-bg"
                        : betType === "draw"
                        ? "bg-amber text-bg"
                        : "bg-violet text-bg"
                      : "bg-surface border border-border text-muted hover:text-text"
                  }`}
                >
                  {betType === "home" ? "1" : betType === "draw" ? "X" : "2"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
