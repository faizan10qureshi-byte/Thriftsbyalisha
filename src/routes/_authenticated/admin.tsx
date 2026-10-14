import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { BarChart3, Boxes, Home, LogOut, MessageSquareHeart, Package, Settings, Users, Wallet } from "lucide-react";
import { HangerLoader } from "@/components/site/bits";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Dashboard — thriftsbyalisha" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Overview", icon: Home, exact: true },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/leads", label: "Leads", icon: MessageSquareHeart },
  { to: "/admin/orders", label: "Orders", icon: Package },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/finance", label: "Finance", icon: Wallet, finance: true },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings, admin: true },
] as const;

function AdminLayout() {
  const { loading, isStaff, isAdmin, canFinance, user } = useAuth();
  if (loading) return <HangerLoader label="Opening the back room…" />;
  if (!isStaff && !canFinance) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm rounded-2xl border bg-card p-8 text-center shadow-soft">
          <h1 className="text-3xl font-semibold">Team only</h1>
          <p className="mt-2 text-sm text-muted-foreground">{user?.email} doesn't have dashboard access yet. Ask the owner to add you in Settings.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button asChild variant="outline"><Link to="/">Storefront</Link></Button>
            <Button onClick={() => supabase.auth.signOut()}>Sign out</Button>
          </div>
        </div>
      </div>
    );
  }
  const nav = NAV.filter((n) => (!("finance" in n) || canFinance) && (!("admin" in n) || isAdmin));
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Link to="/" className="mb-6 px-2 font-display text-2xl font-bold italic">thriftsbyalisha</Link>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-sidebar-foreground transition hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-primary" }}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <p className="truncate px-2 text-xs text-muted-foreground">{user?.email}</p>
        <button onClick={() => supabase.auth.signOut()} className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-sidebar-accent"><LogOut className="h-4 w-4" /> Sign out</button>
      </aside>
      <div className="min-w-0 flex-1">
        <nav className="flex gap-1 overflow-x-auto border-b bg-sidebar p-2 md:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold" activeProps={{ className: "bg-primary text-primary-foreground" }}>{n.label}</Link>
          ))}
        </nav>
        <main className="mx-auto max-w-6xl p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-4xl font-semibold">{title}</h1>{sub && <p className="text-sm text-muted-foreground">{sub}</p>}</div>
      {children}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
