import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { PageHead, Stat } from "@/components/admin/ui";
import { HangerLoader, StatusPill } from "@/components/site/bits";
import { countsAsSale, useAdminExpenses, useAdminItems, useAdminLeads, useAdminOrders } from "@/lib/admin-data";
import { useAuth } from "@/lib/auth";
import { latestFive } from "@/lib/shop-rules";
import { isLeadStale, pkr, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Overview });

function Overview() {
  const { canFinance } = useAuth();
  const orders = useAdminOrders();
  const leads = useAdminLeads();
  const items = useAdminItems();
  const expenses = useAdminExpenses(canFinance);
  if (orders.isLoading || leads.isLoading || items.isLoading) return <HangerLoader />;

  const now = Date.now();
  const weekAgo = now - 7 * 864e5;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const o = orders.data ?? [];
  const weekSales = o.filter((x) => countsAsSale(x.status) && new Date(x.order_date).getTime() > weekAgo).reduce((s, x) => s + x.price, 0);
  const toShip = o.filter((x) => x.status === "Confirmed" || x.status === "Packed");
  const pendingLeads = (leads.data ?? []).filter((l) => l.status === "New" || l.status === "Contacted" || l.status === "Interested");
  const stale = (leads.data ?? []).filter((l) => isLeadStale(l));
  const costMap = new Map((items.data ?? []).map((i) => [i.id, i.cost_price]));
  const monthOrders = o.filter((x) => countsAsSale(x.status) && new Date(x.order_date) >= monthStart);
  const monthRev = monthOrders.reduce((s, x) => s + x.price, 0);
  const monthCost = monthOrders.reduce((s, x) => s + (costMap.get(x.item_id ?? "") ?? 0), 0);
  const monthExp = (expenses.data ?? []).filter((e) => new Date(e.date) >= monthStart && e.type !== "sourcing").reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageHead title="Good to see you ✿" sub="Here's the shop at a glance." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales this week" value={pkr(weekSales)} />
        <Stat label="Pending leads" value={String(pendingLeads.length)} hint={`${stale.length} need a reply`} />
        <Stat label="Orders to ship" value={String(toShip.length)} />
        {canFinance && <Stat label="Profit this month" value={pkr(monthRev - monthCost - monthExp)} hint="after item cost & expenses" />}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex justify-between"><h2 className="text-2xl font-semibold">To ship</h2><Link to="/admin/orders" className="text-sm text-primary">View all →</Link></div>
          {toShip.length === 0 && <p className="text-sm text-muted-foreground">All caught up!</p>}
          {latestFive(toShip).map((x) => (
            <div key={x.id} className="flex items-center justify-between border-t py-2 text-sm first:border-0">
              <span><b>{x.customers?.name}</b> · {x.items?.title}</span><StatusPill status={x.status} />
            </div>
          ))}
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex justify-between"><h2 className="text-2xl font-semibold">Waiting on a reply</h2><Link to="/admin/leads" className="text-sm text-primary">View all →</Link></div>
          {stale.length === 0 && <p className="text-sm text-muted-foreground">No one is waiting. Lovely.</p>}
          {latestFive(stale).map((l) => (
            <div key={l.id} className="flex items-center justify-between border-t py-2 text-sm first:border-0">
              <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" /><b>{l.customers?.name}</b> · {l.items?.title}</span>
              <span className="text-muted-foreground">{timeAgo(l.last_reply_at ?? l.first_contact_at)}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
