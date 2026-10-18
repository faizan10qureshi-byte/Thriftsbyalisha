import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { HangerLoader, SectionTitle } from "@/components/site/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackOrder } from "@/lib/shop.functions";
import { photoUrl, pkr } from "@/lib/format";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track your order — thriftsbyalisha" },
      {
        name: "description",
        content: "Check your thriftsbyalisha order status and TCS tracking number.",
      },
      { property: "og:title", content: "Track your order — thriftsbyalisha" },
      { property: "og:description", content: "Confirmed → Packed → Shipped → Delivered." },
    ],
  }),
  component: Track,
});

const STEPS = ["Confirmed", "Packed", "Shipped", "Delivered"];

function Track() {
  const lookup = useServerFn(trackOrder);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Awaited<ReturnType<typeof trackOrder>> | null>(null);

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setRes(await lookup({ data: { code, phone } }));
    } finally {
      setBusy(false);
    }
  };
  const o = res?.found ? res.order : null;
  const idx = o ? STEPS.indexOf(o.status) : -1;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <SectionTitle eyebrow="Where's my parcel?" title="Track your order" />
        <form
          onSubmit={go}
          className="mt-6 grid gap-3 rounded-2xl border bg-card p-5 shadow-soft sm:grid-cols-[1fr_1fr_auto]"
        >
          <Input
            required
            placeholder="Order code e.g. TBA104"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Input
            required
            placeholder="Phone 0300-1234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Button variant="hero" type="submit" disabled={busy}>
            Track
          </Button>
        </form>
        {busy && <HangerLoader label="Checking with the courier…" />}
        {res && !res.found && (
          <p className="mt-8 text-center font-display text-xl italic text-muted-foreground">
            We couldn't find that order. Double-check the code and phone number.
          </p>
        )}
        {o && (
          <div className="mt-8 rounded-[1.5rem] border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-4">
              <img src={photoUrl(o.photo)} alt="" className="h-20 w-16 rounded-xl object-cover" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">
                  Order {o.code}
                </p>
                <p className="font-display text-2xl font-semibold">{o.item}</p>
                <p className="text-sm text-muted-foreground">
                  Balance due on delivery: {pkr(o.balance)}
                </p>
              </div>
            </div>
            {o.status === "Pending" ? (
              <p className="mt-6 rounded-xl bg-warning/20 p-4 text-sm">
                We're verifying your advance payment. You'll get a WhatsApp message once it's
                confirmed.
              </p>
            ) : (
              <ol className="mt-8 grid grid-cols-4 gap-2">
                {STEPS.map((s, i) => (
                  <li key={s} className="flex flex-col items-center text-center">
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-full transition ${i <= idx ? "bg-primary text-primary-foreground shadow-soft" : "bg-muted text-muted-foreground"}`}
                    >
                      {i <= idx ? <Check className="h-5 w-5" /> : i + 1}
                    </span>
                    <span
                      className={`mt-2 text-xs font-semibold ${i <= idx ? "" : "text-muted-foreground"}`}
                    >
                      {s}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {o.tracking && (
              <p className="mt-6 text-sm">
                Courier: <b>{o.courier}</b> · Tracking no. <b className="font-mono">{o.tracking}</b>
              </p>
            )}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
