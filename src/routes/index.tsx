import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Instagram, Truck, Sparkles, HeartHandshake } from "lucide-react";
import hero from "@/assets/hero.jpg";
import dress from "@/assets/p-dress.jpg";
import sneakers from "@/assets/p-sneakers.jpg";
import heels from "@/assets/p-heels.jpg";
import top from "@/assets/p-top.jpg";
import boots from "@/assets/p-boots.jpg";
import satin from "@/assets/p-satin.jpg";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { FadeIn, SectionTitle } from "@/components/site/bits";
import { itemsQuery } from "@/lib/items";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "thriftsbyalisha — Thrifted clothing & shoes in Pakistan" },
      {
        name: "description",
        content:
          "Hand-picked pre-loved dresses, denim, sneakers and heels from Islamabad's bazaars, delivered nationwide.",
      },
      { property: "og:title", content: "thriftsbyalisha — Thrifted fashion boutique" },
      {
        property: "og:description",
        content: "One-of-a-kind thrifted pieces, delivered across Pakistan via TCS.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(itemsQuery()),
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(itemsQuery());
  const fresh = data.filter((i) => i.status === "Available").slice(0, 8);
  return (
    <SiteLayout>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
          <FadeIn>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-blush px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-secondary-foreground">
              <Sparkles className="h-3.5 w-3.5" /> New drop every week
            </p>
            <h1 className="text-5xl font-semibold leading-[1.05] md:text-7xl">
              Pre-loved pieces with a <em className="text-rose">second story</em>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Hand-picked from Islamabad's bazaars, steamed, measured and sent to your door —
              anywhere in Pakistan.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/shop">
                  Shop the drop <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/about">Our story</Link>
              </Button>
            </div>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rotate-3 rounded-[2rem] bg-blush" />
              <img
                src={hero}
                alt="Thrifted blouses, floral dress and pastel heels"
                width={1600}
                height={1008}
                className="aspect-[4/3] w-full rounded-[1.75rem] object-cover shadow-lift"
              />
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            {
              label: "Clothing",
              img: dress,
              cat: "clothing" as const,
              sub: "Dresses, tops, denim & kurtis",
            },
            {
              label: "Shoes",
              img: sneakers,
              cat: "shoes" as const,
              sub: "Sneakers, heels, boots & flats",
            },
          ].map((c, i) => (
            <FadeIn key={c.label} delay={i * 0.1}>
              <Link
                to="/shop"
                search={{ category: c.cat }}
                className="group relative block overflow-hidden rounded-[1.5rem] shadow-soft"
              >
                <img
                  src={c.img}
                  alt={c.label}
                  loading="lazy"
                  width={768}
                  height={960}
                  className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-foreground/60 to-transparent p-6 text-primary-foreground">
                  <h3 className="text-4xl font-semibold">{c.label}</h3>
                  <p className="text-sm opacity-90">{c.sub}</p>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <FadeIn className="mb-8 flex items-end justify-between">
          <SectionTitle eyebrow="Just in" title="New arrivals" />
          <Link
            to="/shop"
            className="hidden text-sm font-bold text-primary hover:underline sm:block"
          >
            See everything →
          </Link>
        </FadeIn>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {fresh.map((it, i) => (
            <FadeIn key={it.id} delay={(i % 4) * 0.07}>
              <ProductCard item={it} />
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-4 rounded-[1.75rem] bg-gradient-blush p-8 sm:grid-cols-3">
          {[
            { icon: Truck, t: "Nationwide delivery", d: "TCS & trusted couriers, 2–5 days" },
            { icon: Sparkles, t: "One of a kind", d: "Every piece is single stock" },
            { icon: HeartHandshake, t: "Honest condition", d: "Flaws noted, measured by hand" },
          ].map((f) => (
            <div key={f.t} className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card text-primary shadow-soft">
                <f.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-xl font-semibold">{f.t}</p>
                <p className="text-sm text-muted-foreground">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <FadeIn className="mb-6 text-center">
          <SectionTitle eyebrow="@thriftsbyalisha" title="Styled by our girls" />
        </FadeIn>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {[satin, heels, top, boots, dress, sneakers].map((src, i) => (
            <a
              key={i}
              href="https://instagram.com/thriftsbyalisha"
              target="_blank"
              rel="noreferrer"
              className="group relative aspect-square overflow-hidden rounded-2xl"
            >
              <img
                src={src}
                alt="Instagram post"
                loading="lazy"
                width={768}
                height={960}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <span className="absolute inset-0 grid place-items-center bg-foreground/0 text-primary-foreground opacity-0 transition group-hover:bg-foreground/30 group-hover:opacity-100">
                <Instagram className="h-6 w-6" />
              </span>
            </a>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
