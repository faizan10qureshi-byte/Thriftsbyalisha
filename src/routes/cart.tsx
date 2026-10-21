import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/site/SiteLayout";
import { HangerLoader, SectionTitle } from "@/components/site/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/cart";
import { DELIVERY_FEE, PK_PHONE, photoUrl, pkr } from "@/lib/format";
import { placeOrder } from "@/lib/shop.functions";
import { checkDiscount, saveBag } from "@/lib/operations.functions";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Your bag & checkout — thriftsbyalisha" },
      { name: "description", content: "Review your reserved thrifted pieces and check out with a small advance payment." },
      { property: "og:title", content: "Checkout — thriftsbyalisha" },
      { property: "og:description", content: "Reserve your thrifted pieces." },
    ],
  }),
  component: Cart,
});

function Cart() {
  const { items, remove, clear } = useCart();
  const submit = useServerFn(placeOrder);
  const [step, setStep] = useState<"bag" | "details" | "pay" | "done">("bag");
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", instagram: "", advanceRef: "" });
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [checkoutId] = useState(() => crypto.randomUUID());
  const [bag] = useState(() => ({ id: crypto.randomUUID(), token: crypto.randomUUID() }));
  const [consent, setConsent] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const check = useServerFn(checkDiscount);
  const save = useServerFn(saveBag);
  useEffect(() => { setDiscount(0); }, [items, discountCode]);
  useEffect(() => {
    if (!consent || !PK_PHONE.test(form.phone) || form.name.trim().length < 2 || !items.length || step === "done") return;
    const timer = setTimeout(() => { save({ data: { ...bag, name: form.name, phone: form.phone, itemIds: items.map(i => i.id) } }).catch(() => toast.error("Your bag could not be saved.")); }, 800);
    return () => clearTimeout(timer);
  }, [consent, form.name, form.phone, items, bag, step, save]);

  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const total = subtotal - discount + (items.length ? DELIVERY_FEE : 0);
  const advance = Math.min(total, 500 * items.length);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const goPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!PK_PHONE.test(form.phone.trim())) { toast.error("Phone should look like 0300-1234567"); return; }
    setStep("pay");
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await submit({ data: { ...form, itemIds: items.map((i) => i.id), checkoutId, discountCode, ...(consent ? { bagId: bag.id, bagToken: bag.token } : {}) } });
      if (!res.ok) { toast.error(res.error); return; }
      setCodes(res.codes); clear(); setStep("done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  };

  if (step === "done") {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h1 className="mt-4 text-5xl font-semibold">It's yours, almost!</h1>
          <p className="mt-3 text-muted-foreground">We'll confirm on WhatsApp once your advance is verified. Save your order code{codes.length > 1 ? "s" : ""}:</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">{codes.map((c) => <span key={c} className="rounded-full bg-blush px-4 py-2 font-mono font-bold">{c}</span>)}</div>
          <Button asChild variant="hero" className="mt-8"><Link to="/track">Track my order</Link></Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1fr_360px]">
        <div>
          <SectionTitle eyebrow={step === "bag" ? "Step 1 of 3" : step === "details" ? "Step 2 of 3" : "Step 3 of 3"}
            title={step === "bag" ? "Your bag" : step === "details" ? "Delivery details" : "Advance payment"} />
          {step === "bag" && (
            <div className="mt-6 space-y-3">
              {items.length === 0 && (
                <div className="rounded-2xl border bg-card p-10 text-center">
                  <p className="font-display text-2xl italic">Your bag is empty</p>
                  <Button asChild className="mt-4"><Link to="/shop">Find something lovely</Link></Button>
                </div>
              )}
              {items.map((i) => (
                <div key={i.id} className="flex items-center gap-4 rounded-2xl border bg-card p-3 shadow-soft">
                  <img src={photoUrl(i.photo)} alt={i.title} className="h-24 w-20 rounded-xl object-cover" />
                  <div className="flex-1">
                    <p className="font-display text-xl font-semibold">{i.title}</p>
                    <p className="text-sm text-muted-foreground">Size {i.size}</p>
                    <p className="font-bold text-primary">{pkr(i.price)}</p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => remove(i.id)}><Trash2 /></Button>
                </div>
              ))}
            </div>
          )}
          {step === "details" && (
            <form id="details" onSubmit={goPay} className="mt-6 grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Full name</Label><Input required value={form.name} onChange={set("name")} className="mt-1" /></div>
              <div><Label>Phone (WhatsApp)</Label><Input required placeholder="0300-1234567" value={form.phone} onChange={set("phone")} className="mt-1" /></div>
              <div><Label>City</Label><Input required placeholder="Islamabad" value={form.city} onChange={set("city")} className="mt-1" /></div>
              <div className="sm:col-span-2"><Label>Full address</Label><Input required value={form.address} onChange={set("address")} className="mt-1" /></div>
              <label className="sm:col-span-2 flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1"/>Save this bag with my contact details if I don’t finish checkout.</label>
              <div className="sm:col-span-2"><Label>Instagram (optional)</Label><Input placeholder="@yourhandle" value={form.instagram} onChange={set("instagram")} className="mt-1" /></div>
            </form>
          )}
          {step === "pay" && (
            <div className="mt-6 space-y-4 rounded-2xl border bg-card p-6">
              <p>To lock your pieces, send an advance of <b className="text-primary">{pkr(advance)}</b> to:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-muted p-4 text-sm"><p className="font-bold">JazzCash / Easypaisa</p><p>0300-0000000 · Alisha</p></div>
                <div className="rounded-xl bg-muted p-4 text-sm"><p className="font-bold">Bank transfer</p><p>Meezan Bank · 0000-0000000000</p></div>
              </div>
              <div><Label>Transaction ID / reference</Label><Input value={form.advanceRef} onChange={set("advanceRef")} placeholder="e.g. TID 12345678" className="mt-1" /></div>
              <p className="text-sm text-muted-foreground">Remaining balance is paid cash on delivery.</p>
              {busy && <HangerLoader label="Wrapping it up…" />}
            </div>
          )}
        </div>
        <aside className="h-fit rounded-[1.5rem] bg-gradient-blush p-6 shadow-soft md:sticky md:top-24">
          <h2 className="text-2xl font-semibold">Order summary</h2>
          <div className="mt-4 flex gap-2"><Input aria-label="Discount code" placeholder="Discount code" value={discountCode} onChange={e => setDiscountCode(e.target.value.toUpperCase())}/><Button variant="outline" disabled={!discountCode || !items.length} onClick={async () => { try { const r = await check({data:{code:discountCode,itemIds:items.map(i=>i.id)}}); if(!r.ok){toast.error("This code is not available");setDiscount(0);}else {setDiscount(r.amount);toast.success("Discount applied");} } catch {toast.error("Could not check this code");} }}>Apply</Button></div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Items ({items.length})</dt><dd>{pkr(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{pkr(items.length ? DELIVERY_FEE : 0)}</dd></div>
            {discount > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>− {pkr(discount)}</dd></div>}
            <div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Total</dt><dd>{pkr(total)}</dd></div>
            <div className="flex justify-between text-primary"><dt>Advance now</dt><dd>{pkr(advance)}</dd></div>
          </dl>
          {step === "bag" && <Button variant="hero" className="mt-6 w-full" disabled={!items.length} onClick={() => setStep("details")}>Continue</Button>}
          {step === "details" && <Button variant="hero" className="mt-6 w-full" type="submit" form="details">Continue to payment</Button>}
          {step === "pay" && <Button variant="hero" className="mt-6 w-full" disabled={busy} onClick={confirm}>I've sent the advance — place order</Button>}
          {step !== "bag" && <button className="mt-3 w-full text-sm text-muted-foreground hover:text-primary" onClick={() => setStep(step === "pay" ? "details" : "bag")}>← Back</button>}
        </aside>
      </div>
    </SiteLayout>
  );
}
