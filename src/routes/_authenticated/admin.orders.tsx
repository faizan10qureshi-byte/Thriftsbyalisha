import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead } from "@/components/admin/ui";
import { HangerLoader, StatusPill } from "@/components/site/bits";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAdminOrders, useRefreshAdmin } from "@/lib/admin-data";
import { ORDER_STATUSES, pkr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/orders")({ component: Orders });

function Orders() {
  const { data, isLoading } = useAdminOrders();
  const refresh = useRefreshAdmin();
  const [filter, setFilter] = useState("All");

  const update = async (id: string, patch: { status?: string; advance_paid?: number; advance_status?: string; courier?: string; tracking_number?: string | null }, itemId?: string | null) => {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (itemId && patch.status) {
      const s = patch.status;
      const itemStatus = s === "Cancelled" ? "Available" : ["Shipped", "Delivered"].includes(s) ? "Sold" : "Reserved";
      await supabase.from("items").update({ status: itemStatus }).eq("id", itemId);
    }
    refresh();
  };

  const list = (data ?? []).filter((o) => filter === "All" || o.status === filter);
  return (
    <div>
      <PageHead title="Orders" sub="Change status, advance and tracking right in the table." />
      <div className="mb-4 flex flex-wrap gap-2">
        {["All", ...ORDER_STATUSES].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${filter === s ? "bg-primary text-primary-foreground" : "border bg-card"}`}>{s}</button>
        ))}
      </div>
      {isLoading ? <HangerLoader /> : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Price</th><th className="p-3">Advance</th><th className="p-3">Balance</th><th className="p-3">Courier / tracking</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className="border-t align-top">
                  <td className="p-3"><p className="font-mono text-xs font-bold">{o.code}</p><p className="font-semibold">{o.items?.title}</p><p className="text-xs text-muted-foreground">{new Date(o.order_date).toLocaleDateString()}</p></td>
                  <td className="p-3"><p className="font-semibold">{o.customers?.name}</p><p className="text-xs text-muted-foreground">{o.customers?.phone} · {o.customers?.city}</p></td>
                  <td className="p-3">{pkr(o.price)}</td>
                  <td className="p-3">
                    <Input type="number" defaultValue={o.advance_paid} className="h-8 w-24" onBlur={(e) => +e.target.value !== o.advance_paid && update(o.id, { advance_paid: +e.target.value })} />
                    <button onClick={() => update(o.id, { advance_status: o.advance_status === "Received" ? "Pending" : "Received" })} className="mt-1"><StatusPill status={o.advance_status} /></button>
                  </td>
                  <td className={`p-3 font-semibold ${(o.balance_due ?? 0) > 0 ? "text-primary" : "text-success"}`}>{pkr(o.balance_due)}</td>
                  <td className="p-3">
                    <select defaultValue={o.courier ?? "TCS"} onChange={(e) => update(o.id, { courier: e.target.value })} className="mb-1 h-8 rounded-md border bg-background px-2 text-xs">
                      {["TCS", "Leopards", "M&P", "Trax", "PostEx"].map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <Input placeholder="Tracking no." defaultValue={o.tracking_number ?? ""} className="h-8 w-36" onBlur={(e) => e.target.value !== (o.tracking_number ?? "") && update(o.id, { tracking_number: e.target.value || null })} />
                  </td>
                  <td className="p-3">
                    <select value={o.status} onChange={(e) => update(o.id, { status: e.target.value }, o.item_id)} className="rounded-full border bg-background px-2 py-1 text-xs font-semibold">
                      {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
