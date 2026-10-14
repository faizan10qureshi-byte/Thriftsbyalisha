import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Rows3, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHead } from "@/components/admin/ui";
import { HangerLoader } from "@/components/site/bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAdminItems, useRefreshAdmin } from "@/lib/admin-data";
import { useAuth } from "@/lib/auth";
import { ITEM_STATUSES, photoUrl, pkr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/inventory")({ component: Inventory });

type Draft = {
  id?: string; title: string; category: string; subcategory: string; size: string; measurements: string;
  condition_notes: string; description: string; photos: string[]; cost_price: number; sell_price: number;
  source_bazaar: string; date_sourced: string; status: string;
};
const blank = (): Draft => ({
  title: "", category: "clothing", subcategory: "", size: "M", measurements: "Chest: \nLength: ", condition_notes: "", description: "",
  photos: [], cost_price: 0, sell_price: 0, source_bazaar: "Sunday Bazaar G-9", date_sourced: new Date().toISOString().slice(0, 10), status: "Available",
});
const parseMeas = (s: string) => Object.fromEntries(s.split("\n").map((l) => l.split(":").map((x) => x.trim())).filter(([k, v]) => k && v));

async function saveItem(d: Draft) {
  const row = {
    title: d.title, category: d.category, subcategory: d.subcategory || null, size: d.size, measurements: parseMeas(d.measurements),
    condition_notes: d.condition_notes || null, description: d.description || null, photos: d.photos, sell_price: d.sell_price,
    source_bazaar: d.source_bazaar || null, date_sourced: d.date_sourced || null, status: d.status,
  };
  const res = d.id ? await supabase.from("items").update(row).eq("id", d.id).select("id").single() : await supabase.from("items").insert(row).select("id").single();
  if (res.error) throw res.error;
  const { error } = await supabase.from("item_costs").upsert({ item_id: res.data.id, cost_price: d.cost_price });
  if (error) throw error;
}

function Inventory() {
  const { data, isLoading } = useAdminItems();
  const refresh = useRefreshAdmin();
  const { canFinance } = useAuth();
  const [edit, setEdit] = useState<Draft | null>(null);
  const [bulk, setBulk] = useState(false);
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("items").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };

  const list = (data ?? []).filter((i) => (filter === "All" || i.status === filter) && i.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHead title="Inventory" sub={`${data?.filter((i) => i.status === "Available").length ?? 0} available · ${data?.length ?? 0} total`}>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulk(true)}><Rows3 /> Bulk add haul</Button>
          <Button onClick={() => setEdit(blank())}><Plus /> Add item</Button>
        </div>
      </PageHead>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        {["All", ...ITEM_STATUSES].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${filter === s ? "bg-primary text-primary-foreground" : "bg-card border"}`}>{s}</button>
        ))}
      </div>
      {isLoading ? <HangerLoader /> : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Item</th><th className="p-3">Size</th>{canFinance && <th className="p-3">Cost</th>}<th className="p-3">Price</th><th className="p-3">Source</th><th className="p-3">Status</th><th /></tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id} className="border-t hover:bg-muted/40">
                  <td className="p-3"><div className="flex items-center gap-3"><img src={photoUrl(i.photos[0])} alt="" className="h-12 w-10 rounded-lg object-cover" /><div><p className="font-semibold">{i.title}</p><p className="text-xs text-muted-foreground">{i.subcategory ?? i.category}</p></div></div></td>
                  <td className="p-3">{i.size}</td>
                  {canFinance && <td className="p-3 text-muted-foreground">{pkr(i.cost_price)}</td>}
                  <td className="p-3 font-semibold">{pkr(i.sell_price)}</td>
                  <td className="p-3 text-xs">{i.source_bazaar}<br /><span className="text-muted-foreground">{i.date_sourced}</span></td>
                  <td className="p-3">
                    <select value={i.status} onChange={(e) => setStatus(i.id, e.target.value)} className="rounded-full border bg-background px-2 py-1 text-xs font-semibold">
                      {ITEM_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3"><Button size="sm" variant="ghost" onClick={() => setEdit({
                    ...blank(), ...i, subcategory: i.subcategory ?? "", condition_notes: i.condition_notes ?? "", description: i.description ?? "",
                    source_bazaar: i.source_bazaar ?? "", date_sourced: i.date_sourced ?? "",
                    measurements: Object.entries((i.measurements ?? {}) as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join("\n"),
                  })}>Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && <ItemDialog draft={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh(); }} />}
      {bulk && <BulkDialog onClose={() => setBulk(false)} onSaved={() => { setBulk(false); refresh(); }} />}
    </div>
  );
}

function ItemDialog({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState(draft);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD({ ...d, [k]: v });

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      const path = `${crypto.randomUUID()}-${f.name.replace(/[^\w.]/g, "")}`;
      const { error } = await supabase.storage.from("item-photos").upload(path, f);
      if (error) { toast.error(error.message); continue; }
      const { data } = await supabase.storage.from("item-photos").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (data) urls.push(data.signedUrl);
    }
    setD((p) => ({ ...p, photos: [...p.photos, ...urls] }));
    setBusy(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await saveItem(d); toast.success("Saved"); onSaved(); } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!d.id || !confirm("Delete this item?")) return undefined;
    const { error } = await supabase.from("items").delete().eq("id", d.id);
    if (error) toast.error(error.message); else onSaved();
    return undefined;
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-3xl">{d.id ? "Edit item" : "New item"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Title</Label><Input required value={d.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div><Label>Category</Label>
            <select value={d.category} onChange={(e) => set("category", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="clothing">Clothing</option><option value="shoes">Shoes</option></select></div>
          <div><Label>Type</Label><Input placeholder="Dresses, Sneakers…" value={d.subcategory} onChange={(e) => set("subcategory", e.target.value)} /></div>
          <div><Label>Size</Label><Input value={d.size} onChange={(e) => set("size", e.target.value)} /></div>
          <div><Label>Status</Label>
            <select value={d.status} onChange={(e) => set("status", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{ITEM_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><Label>Cost price (Rs.)</Label><Input type="number" min={0} value={d.cost_price} onChange={(e) => set("cost_price", +e.target.value)} /></div>
          <div><Label>Sell price (Rs.)</Label><Input type="number" min={0} value={d.sell_price} onChange={(e) => set("sell_price", +e.target.value)} /></div>
          <div><Label>Source bazaar</Label><Input value={d.source_bazaar} onChange={(e) => set("source_bazaar", e.target.value)} /></div>
          <div><Label>Date sourced</Label><Input type="date" value={d.date_sourced} onChange={(e) => set("date_sourced", e.target.value)} /></div>
          <div><Label>Measurements (one per line)</Label><Textarea rows={3} value={d.measurements} onChange={(e) => set("measurements", e.target.value)} /></div>
          <div><Label>Condition notes</Label><Textarea rows={3} value={d.condition_notes} onChange={(e) => set("condition_notes", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Description</Label><Input value={d.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="sm:col-span-2">
            <Label>Photos</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {d.photos.map((p, i) => (
                <button type="button" key={i} title="Remove" onClick={() => set("photos", d.photos.filter((_, j) => j !== i))} className="h-20 w-16 overflow-hidden rounded-lg border">
                  <img src={photoUrl(p)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
              <label className="grid h-20 w-16 cursor-pointer place-items-center rounded-lg border-2 border-dashed text-muted-foreground hover:bg-muted">
                <Upload className="h-4 w-4" /><input type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
              </label>
            </div>
          </div>
          <div className="flex justify-between gap-2 sm:col-span-2">
            {d.id ? <Button type="button" variant="ghost" onClick={del}>Delete</Button> : <span />}
            <Button disabled={busy}>{busy ? "Saving…" : "Save item"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Row = { title: string; category: string; size: string; cost: number; price: number };
function BulkDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [bazaar, setBazaar] = useState("Sunday Bazaar G-9");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>(Array.from({ length: 5 }, () => ({ title: "", category: "clothing", size: "M", cost: 0, price: 0 })));
  const [busy, setBusy] = useState(false);
  const upd = (i: number, k: keyof Row, v: string | number) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  const save = async () => {
    const valid = rows.filter((r) => r.title.trim());
    if (!valid.length) { toast.error("Add at least one item"); return; }
    setBusy(true);
    try {
      for (const r of valid) {
        await saveItem({ ...blank(), title: r.title, category: r.category, size: r.size, cost_price: r.cost, sell_price: r.price, source_bazaar: bazaar, date_sourced: date, photos: [r.category === "shoes" ? "sneakers" : "dress"], measurements: "" });
      }
      toast.success(`${valid.length} items added — add photos when ready`);
      onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-3xl">Bulk add this week's haul</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Bazaar</Label><Input value={bazaar} onChange={(e) => setBazaar(e.target.value)} /></div>
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-[2fr_1fr_0.7fr_0.9fr_0.9fr] gap-2 text-xs font-bold uppercase text-muted-foreground"><span>Title</span><span>Category</span><span>Size</span><span>Cost</span><span>Price</span></div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_0.7fr_0.9fr_0.9fr] gap-2">
              <Input value={r.title} onChange={(e) => upd(i, "title", e.target.value)} placeholder="e.g. Lace blouse" />
              <select value={r.category} onChange={(e) => upd(i, "category", e.target.value)} className="h-10 rounded-md border bg-background px-2 text-sm"><option value="clothing">Clothing</option><option value="shoes">Shoes</option></select>
              <Input value={r.size} onChange={(e) => upd(i, "size", e.target.value)} />
              <Input type="number" value={r.cost} onChange={(e) => upd(i, "cost", +e.target.value)} />
              <Input type="number" value={r.price} onChange={(e) => upd(i, "price", +e.target.value)} />
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setRows([...rows, ...Array.from({ length: 5 }, () => ({ title: "", category: "clothing", size: "M", cost: 0, price: 0 }))])}>+ 5 rows</Button>
          <Button disabled={busy} onClick={save}>{busy ? "Adding…" : "Add all"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
