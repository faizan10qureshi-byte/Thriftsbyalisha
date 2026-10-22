import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { BarChart3, Boxes, Home, LogOut, MessageSquareHeart, Package, Settings, Users, Wallet } from "lucide-react";
import { HangerLoader } from "@/components/site/bits";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => pageHead("Team dashboard", "Manage thriftsbyalisha shop operations.", true),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Overview", icon: Home, exact: true },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/collections", label: "Collections", icon: Boxes },
  { to: "/admin/inbox", label: "Chat inbox", icon: MessageSquareHeart },
  { to: "/admin/discounts", label: "Discount codes", icon: Package, admin: true },
  { to: "/admin/leads", label: "Leads", icon: MessageSquareHeart },
  { to: "/admin/orders", label: "Orders", icon: Package },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/finance", label: "Finance", icon: Wallet, finance: true },
  { to: "/admin/reports", label: "Sales insights", icon: BarChart3 },
  { to: "/admin/settings", label: "Teams & Permissions", icon: Settings, admin: true },
] as const;

function AdminLayout() {
  const { loading, isStaff, isAdmin, canFinance, user } = useAuth();
  if (loading) return <HangerLoader label="Opening the back room…" />;
  if (!isStaff && !canFinance) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm rounded-2xl border bg-card p-8 text-center shadow-soft">
          <h1 className="text-3xl font-semibold">Team only</h1>
          <p className="mt-2 text-sm text-muted-foreground">{user?.email} doesn't have dashboard access yet. Ask the owner to add you in Teams & Permissions.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button asChild variant="outline"><Link to="/">Storefront</Link></Button>
            <Button onClick={() => supabase.auth.signOut()}>Sign out</Button>
          </div>
        </div>
      </div>
    );
  }
  const nav = NAV.filter((n) => (isStaff || ("finance" in n) || n.to === "/admin/reports") && (!("finance" in n) || canFinance) && (!("admin" in n) || isAdmin));
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Link to="/" className="mb-6 px-2 font-display text-2xl font-bold italic">thriftsbyalisha</Link>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-sidebar-foreground transition hover:bg-sidebar-accent"
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

