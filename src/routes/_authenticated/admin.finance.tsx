import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHead, Stat } from "@/components/admin/ui";
import { HangerLoader } from "@/components/site/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  countsAsSale,
  useAdminExpenses,
  useAdminItems,
  useAdminOrders,
  useRefreshAdmin,
  weekKey,
} from "@/lib/admin-data";
import { useAuth } from "@/lib/auth";
import { EXPENSE_TYPES, pkr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/finance")({ component: Finance });

function Finance() {
  const { canFinance } = useAuth();
  const orders = useAdminOrders();
  const items = useAdminItems();
  const expenses = useAdminExpenses(canFinance);
  const refresh = useRefreshAdmin();
  const [f, setF] = useState({
    type: "sourcing",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  if (!canFinance)
    return <p className="text-muted-foreground">Finance is visible to the owner only.</p>;
  if (orders.isLoading || items.isLoading || expenses.isLoading) return <HangerLoader />;

  const cost = new Map((items.data ?? []).map((i) => [i.id, { c: i.cost_price, t: i.title }]));
  const sales = (orders.data ?? []).filter((o) => countsAsSale(o.status));
  const exp = expenses.data ?? [];
  // Item cost is counted per sale; "sourcing" expenses are the cash spent at bazaars (shown separately).
  const weeks = new Map<
    string,
    { week: string; revenue: number; profit: number; expenses: number }
  >();
  const bump = (k: string) =>
    weeks.get(k) ?? weeks.set(k, { week: k.slice(5), revenue: 0, profit: 0, expenses: 0 }).get(k)!;
  for (const o of sales) {
    const w = bump(weekKey(new Date(o.order_date)));
    w.revenue += o.price;
    w.profit += o.price - (cost.get(o.item_id ?? "")?.c ?? 0);
  }
  for (const e of exp) {
    if (e.type === "sourcing") continue;
    const w = bump(weekKey(new Date(e.date)));
    w.expenses += e.amount;
    w.profit -= e.amount;
  }
  const chart = [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  const revenue = sales.reduce((s, o) => s + o.price, 0);
  const opEx = exp.filter((e) => e.type !== "sourcing").reduce((s, e) => s + e.amount, 0);
  const sourcing = exp.filter((e) => e.type === "sourcing").reduce((s, e) => s + e.amount, 0);
  const itemCost = sales.reduce((s, o) => s + (cost.get(o.item_id ?? "")?.c ?? 0), 0);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from("expenses")
      .insert({ type: f.type, amount: +f.amount, date: f.date, note: f.note || null });
    if (error) toast.error(error.message);
    else {
      setF({ ...f, amount: "", note: "" });
      refresh();
    }
  };

  return (
    <div>
      <PageHead
        title="Finance"
        sub="Profit = sale price − item cost − ads, packaging & delivery."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue" value={pkr(revenue)} />
        <Stat label="Item cost sold" value={pkr(itemCost)} />
        <Stat
          label="Running expenses"
          value={pkr(opEx)}
          hint={`+ ${pkr(sourcing)} spent sourcing`}
        />
        <Stat label="Net profit" value={pkr(revenue - itemCost - opEx)} />
      </div>
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-2xl font-semibold">Weekly profit</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => pkr(v)} />
              <Bar dataKey="revenue" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="profit" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expenses" fill="var(--chart-3)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-2xl font-semibold">Log expense</h2>
          <form onSubmit={add} className="mt-3 grid grid-cols-2 gap-2">
            <select
              value={f.type}
              onChange={(e) => setF({ ...f, type: e.target.value })}
              className="h-10 rounded-md border bg-background px-2 text-sm capitalize"
            >
              {EXPENSE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <Input
              required
              type="number"
              placeholder="Amount (Rs.)"
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })}
            />
            <Input
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
            <Input
              placeholder="Note"
              value={f.note}
              onChange={(e) => setF({ ...f, note: e.target.value })}
            />
            <Button className="col-span-2">Add expense</Button>
          </form>
          <div className="mt-4 max-h-64 overflow-y-auto text-sm">
            {exp.map((e) => (
              <div key={e.id} className="flex justify-between border-t py-1.5">
                <span className="capitalize">
                  {e.date} · {e.type} <span className="text-muted-foreground">{e.note}</span>
                </span>
                <b>{pkr(e.amount)}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-2xl font-semibold">Profit per item sold</h2>
          <div className="mt-3 max-h-96 overflow-y-auto text-sm">
            {sales.map((o) => {
              const c = cost.get(o.item_id ?? "");
              return (
                <div key={o.id} className="flex justify-between border-t py-1.5">
                  <span>{c?.t ?? o.items?.title}</span>
                  <span>
                    <span className="text-muted-foreground">
                      {pkr(o.price)} − {pkr(c?.c)} ={" "}
                    </span>
                    <b className="text-success">{pkr(o.price - (c?.c ?? 0))}</b>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
