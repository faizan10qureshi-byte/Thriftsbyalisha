import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { z } from "zod";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { SectionTitle } from "@/components/site/bits";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { itemsQuery } from "@/lib/items";
import { pkr } from "@/lib/format";

const searchSchema = z.object({
  category: z.enum(["clothing", "shoes"]).optional(),
});

export const Route = createFileRoute("/shop")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Shop thrifted clothing & shoes — thriftsbyalisha" },
      { name: "description", content: "Browse one-of-a-kind thrifted dresses, tops, jeans, sneakers and heels. Filter by size and price in PKR." },
      { property: "og:title", content: "Shop — thriftsbyalisha" },
      { property: "og:description", content: "Browse this week's thrifted pieces." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(itemsQuery()),
  component: Shop,
});

function Shop() {
  const { data } = useSuspenseQuery(itemsQuery());
  const { category } = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const [q, setQ] = useState("");
  const [size, setSize] = useState<string>("");
  const [max, setMax] = useState(5000);
  const [showSold, setShowSold] = useState(false);

  const sizes = useMemo(() => [...new Set(data.filter((i) => !category || i.category === category).map((i) => i.size))].sort(), [data, category]);
  const list = data.filter((i) =>
    (!category || i.category === category) &&
    (!size || i.size === size) &&
    i.sell_price <= max &&
    (showSold || i.status !== "Sold") &&
    (!q || `${i.title} ${i.subcategory ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm font-semibold transition hover:scale-105 ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent"}`;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <SectionTitle eyebrow="The rail" title={category === "shoes" ? "Shoes" : category === "clothing" ? "Clothing" : "Shop everything"} />
        <div className="mt-6 space-y-4 rounded-[1.5rem] border bg-card p-5 shadow-soft">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search floral, denim, heels…" className="h-11 rounded-full pl-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={chip(!category)} onClick={() => navigate({ search: {} })}>All</button>
            <button className={chip(category === "clothing")} onClick={() => { setSize(""); navigate({ search: { category: "clothing" } }); }}>Clothing</button>
            <button className={chip(category === "shoes")} onClick={() => { setSize(""); navigate({ search: { category: "shoes" } }); }}>Shoes</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Size</span>
            <button className={chip(!size)} onClick={() => setSize("")}>Any</button>
            {sizes.map((s) => <button key={s} className={chip(size === s)} onClick={() => setSize(s)}>{s}</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Up to {pkr(max)}</span>
            <Slider value={[max]} min={1000} max={5000} step={100} onValueChange={(v) => setMax(v[0] ?? 5000)} className="max-w-xs" />
            <label className="ml-auto flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showSold} onChange={(e) => setShowSold(e.target.checked)} className="accent-primary" /> Show sold pieces
            </label>
          </div>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">{list.length} pieces</p>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {list.map((it) => <ProductCard key={it.id} item={it} />)}
        </div>
        {list.length === 0 && <p className="py-16 text-center font-display text-2xl italic text-muted-foreground">Nothing matches yet — try loosening the filters.</p>}
      </div>
    </SiteLayout>
  );
}
