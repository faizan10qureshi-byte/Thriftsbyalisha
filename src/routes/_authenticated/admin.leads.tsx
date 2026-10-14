import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHead } from "@/components/admin/ui";
import { HangerLoader } from "@/components/site/bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCustomers, useAdminItems, useAdminLeads, useRefreshAdmin } from "@/lib/admin-data";
import { LEAD_SOURCES, LEAD_STALE_HOURS, LEAD_STATUSES, isLeadStale, normalizePhone, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/leads")({ component: Leads });

function Leads() {
  const { data, isLoading } = useAdminLeads();
  const refresh = useRefreshAdmin();
  const [filter, setFilter] = useState("Open");
  const [adding, setAdding] = useState(false);

  const update = async (id: string, patch: { status?: string; last_reply_at?: string }) => {
    const { error } = await supabase.from("leads").update(patch).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };

  const list = (data ?? []).filter((l) => filter === "All" || (filter === "Open" ? !["Ordered", "Lost"].includes(l.status) : l.status === filter));

  return (
    <div>
      <PageHead title="Leads" sub={`Flagged red after ${LEAD_STALE_HOURS}h without a reply`}>
        <Button onClick={() => setAdding(true)}><Plus /> Log inquiry</Button>
      </PageHead>
      <div className="mb-4 flex flex-wrap gap-2">
        {["Open", "All", ...LEAD_STATUSES].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${filter === s ? "bg-primary text-primary-foreground" : "border bg-card"}`}>{s}</button>
        ))}
      </div>
      {isLoading ? <HangerLoader /> : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Customer</th><th className="p-3">Item</th><th className="p-3">Source</th><th className="p-3">Status</th><th className="p-3">Last contact</th><th /></tr>
            </thead>
            <tbody>
              {list.map((l) => {
                const stale = isLeadStale(l);
                return (
                  <tr key={l.id} className={`border-t ${stale ? "bg-destructive/5" : ""}`}>
                    <td className="p-3">
                      <p className="flex items-center gap-1.5 font-semibold">{stale && <AlertCircle className="h-4 w-4 text-destructive" />}{l.customers?.name}</p>
                      <p className="text-xs text-muted-foreground">{l.customers?.phone} {l.customers?.instagram_handle}</p>
                      {l.note && <p className="text-xs italic text-muted-foreground">“{l.note}”</p>}
                    </td>
                    <td className="p-3">{l.items?.title ?? "—"}</td>
                    <td className="p-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{l.source}</span></td>
                    <td className="p-3">
                      <select value={l.status} onChange={(e) => update(l.id, { status: e.target.value })} className="rounded-full border bg-background px-2 py-1 text-xs font-semibold">
                        {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className={`p-3 text-xs ${stale ? "font-bold text-destructive" : "text-muted-foreground"}`}>{timeAgo(l.last_reply_at ?? l.first_contact_at)}</td>
                    <td className="p-3 whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => update(l.id, { last_reply_at: new Date().toISOString(), status: l.status === "New" ? "Contacted" : l.status })}>Mark replied</Button>
                      {l.customers?.phone && (
                        <a className="ml-1 inline-grid h-8 w-8 place-items-center rounded-full hover:bg-accent" target="_blank" rel="noreferrer" aria-label="WhatsApp"
                          href={`https://wa.me/92${l.customers.phone.replace(/\D/g, "").slice(1)}`}><MessageCircle className="h-4 w-4" /></a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {adding && <AddLead onClose={() => setAdding(false)} onSaved={() => { setAdding(false); refresh(); }} />}
    </div>
  );
}

function AddLead({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const customers = useAdminCustomers();
  const items = useAdminItems();
  const [f, setF] = useState({ name: "", phone: "", instagram: "", item_id: "", source: "Instagram", note: "" });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = normalizePhone(f.phone);
    let cid = customers.data?.find((c) => c.phone === phone)?.id;
    if (!cid) {
      const { data, error } = await supabase.from("customers").insert({ name: f.name, phone, instagram_handle: f.instagram || null }).select("id").single();
      if (error) { toast.error(error.message); return; }
      cid = data.id;
    }
    const { error } = await supabase.from("leads").insert({ customer_id: cid, item_id: f.item_id || null, source: f.source, note: f.note || null });
    if (error) toast.error(error.message); else onSaved();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display text-3xl">Log an inquiry</DialogTitle></DialogHeader>
        <form onSubmit={save} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input required placeholder="0300-1234567" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          </div>
          <div><Label>Instagram</Label><Input value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Item</Label>
              <select value={f.item_id} onChange={(e) => setF({ ...f, item_id: e.target.value })} className="h-10 w-full rounded-md border bg-background px-2 text-sm">
                <option value="">—</option>{items.data?.filter((i) => i.status !== "Sold").map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
              </select></div>
            <div><Label>Source</Label>
              <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} className="h-10 w-full rounded-md border bg-background px-2 text-sm">
                {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select></div>
          </div>
          <div><Label>Note</Label><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
          <Button>Save lead</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
