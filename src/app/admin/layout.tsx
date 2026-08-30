"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Code2,
  Building2,
  Ticket,
  Dices,
  Users,
  TriangleAlert,
  BarChart3,
  LogOut,
  ChevronRight,
  Shield,
} from "lucide-react";

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Game Engine", icon: Code2, href: "/admin/games" },
  { label: "Agencies", icon: Building2, href: "/admin/agencies" },
  { label: "Tickets", icon: Ticket, href: "/admin/tickets" },
  { label: "Draws", icon: Dices, href: "/admin/draws" },
  { label: "Users", icon: Users, href: "/admin/users" },
  { label: "Risk Console", icon: TriangleAlert, href: "/admin/risk" },
  { label: "Reports", icon: BarChart3, href: "/admin/reports" },
];

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  AGENCY_ADMIN: "Agency Admin",
  TERMINAL_SUPERVISOR: "Supervisor",
  CASHIER: "Cashier",
  RISK_ANALYST: "Risk Analyst",
  AUDITOR: "Auditor",
};

function getBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href?: string }[] = [];
  let href = "";
  for (const part of parts) {
    href += `/${part}`;
    const match = NAV.find((n) => n.href === href);
    crumbs.push({ label: match?.label || part.charAt(0).toUpperCase() + part.slice(1), href });
  }
  return crumbs;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [ready, setReady] = useState(false);
  const [sidebarHover, setSidebarHover] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/");
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setUser(data.user);
        setReady(true);
      })
      .catch(() => {
        localStorage.removeItem("token");
        router.replace("/");
      });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.replace("/");
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet border-t-transparent rounded-full animate-spin" />
          <span className="text-muted font-mono text-sm">Verifying session...</span>
        </div>
      </div>
    );
  }

  const crumbs = getBreadcrumbs(pathname);
  const currentNav = NAV.find((n) => pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href)));

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside className="w-[190px] flex-shrink-0 bg-surface border-r border-border flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-violet/15 flex items-center justify-center">
            <Dices className="w-4.5 h-4.5 text-violet" size={18} />
          </div>
          <span className="font-display font-semibold text-base text-text tracking-tight">
            Draw Control
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-teal/10 text-teal"
                    : "text-muted hover:text-text hover:bg-surface-alt"
                }`}
                onMouseEnter={() => setSidebarHover(item.href)}
                onMouseLeave={() => setSidebarHover(null)}
              >
                <Icon
                  size={17}
                  className={isActive ? "text-teal" : sidebarHover === item.href ? "text-text" : "text-muted"}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-violet/15 flex items-center justify-center flex-shrink-0">
              <Shield size={14} className="text-violet" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text truncate">{user?.name}</p>
              <p className="text-xs text-muted truncate">
                {ROLE_LABELS[user?.role || ""] || user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 mt-1 rounded-md text-sm text-muted hover:text-red hover:bg-red/10 transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-12 border-b border-border bg-surface flex items-center justify-between px-5 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-sm">
            {crumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight size={12} className="text-muted" />}
                {i < crumbs.length - 1 && crumb.href ? (
                  <Link href={crumb.href} className="text-muted hover:text-text transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-text font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-teal opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal" />
              </span>
              <span className="text-xs font-mono text-muted">LIVE</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 console-scroll">{children}</main>
      </div>
    </div>
  );
}
