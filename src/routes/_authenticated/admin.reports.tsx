import { createFileRoute } from "@tanstack/react-router";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHead, Stat } from "@/components/admin/ui";
import { HangerLoader } from "@/components/site/bits";
import { countsAsSale, useAdminCustomers, useAdminLeads, useAdminOrders, weekKey } from "@/lib/admin-data";
import { isLeadStale, pkr, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/reports")({ component: Reports });

function Reports() {
  const orders = useAdminOrders();
  const leads = useAdminLeads();
  const customers = useAdminCustomers();
  if (orders.isLoading || leads.isLoading || customers.isLoading) return <HangerLoader />;

  const sales = (orders.data ?? []).filter((o) => countsAsSale(o.status));
  const weeks = new Map<string, number>();
  sales.forEach((o) => { const k = weekKey(new Date(o.order_date)); weeks.set(k, (weeks.get(k) ?? 0) + o.price); });
  const trend = [...weeks.entries()].sort().map(([k, v]) => ({ week: k.slice(5), sales: v }));
  const byCat = new Map<string, number>();
  sales.forEach((o) => { const c = o.items?.category ?? "other"; byCat.set(c, (byCat.get(c) ?? 0) + 1); });
  const best = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
  const perCust = new Map<string, number>();
  sales.forEach((o) => perCust.set(o.customer_id, (perCust.get(o.customer_id) ?? 0) + 1));
  const buyers = perCust.size;
  const repeat = [...perCust.values()].filter((n) => n > 1).length;
  const stale = (leads.data ?? []).filter((l) => isLeadStale(l))
    .sort((a, b) => new Date(a.last_reply_at ?? a.first_contact_at).getTime() - new Date(b.last_reply_at ?? b.first_contact_at).getTime());

  return (
    <div>
      <PageHead title="Reports" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total sales" value={pkr(sales.reduce((s, o) => s + o.price, 0))} hint={`${sales.length} orders`} />
        <Stat label="Best category" value={best ? best[0][0].toUpperCase() + best[0].slice(1) : "—"} hint={best ? `${best[1]} sold` : ""} />
        <Stat label="Repeat rate" value={buyers ? `${Math.round((repeat / buyers) * 100)}%` : "—"} hint={`${repeat} of ${buyers} buyers`} />
        <Stat label="Unanswered leads" value={String(stale.length)} />
      </div>
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-2xl font-semibold">Weekly sales trend</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" fontSize={12} /><YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => pkr(v)} />
              <Line type="monotone" dataKey="sales" stroke="var(--chart-1)" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="text-2xl font-semibold">Top unresponded leads</h2>
        {stale.slice(0, 8).map((l) => (
          <div key={l.id} className="flex justify-between border-t py-2 text-sm">
            <span><b>{l.customers?.name}</b> · {l.items?.title} <span className="text-muted-foreground">({l.source})</span></span>
            <span className="font-semibold text-destructive">{timeAgo(l.last_reply_at ?? l.first_contact_at)}</span>
          </div>
        ))}
        {!stale.length && <p className="text-sm text-muted-foreground">Everyone's been answered.</p>}
      </div>
    </div>
  );
}
