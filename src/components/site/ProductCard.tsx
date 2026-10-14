import { Link } from "@tanstack/react-router";
import { Heart, Sparkles } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { photoUrl, pkr } from "@/lib/format";

export type ShopItem = {
  id: string; title: string; size: string; sell_price: number; photos: string[]; status: string; category: string;
};

export function ProductCard({ item }: { item: ShopItem }) {
  const { saved, toggleSaved } = useCart();
  const isSaved = saved.includes(item.id);
  const [pop, setPop] = useState(0);
  return (
    <div className="polaroid group relative">
      <Link to="/item/$id" params={{ id: item.id }} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
          <img src={photoUrl(item.photos[0])} alt={item.title} loading="lazy" width={768} height={960}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          {item.status !== "Available" && (
            <span className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              {item.status}
            </span>
          )}
        </div>
        <div className="px-1 pt-3">
          <h3 className="line-clamp-1 font-display text-xl font-semibold">{item.title}</h3>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="font-bold text-primary">{pkr(item.sell_price)}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Size {item.size}</span>
          </div>
        </div>
      </Link>
      <button
        aria-label={isSaved ? "Remove from saved" : "Save item"}
        onClick={() => { toggleSaved(item.id); setPop((p) => p + 1); }}
        className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-card/90 shadow-soft transition hover:scale-110"
      >
        <Heart key={pop} className={`h-4 w-4 ${pop ? "animate-heart" : ""} ${isSaved ? "fill-rose text-rose" : "text-foreground"}`} />
        {pop > 0 && isSaved && <Sparkles key={`s${pop}`} className="pointer-events-none absolute h-4 w-4 text-gold animate-sparkle" />}
      </button>
    </div>
  );
}
