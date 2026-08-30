"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Plus,
  ChevronDown,
  Shield,
  Building2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  agencyId: string | null;
  terminalId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  agency: { id: string; name: string; code: string } | null;
}

const ROLE_BADGES: Record<string, string> = {
  SUPER_ADMIN: "bg-violet/15 text-violet",
  AGENCY_ADMIN: "bg-teal/15 text-teal",
  TERMINAL_SUPERVISOR: "bg-amber/15 text-amber",
  CASHIER: "bg-muted/15 text-muted",
  RISK_ANALYST: "bg-red/15 text-red",
  AUDITOR: "bg-violet/15 text-violet",
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  AGENCY_ADMIN: "Agency Admin",
  TERMINAL_SUPERVISOR: "Supervisor",
  CASHIER: "Cashier",
  RISK_ANALYST: "Risk Analyst",
  AUDITOR: "Auditor",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "CASHIER",
    agencyId: "",
  });

  const fetchUsers = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAgencies = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/agencies", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAgencies(data.agencies || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchAgencies();
  }, [fetchUsers, fetchAgencies]);

  const handleCreate = async () => {
    const token = localStorage.getItem("token");
    if (!token || !form.email || !form.password || !form.name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          role: form.role,
          agencyId: form.agencyId || undefined,
        }),
      });
      if (res.ok) {
        await fetchUsers();
        setForm({ email: "", password: "", name: "", role: "CASHIER", agencyId: "" });
        setShowForm(false);
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setToggling(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        await fetchUsers();
      }
    } catch {
      // silent
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text flex items-center gap-2">
            <Users size={24} className="text-teal" />
            User Management
          </h1>
          <p className="text-muted text-sm mt-1">Manage users, roles, and access control</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal text-bg text-sm font-semibold hover:bg-teal/90 transition-colors"
        >
          {showForm ? <XCircle size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "New User"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-surface border border-border rounded-xl p-5 animate-grow-in">
          <h3 className="font-display font-semibold text-text text-sm mb-4">Create User</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-teal/50"
            />
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-teal/50 font-mono"
            />
            <input
              placeholder="Password (min 8 chars)"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-teal/50 font-mono"
            />
            <div className="relative">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:border-teal/50 appearance-none"
              >
                <option value="CASHIER">Cashier</option>
                <option value="TERMINAL_SUPERVISOR">Supervisor</option>
                <option value="AGENCY_ADMIN">Agency Admin</option>
                <option value="RISK_ANALYST">Risk Analyst</option>
                <option value="AUDITOR">Auditor</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
            <button
              onClick={handleCreate}
              disabled={!form.email || !form.password || !form.name || creating}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-teal text-bg text-sm font-semibold hover:bg-teal/90 transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create
            </button>
          </div>
          {(form.role === "AGENCY_ADMIN" || form.role === "CASHIER" || form.role === "TERMINAL_SUPERVISOR") && (
            <div className="mt-3">
              <div className="relative max-w-xs">
                <select
                  value={form.agencyId}
                  onChange={(e) => setForm({ ...form, agencyId: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:border-teal/50 appearance-none"
                >
                  <option value="">Assign agency</option>
                  {agencies.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Agency</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Last Login</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-4 bg-surface-alt rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted text-sm">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const roleBadge = ROLE_BADGES[user.role] || ROLE_BADGES.CASHIER;
                  return (
                    <tr key={user.id} className="hover:bg-surface-alt/50 transition-colors animate-grow-in">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface-alt flex items-center justify-center flex-shrink-0">
                            <Shield size={14} className="text-muted" />
                          </div>
                          <div>
                            <p className="text-text font-medium text-sm">{user.name}</p>
                            <p className="text-xs font-mono text-muted">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleBadge}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.agency ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 size={12} className="text-teal" />
                            <span className="text-text text-xs">{user.agency.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {user.isActive ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal/15 text-teal">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red/15 text-red">
                            INACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user.lastLoginAt ? (
                          <span className="text-xs text-muted flex items-center gap-1 justify-end">
                            <Clock size={10} />
                            {new Date(user.lastLoginAt).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                          disabled={toggling === user.id}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                            user.isActive
                              ? "bg-red/10 text-red hover:bg-red/20"
                              : "bg-teal/10 text-teal hover:bg-teal/20"
                          } disabled:opacity-50`}
                        >
                          {toggling === user.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : user.isActive ? (
                            "Deactivate"
                          ) : (
                            "Activate"
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
