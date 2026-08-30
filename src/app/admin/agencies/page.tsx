"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Monitor,
  ChevronRight,
  ChevronDown,
  Plus,
  Loader2,
  Wifi,
  WifiOff,
  Printer,
  MapPin,
  Clock,
  Users,
  Shield,
} from "lucide-react";

interface Agency {
  id: string;
  name: string;
  code: string;
  commission: number;
  salesLimit: number;
  status: string;
  parentId: string | null;
  parent: { id: string; name: string; code: string } | null;
  _count: { terminals: number; users: number; children: number };
}

interface Terminal {
  id: string;
  name: string;
  code: string;
  status: string;
  printerStatus: string;
  geoLocked: boolean;
  lastSyncAt: string | null;
  ipAddress: string | null;
  agencyId: string;
  agency: { id: string; name: string; code: string };
  _count: { tickets: number };
}

type TreeNode =
  | { kind: "super" }
  | { kind: "agency"; agency: Agency }
  | { kind: "terminal"; terminal: Terminal };

const AGENCY_STATUS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: "bg-teal/15", text: "text-teal" },
  SUSPENDED: { bg: "bg-red/15", text: "text-red" },
  INACTIVE: { bg: "bg-muted/15", text: "text-muted" },
};

const TERMINAL_STATUS: Record<string, { bg: string; text: string; icon: typeof Wifi }> = {
  ONLINE: { bg: "bg-teal/15", text: "text-teal", icon: Wifi },
  OFFLINE: { bg: "bg-red/15", text: "text-red", icon: WifiOff },
  SUSPENDED: { bg: "bg-amber/15", text: "text-amber", icon: WifiOff },
};

