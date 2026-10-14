import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, ShoppingBag, Truck } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/site/bits";
import { itemQuery } from "@/lib/items";
import { photoUrl, pkr } from "@/lib/format";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/item/$id")({
  loader: async ({ context, params }) => {
    const item = await context.queryClient.ensureQueryData(itemQuery(params.id));
    if (!item) throw notFound();
    return { title: item.title, price: item.sell_price, size: item.size };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — thriftsbyalisha` },
          { name: "description", content: `Thrifted ${loaderData.title}, size ${loaderData.size}, ${pkr(loaderData.price)}. One piece only.` },
          { property: "og:title", content: loaderData.title },
          { property: "og:description", content: `Size ${loaderData.size} · ${pkr(loaderData.price)} · thriftsbyalisha` },
        ]
      : [{ title: "Item unavailable — thriftsbyalisha" }, { name: "robots", content: "noindex" }],
  }),
  component: ItemPage,
});

function ItemPage() {
  const { id } = Route.useParams();
  const { data: item } = useSuspenseQuery(itemQuery(id));
  const { add, items, saved, toggleSaved } = useCart();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  if (!item) return null;
  const photos = item.photos.length ? item.photos : ["dress"];
  const inCart = items.some((i) => i.id === item.id);
  const measurements = Object.entries((item.measurements ?? {}) as Record<string, string>);

  const reserve = () => {
    add({ id: item.id, title: item.title, price: item.sell_price, size: item.size, photo: photos[0] ?? "" });
    toast.success("Added to your bag ✨");
    navigate({ to: "/cart" });
  };

  return (
    <SiteLayout>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2">
        <div>
          <div className="polaroid">
            <img src={photoUrl(photos[active])} alt={item.title} width={768} height={960} className="aspect-[4/5] w-full rounded-xl object-cover" />
          </div>
          {photos.length > 1 && (
            <div className="mt-3 flex gap-2">
              {photos.map((p, i) => (
                <button key={i} onClick={() => setActive(i)} className={`h-20 w-16 overflow-hidden rounded-xl border-2 ${i === active ? "border-primary" : "border-transparent"}`}>
                  <img src={photoUrl(p)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <Link to="/shop" className="text-sm text-muted-foreground hover:text-primary">← Back to shop</Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.25em] text-primary">{item.subcategory ?? item.category}</p>
          <h1 className="mt-1 text-5xl font-semibold">{item.title}</h1>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-2xl font-extrabold text-primary">{pkr(item.sell_price)}</span>
            <StatusPill status={item.status} />
          </div>
          {item.description && <p className="mt-4 text-muted-foreground">{item.description}</p>}
          <div className="mt-6 rounded-2xl border bg-card p-5">
            <h2 className="text-2xl font-semibold">Measurements · Size {item.size}</h2>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {measurements.map(([k, v]) => (
                  <tr key={k} className="border-t first:border-0"><td className="py-2 text-muted-foreground">{k}</td><td className="py-2 text-right font-semibold">{v}</td></tr>
                ))}
              </tbody>
            </table>
            {item.condition_notes && <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm"><b>Condition:</b> {item.condition_notes}</p>}
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="hero" size="lg" className="flex-1" disabled={item.status !== "Available" || inCart} onClick={reserve}>
              <ShoppingBag /> {item.status !== "Available" ? `${item.status}` : inCart ? "In your bag" : "Reserve this item"}
            </Button>
            <Button variant="outline" size="lg" aria-label="Save" onClick={() => toggleSaved(item.id)}>
              <Heart className={saved.includes(item.id) ? "fill-rose text-rose animate-heart" : ""} />
            </Button>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Truck className="h-4 w-4" /> Rs. 250 delivery anywhere in Pakistan via TCS</p>
        </div>
      </div>
    </SiteLayout>
  );
}
