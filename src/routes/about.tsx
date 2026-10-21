import { createFileRoute } from "@tanstack/react-router";
import { Instagram, MapPin, MessageCircle } from "lucide-react";
import hero from "@/assets/p-satin.jpg";
import { SiteLayout } from "@/components/site/SiteLayout";
import { FadeIn, SectionTitle } from "@/components/site/bits";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Our story & contact — thriftsbyalisha" },
      { name: "description", content: "How thriftsbyalisha hand-picks pre-loved fashion from Islamabad's weekly bazaars, and how to reach us." },
      { property: "og:title", content: "About thriftsbyalisha" },
      { property: "og:description", content: "Pre-loved fashion with a second story, from Islamabad." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <SiteLayout>
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2">
        <FadeIn>
          <SectionTitle eyebrow="Our story" title="Bazaar finds, lovingly re-homed" />
          <div className="mt-5 space-y-4 text-muted-foreground">
            <p>thriftsbyalisha started with weekend trips to Islamabad's Sunday and Itwar bazaars and a closet that kept overflowing. Now every week we dig through hundreds of pieces to find the few that feel special.</p>
            <p>Each item is checked for flaws, washed or steamed, measured by hand and photographed honestly — so what arrives at your door is exactly what you fell in love with.</p>
            <p>Buying thrifted keeps beautiful clothes out of landfill and lets you dress like no one else. That's the whole idea.</p>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="polaroid rotate-2"><img src={hero} alt="Clothing rack" loading="lazy" width={768} height={960} className="aspect-[4/5] w-full rounded-xl object-cover" /></div>
        </FadeIn>
      </div>
      <div className="mx-auto max-w-6xl px-4">
        <SectionTitle eyebrow="Say hi" title="Contact" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Instagram, t: "Instagram DM", d: "@thriftsbyalisha", href: "https://instagram.com/thriftsbyalisha" },
            { icon: MessageCircle, t: "WhatsApp", d: "0300-0000000", href: "https://wa.me/923000000000" },
            { icon: MapPin, t: "Based in", d: "Islamabad · ships nationwide", href: undefined },
          ].map((c) => (
            <a key={c.t} href={c.href} target="_blank" rel="noreferrer" className="rounded-2xl border bg-card p-6 shadow-soft transition hover:-translate-y-1">
              <c.icon className="h-6 w-6 text-primary" />
              <p className="mt-3 font-display text-xl font-semibold">{c.t}</p>
              <p className="text-sm text-muted-foreground">{c.d}</p>
            </a>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