const PRINTER_STATUS: Record<string, { bg: string; text: string }> = {
  OK: { bg: "bg-teal/15", text: "text-teal" },
  LOW_PAPER: { bg: "bg-amber/15", text: "text-amber" },
  ERROR: { bg: "bg-red/15", text: "text-red" },
  OFFLINE: { bg: "bg-muted/15", text: "text-muted" },
};

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<TreeNode>({ kind: "super" });
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState<"agency" | "terminal" | null>(null);
  const [creating, setCreating] = useState(false);

  const [agencyForm, setAgencyForm] = useState({ name: "", code: "", commission: 5, salesLimit: 100000, parentId: "" });
  const [terminalForm, setTerminalForm] = useState({ name: "", code: "", agencyId: "", geoLat: "", geoLng: "", ipAddress: "" });

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const [agRes, terRes] = await Promise.all([
        fetch("/api/agencies", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/terminals", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (agRes.ok) {
        const data = await agRes.json();
        setAgencies(data.agencies || []);
      }
      if (terRes.ok) {
        const data = await terRes.json();
        setTerminals(data.terminals || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = (id: string) => {
    setExpandedAgencies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getTerminalsForAgency = (agencyId: string) =>
    terminals.filter((t) => t.agencyId === agencyId);

  const topAgencies = agencies.filter((a) => !a.parentId);

  const handleCreateAgency = async () => {
    const token = localStorage.getItem("token");
    if (!token || !agencyForm.name || !agencyForm.code) return;
    setCreating(true);
    try {
      const res = await fetch("/api/agencies", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agencyForm.name,
          code: agencyForm.code,
          commission: agencyForm.commission,
          salesLimit: agencyForm.salesLimit,
          parentId: agencyForm.parentId || undefined,
        }),
      });
      if (res.ok) {
        await fetchData();
        setAgencyForm({ name: "", code: "", commission: 5, salesLimit: 100000, parentId: "" });
        setShowCreateForm(null);
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  const handleCreateTerminal = async () => {
    const token = localStorage.getItem("token");
    if (!token || !terminalForm.name || !terminalForm.code || !terminalForm.agencyId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/terminals", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: terminalForm.name,
          code: terminalForm.code,
          agencyId: terminalForm.agencyId,
          geoLat: terminalForm.geoLat ? Number(terminalForm.geoLat) : undefined,
          geoLng: terminalForm.geoLng ? Number(terminalForm.geoLng) : undefined,
          ipAddress: terminalForm.ipAddress || undefined,
        }),
      });
      if (res.ok) {
        await fetchData();
        setTerminalForm({ name: "", code: "", agencyId: "", geoLat: "", geoLng: "", ipAddress: "" });
        setShowCreateForm(null);
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text flex items-center gap-2">
            <Building2 size={24} className="text-violet" />
            Agencies &amp; Terminals
          </h1>
          <p className="text-muted text-sm mt-1">Manage hierarchy, commissions, and terminal fleet</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateForm(showCreateForm === "agency" ? null : "agency")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text hover:bg-surface-alt transition-colors"
          >
            <Plus size={14} />
            Agency
          </button>
          <button
            onClick={() => setShowCreateForm(showCreateForm === "terminal" ? null : "terminal")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal text-bg text-sm font-semibold hover:bg-teal/90 transition-colors"
          >
            <Plus size={14} />
            Terminal
          </button>
        </div>
      </div>

      {/* Create forms */}
      {showCreateForm === "agency" && (
        <div className="bg-surface border border-border rounded-xl p-5 animate-grow-in">
          <h3 className="font-display font-semibold text-text text-sm mb-4">Create Agency</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              placeholder="Agency name"
              value={agencyForm.name}
              onChange={(e) => setAgencyForm({ ...agencyForm, name: e.target.value })}
              className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-teal/50"
            />
            <input
              placeholder="Code (e.g. A001)"
              value={agencyForm.code}
              onChange={(e) => setAgencyForm({ ...agencyForm, code: e.target.value })}
              className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-teal/50 font-mono"
            />
            <input
              type="number"
              placeholder="Commission %"
              value={agencyForm.commission}
              onChange={(e) => setAgencyForm({ ...agencyForm, commission: Number(e.target.value) })}
              className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-teal/50 font-mono"
            />
            <button
              onClick={handleCreateAgency}
              disabled={!agencyForm.name || !agencyForm.code || creating}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-teal text-bg text-sm font-semibold hover:bg-teal/90 transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create
            </button>
          </div>
        </div>
      )}

      {showCreateForm === "terminal" && (
        <div className="bg-surface border border-border rounded-xl p-5 animate-grow-in">
          <h3 className="font-display font-semibold text-text text-sm mb-4">Create Terminal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              placeholder="Terminal name"
              value={terminalForm.name}
              onChange={(e) => setTerminalForm({ ...terminalForm, name: e.target.value })}
              className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-teal/50"
            />
            <input
              placeholder="Code (e.g. T001)"
              value={terminalForm.code}
              onChange={(e) => setTerminalForm({ ...terminalForm, code: e.target.value })}
              className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-teal/50 font-mono"
            />
            <select
              value={terminalForm.agencyId}
              onChange={(e) => setTerminalForm({ ...terminalForm, agencyId: e.target.value })}
              className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:border-teal/50"
            >
              <option value="">Select agency</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.code})
                </option>
              ))}
            </select>
            <button
              onClick={handleCreateTerminal}
              disabled={!terminalForm.name || !terminalForm.code || !terminalForm.agencyId || creating}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-teal text-bg text-sm font-semibold hover:bg-teal/90 transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Hierarchy tree */}
        <div>
          <h2 className="font-display font-semibold text-text text-sm mb-3">Hierarchy</h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 bg-surface-alt rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* Super Admin root */}
                <button
                  onClick={() => setSelectedNode({ kind: "super" })}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-left transition-colors ${
                    selectedNode.kind === "super" ? "bg-violet/10" : "hover:bg-surface-alt"
                  }`}
                >
                  <Shield size={16} className="text-violet flex-shrink-0" />
                  <span className="text-sm font-medium text-text">Super Admin</span>
                </button>

                {topAgencies.map((agency) => {
                  const agencyTerminals = getTerminalsForAgency(agency.id);
                  const isExpanded = expandedAgencies.has(agency.id);
                  const agencyBadge = AGENCY_STATUS[agency.status] || AGENCY_STATUS.ACTIVE;

                  return (
                    <div key={agency.id}>
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleExpand(agency.id)}
                          className="px-3 py-1 text-muted hover:text-text transition-colors"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <button
                          onClick={() => setSelectedNode({ kind: "agency", agency })}
                          className={`flex-1 flex items-center gap-2 py-3 text-left transition-colors ${
                            selectedNode.kind === "agency" && selectedNode.agency.id === agency.id
                              ? "bg-teal/10"
                              : "hover:bg-surface-alt"
                          }`}
                        >
                          <Building2 size={15} className="text-teal flex-shrink-0" />
                          <span className="text-sm text-text truncate">{agency.name}</span>
                          <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${agencyBadge.bg} ${agencyBadge.text} ml-auto flex-shrink-0`}>
                            {agency._count.terminals}
                          </span>
                        </button>
                      </div>

                      {isExpanded && agencyTerminals.length > 0 && (
                        <div className="bg-surface-alt/30">
                          {agencyTerminals.map((terminal) => {
                            const terBadge = TERMINAL_STATUS[terminal.status] || TERMINAL_STATUS.OFFLINE;
                            const TerIcon = terBadge.icon;
                            return (
                              <button
                                key={terminal.id}
                                onClick={() => setSelectedNode({ kind: "terminal", terminal })}
                                className={`w-full flex items-center gap-2 pl-10 pr-4 py-2.5 text-left transition-colors ${
                                  selectedNode.kind === "terminal" && selectedNode.terminal.id === terminal.id
                                    ? "bg-teal/10"
                                    : "hover:bg-surface-alt/50"
                                }`}
                              >
                                <TerIcon size={13} className={terBadge.text} />
                                <span className="text-xs text-text truncate">{terminal.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Sub-agencies */}
                {agencies.filter((a) => a.parentId).map((agency) => {
                  const isExpanded = expandedAgencies.has(agency.id);
                  const agencyBadge = AGENCY_STATUS[agency.status] || AGENCY_STATUS.ACTIVE;
                  const agencyTerminals = getTerminalsForAgency(agency.id);

                  return (
                    <div key={agency.id}>
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleExpand(agency.id)}
                          className="px-3 py-1 text-muted hover:text-text transition-colors"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <button
                          onClick={() => setSelectedNode({ kind: "agency", agency })}
                          className={`flex-1 flex items-center gap-2 py-3 text-left transition-colors ${
                            selectedNode.kind === "agency" && selectedNode.agency.id === agency.id
                              ? "bg-teal/10"
                              : "hover:bg-surface-alt"
                          }`}
                        >
                          <Building2 size={15} className="text-teal flex-shrink-0" />
                          <span className="text-sm text-text truncate">{agency.name}</span>
                          <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${agencyBadge.bg} ${agencyBadge.text} ml-auto flex-shrink-0`}>
                            {agency._count.terminals}
                          </span>
                        </button>
                      </div>

                      {isExpanded && agencyTerminals.length > 0 && (
                        <div className="bg-surface-alt/30">
                          {agencyTerminals.map((terminal) => {
                            const terBadge = TERMINAL_STATUS[terminal.status] || TERMINAL_STATUS.OFFLINE;
                            const TerIcon = terBadge.icon;
                            return (
                              <button
                                key={terminal.id}
                                onClick={() => setSelectedNode({ kind: "terminal", terminal })}
                                className={`w-full flex items-center gap-2 pl-10 pr-4 py-2.5 text-left transition-colors ${
                                  selectedNode.kind === "terminal" && selectedNode.terminal.id === terminal.id
                                    ? "bg-teal/10"
                                    : "hover:bg-surface-alt/50"
                                }`}
                              >
                                <TerIcon size={13} className={terBadge.text} />
                                <span className="text-xs text-text truncate">{terminal.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Detail panel */}
        <div className="lg:col-span-2">
          <h2 className="font-display font-semibold text-text text-sm mb-3">Details</h2>
          <div className="bg-surface border border-border rounded-xl p-6">
            {selectedNode.kind === "super" && (
              <div className="text-center py-12">
                <Shield size={40} className="mx-auto text-violet mb-4" />
                <h3 className="font-display font-semibold text-text text-lg">Super Admin</h3>
                <p className="text-muted text-sm mt-2 max-w-md mx-auto">
                  Root of the agency hierarchy. Select an agency or terminal from the tree to view details.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  <div className="bg-surface-alt rounded-lg p-4 text-center">
                    <p className="font-mono text-2xl font-bold text-text">{agencies.length}</p>
                    <p className="text-xs text-muted mt-1">Agencies</p>
                  </div>
                  <div className="bg-surface-alt rounded-lg p-4 text-center">
                    <p className="font-mono text-2xl font-bold text-text">{terminals.length}</p>
                    <p className="text-xs text-muted mt-1">Terminals</p>
                  </div>
                </div>
              </div>
            )}

            {selectedNode.kind === "agency" && (
              <div className="animate-grow-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center">
                    <Building2 size={22} className="text-teal" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-text">{selectedNode.agency.name}</h3>
                    <p className="text-xs font-mono text-muted">{selectedNode.agency.code}</p>
                  </div>
                  {(() => {
                    const badge = AGENCY_STATUS[selectedNode.agency.status] || AGENCY_STATUS.ACTIVE;
                    return (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${badge.bg} ${badge.text} ml-auto`}>
                        {selectedNode.agency.status}
                      </span>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-surface-alt rounded-lg p-3">
                    <p className="text-xs text-muted">Commission</p>
                    <p className="font-mono text-lg font-bold text-text">{selectedNode.agency.commission}%</p>
                  </div>
                  <div className="bg-surface-alt rounded-lg p-3">
                    <p className="text-xs text-muted">Sales Limit</p>
                    <p className="font-mono text-lg font-bold text-text">${selectedNode.agency.salesLimit.toLocaleString()}</p>
                  </div>
                  <div className="bg-surface-alt rounded-lg p-3">
                    <p className="text-xs text-muted">Terminals</p>
                    <p className="font-mono text-lg font-bold text-text">{selectedNode.agency._count.terminals}</p>
                  </div>
                  <div className="bg-surface-alt rounded-lg p-3">
                    <p className="text-xs text-muted">Users</p>
                    <p className="font-mono text-lg font-bold text-text">{selectedNode.agency._count.users}</p>
                  </div>
                </div>

                {selectedNode.agency.parent && (
                  <div className="text-xs text-muted mb-4">
                    Parent: <span className="text-text font-medium">{selectedNode.agency.parent.name}</span>
                  </div>
                )}

                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Terminals</h4>
                <div className="space-y-2">
                  {getTerminalsForAgency(selectedNode.agency.id).map((terminal) => {
                    const terBadge = TERMINAL_STATUS[terminal.status] || TERMINAL_STATUS.OFFLINE;
                    const TerIcon = terBadge.icon;
                    return (
                      <div
                        key={terminal.id}
                        className="flex items-center gap-3 p-3 bg-surface-alt rounded-lg cursor-pointer hover:bg-surface-alt/80 transition-colors"
                        onClick={() => setSelectedNode({ kind: "terminal", terminal })}
                      >
                        <TerIcon size={15} className={terBadge.text} />
                        <span className="text-sm text-text flex-1">{terminal.name}</span>
                        <span className="text-xs font-mono text-muted">{terminal.code}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${terBadge.bg} ${terBadge.text}`}>
                          {terminal.status}
                        </span>
                      </div>
                    );
                  })}
                  {getTerminalsForAgency(selectedNode.agency.id).length === 0 && (
                    <p className="text-xs text-muted text-center py-4">No terminals</p>
                  )}
                </div>
              </div>
            )}

            {selectedNode.kind === "terminal" && (
              <div className="animate-grow-in">
                <div className="flex items-center gap-3 mb-6">
                  {(() => {
                    const terBadge = TERMINAL_STATUS[selectedNode.terminal.status] || TERMINAL_STATUS.OFFLINE;
                    const TerIcon = terBadge.icon;
                    return (
                      <>
                        <div className={`w-12 h-12 rounded-xl ${terBadge.bg} flex items-center justify-center`}>
                          <TerIcon size={22} className={terBadge.text} />
                        </div>
                        <div>
                          <h3 className="font-display font-semibold text-text">{selectedNode.terminal.name}</h3>
                          <p className="text-xs font-mono text-muted">{selectedNode.terminal.code}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${terBadge.bg} ${terBadge.text} ml-auto`}>
                          {selectedNode.terminal.status}
                        </span>
                      </>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  <div className="bg-surface-alt rounded-lg p-3">
                    <p className="text-xs text-muted flex items-center gap-1">
                      <Printer size={11} /> Printer
                    </p>
                    {(() => {
                      const pBadge = PRINTER_STATUS[selectedNode.terminal.printerStatus] || PRINTER_STATUS.OK;
                      return (
                        <p className={`text-sm font-bold mt-1 ${pBadge.text}`}>
                          {selectedNode.terminal.printerStatus.replace("_", " ")}
                        </p>
                      );
                    })()}
                  </div>
                  <div className="bg-surface-alt rounded-lg p-3">
                    <p className="text-xs text-muted flex items-center gap-1">
                      <MapPin size={11} /> Geo-lock
                    </p>
                    <p className={`text-sm font-bold mt-1 ${selectedNode.terminal.geoLocked ? "text-teal" : "text-muted"}`}>
                      {selectedNode.terminal.geoLocked ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  <div className="bg-surface-alt rounded-lg p-3">
                    <p className="text-xs text-muted flex items-center gap-1">
                      <Clock size={11} /> Last Sync
                    </p>
                    <p className="text-sm font-bold text-text mt-1">
                      {selectedNode.terminal.lastSyncAt
                        ? new Date(selectedNode.terminal.lastSyncAt).toLocaleTimeString()
                        : "Never"}
                    </p>
                  </div>
                  <div className="bg-surface-alt rounded-lg p-3">
                    <p className="text-xs text-muted flex items-center gap-1">
                      <Wifi size={11} /> IP Address
                    </p>
                    <p className="text-sm font-mono font-bold text-text mt-1">
                      {selectedNode.terminal.ipAddress || "N/A"}
                    </p>
                  </div>
                  <div className="bg-surface-alt rounded-lg p-3">
                    <p className="text-xs text-muted flex items-center gap-1">
                      <Users size={11} /> Agency
                    </p>
                    <p className="text-sm font-bold text-text mt-1">{selectedNode.terminal.agency.name}</p>
                  </div>
                  <div className="bg-surface-alt rounded-lg p-3">
                    <p className="text-xs text-muted">Tickets Sold</p>
                    <p className="font-mono text-lg font-bold text-text mt-1">{selectedNode.terminal._count.tickets}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
