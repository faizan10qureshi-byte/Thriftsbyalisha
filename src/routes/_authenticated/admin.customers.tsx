import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Repeat } from "lucide-react";
import { PageHead } from "@/components/admin/ui";
import { HangerLoader, StatusPill } from "@/components/site/bits";
import { Input } from "@/components/ui/input";
import { countsAsSale, useAdminCustomers, useAdminOrders } from "@/lib/admin-data";
import { pkr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/customers")({ component: Customers });

function Customers() {
  const customers = useAdminCustomers();
  const orders = useAdminOrders();
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  if (customers.isLoading || orders.isLoading) return <HangerLoader />;

  const rows = (customers.data ?? []).map((c) => {
    const os = (orders.data ?? []).filter((o) => o.customer_id === c.id);
    const spent = os.filter((o) => countsAsSale(o.status)).reduce((s, o) => s + o.price, 0);
    return { ...c, orders: os, spent, repeat: os.filter((o) => countsAsSale(o.status)).length > 1 };
  }).filter((c) => `${c.name} ${c.phone} ${c.city} ${c.instagram_handle}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.spent - a.spent);

  return (
    <div>
      <PageHead title="Customers" sub={`${rows.filter((r) => r.repeat).length} repeat customers`}>
        <Input placeholder="Search name, phone, city…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
      </PageHead>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((c) => (
          <div key={c.id} className="rounded-2xl border bg-card p-4 shadow-soft">
            <button className="w-full text-left" onClick={() => setOpen(open === c.id ? null : c.id)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="flex items-center gap-2 font-display text-xl font-semibold">{c.name}
                    {c.repeat && <span className="inline-flex items-center gap-1 rounded-full bg-gold/25 px-2 py-0.5 font-sans text-xs font-bold"><Repeat className="h-3 w-3" />Repeat</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.phone} · {c.instagram_handle}</p>
                  <p className="text-xs text-muted-foreground">{[c.address, c.city].filter(Boolean).join(", ")}</p>
                </div>
                <div className="text-right"><p className="font-bold text-primary">{pkr(c.spent)}</p><p className="text-xs text-muted-foreground">{c.orders.length} orders</p></div>
              </div>
            </button>
            {open === c.id && (
              <div className="mt-3 space-y-1 border-t pt-3">
                {c.orders.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
                {c.orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between text-sm">
                    <span><span className="font-mono text-xs">{o.code}</span> {o.items?.title}</span>
                    <span className="flex items-center gap-2">{pkr(o.price)} <StatusPill status={o.status} /></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
