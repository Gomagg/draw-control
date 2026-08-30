"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Ticket,
  Search,
  ChevronDown,
  ChevronRight,
  Hash,
  ArrowRight,
  Clock,
  Filter,
  Loader2,
} from "lucide-react";

interface TicketRecord {
  id: string;
  ticketNumber: string;
  selections: number[];
  amount: number;
  status: string;
  hash: string;
  prevHash: string;
  createdAt: string;
  printedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  payoutAmount: number | null;
  game: { id: string; name: string; type: string };
  terminal: { id: string; name: string; code: string };
  user: { id: string; name: string };
}

interface Game {
  id: string;
  name: string;
}

const STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-amber/15 text-amber",
  CONFIRMED: "bg-teal/15 text-teal",
  PRINTED: "bg-teal/15 text-teal",
  CANCELLED: "bg-red/15 text-red",
  WIN: "bg-violet/15 text-violet",
  LOSS: "bg-muted/15 text-muted",
  SETTLED: "bg-teal/15 text-teal",
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    gameId: "",
    status: "",
    search: "",
    dateFrom: "",
    dateTo: "",
  });

  const fetchTickets = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (filters.gameId) params.set("gameId", filters.gameId);
      if (filters.status) params.set("status", filters.status);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const res = await fetch(`/api/tickets?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        let list = data.tickets || [];
        if (filters.search) {
          const q = filters.search.toLowerCase();
          list = list.filter((t: TicketRecord) => t.ticketNumber.toLowerCase().includes(q));
        }
        setTickets(list);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const fetchGames = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/games", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setGames((data.games || []).map((g: Game & { id: string }) => ({ id: g.id, name: g.name })));
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-text flex items-center gap-2">
          <Ticket size={24} className="text-amber" />
          Ticket Audit Trail
        </h1>
        <p className="text-muted text-sm mt-1">Hash-chained ticket ledger with full lifecycle</p>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-muted" />
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              placeholder="Ticket #"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-9 pr-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-teal/50 font-mono"
            />
          </div>
          <div className="relative">
            <select
              value={filters.gameId}
              onChange={(e) => { setFilters({ ...filters, gameId: e.target.value }); setPage(1); }}
              className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:border-teal/50 appearance-none"
            >
              <option value="">All Games</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
              className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:border-teal/50 appearance-none"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PRINTED">Printed</option>
              <option value="WIN">Win</option>
              <option value="LOSS">Loss</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="SETTLED">Settled</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => { setFilters({ ...filters, dateFrom: e.target.value }); setPage(1); }}
            className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:border-teal/50"
            placeholder="From"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => { setFilters({ ...filters, dateTo: e.target.value }); setPage(1); }}
            className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:border-teal/50"
            placeholder="To"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Ticket #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Game</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Terminal</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Hash Chain</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-4 bg-surface-alt rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted text-sm">
                    No tickets found
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-surface-alt/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {expandedTicket === ticket.id ? (
                          <ChevronDown size={14} className="text-muted" />
                        ) : (
                          <ChevronRight size={14} className="text-muted" />
                        )}
                        <span className="font-mono text-text text-xs">{ticket.ticketNumber}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text">{ticket.game?.name}</td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">{ticket.terminal?.code}</td>
                    <td className="px-4 py-3 text-right font-mono text-text">${ticket.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGES[ticket.status] || "bg-muted/15 text-muted"}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-[10px] font-mono text-muted">
                        <Hash size={10} />
                        <span className="truncate max-w-[80px]">{ticket.hash.slice(0, 12)}...</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}

              {/* Expanded detail row */}
              {!loading &&
                tickets
                  .filter((t) => expandedTicket === t.id)
                  .map((ticket) => (
                    <tr key={`${ticket.id}-detail`} className="bg-surface-alt/30 animate-grow-in">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                          <div>
                            <p className="text-muted mb-1">Selections</p>
                            <div className="flex flex-wrap gap-1">
                              {(ticket.selections || []).map((n: number, i: number) => (
                                <span key={i} className="w-7 h-7 rounded-md bg-teal/10 text-teal font-mono font-bold flex items-center justify-center text-xs">
                                  {n}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-muted mb-1">Hash Chain</p>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <ArrowRight size={10} className="text-muted" />
                                <span className="text-muted">prev:</span>
                                <span className="font-mono text-text truncate">{ticket.prevHash.slice(0, 16)}...</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <ArrowRight size={10} className="text-teal" />
                                <span className="text-muted">hash:</span>
                                <span className="font-mono text-teal truncate">{ticket.hash.slice(0, 16)}...</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-muted mb-1">Lifecycle</p>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Clock size={10} className="text-muted" />
                                <span className="text-muted">Created:</span>
                                <span className="text-text">{new Date(ticket.createdAt).toLocaleTimeString()}</span>
                              </div>
                              {ticket.printedAt && (
                                <div className="flex items-center gap-1.5">
                                  <Clock size={10} className="text-teal" />
                                  <span className="text-muted">Printed:</span>
                                  <span className="text-text">{new Date(ticket.printedAt).toLocaleTimeString()}</span>
                                </div>
                              )}
                              {ticket.cancelledAt && (
                                <div className="flex items-center gap-1.5">
                                  <Clock size={10} className="text-red" />
                                  <span className="text-muted">Cancelled:</span>
                                  <span className="text-text">{new Date(ticket.cancelledAt).toLocaleTimeString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-muted mb-1">Details</p>
                            <div className="space-y-1">
                              <p className="text-text">Agent: <span className="text-muted">{ticket.user?.name}</span></p>
                              {ticket.payoutAmount && (
                                <p className="text-text">Payout: <span className="text-teal font-mono">${ticket.payoutAmount.toFixed(2)}</span></p>
                              )}
                              {ticket.cancelReason && (
                                <p className="text-text">Reason: <span className="text-red">{ticket.cancelReason}</span></p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-xs text-muted">
            {total} tickets &middot; Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-md bg-surface-alt text-sm text-text hover:bg-surface-alt/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-md bg-surface-alt text-sm text-text hover:bg-surface-alt/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
