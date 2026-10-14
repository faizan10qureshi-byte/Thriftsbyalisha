import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { HangerLoader, SectionTitle, StatusPill } from "@/components/site/bits";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { photoUrl, pkr } from "@/lib/format";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My account — thriftsbyalisha" },
      { name: "description", content: "Your thriftsbyalisha order history and saved address." },
      { property: "og:title", content: "My account — thriftsbyalisha" },
      { property: "og:description", content: "Order history and details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

function Account() {
  const { user, loading, isStaff } = useAuth();
  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data: cust } = await supabase.from("customers").select("id,name,phone,address,city").eq("user_id", user!.id);
      const ids = (cust ?? []).map((c) => c.id);
      const { data: orders } = ids.length
        ? await supabase.from("orders").select("id,code,status,price,order_date,items(title,photos)").in("customer_id", ids).order("order_date", { ascending: false })
        : { data: [] };
      return { customer: cust?.[0], orders: orders ?? [] };
    },
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <SectionTitle eyebrow="Hello" title="My account" />
        {loading ? <HangerLoader /> : !user ? (
          <div className="mt-6 rounded-2xl border bg-card p-8 text-center">
            <p className="text-muted-foreground">Sign in to see your order history. Ordering doesn't need an account.</p>
            <Button asChild variant="hero" className="mt-4"><Link to="/auth">Sign in</Link></Button>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5">
              <div>
                <p className="font-semibold">{data?.customer?.name ?? user.email}</p>
                {data?.customer && <p className="text-sm text-muted-foreground">{data.customer.address}, {data.customer.city} · {data.customer.phone}</p>}
              </div>
              <div className="flex gap-2">
                {isStaff && <Button asChild size="sm"><Link to="/admin">Dashboard</Link></Button>}
                <Button size="sm" variant="outline" onClick={() => supabase.auth.signOut()}>Sign out</Button>
              </div>
            </div>
            {isLoading ? <HangerLoader /> : data?.orders.length ? data.orders.map((o) => {
              const it = o.items as { title: string; photos: string[] } | null;
              return (
                <div key={o.id} className="flex items-center gap-4 rounded-2xl border bg-card p-3">
                  <img src={photoUrl(it?.photos?.[0])} alt="" className="h-20 w-16 rounded-xl object-cover" />
                  <div className="flex-1"><p className="font-display text-xl font-semibold">{it?.title}</p><p className="text-xs text-muted-foreground">{o.code} · {new Date(o.order_date).toLocaleDateString()}</p></div>
                  <div className="text-right"><p className="font-bold">{pkr(o.price)}</p><StatusPill status={o.status} /></div>
                </div>
              );
            }) : (
              <p className="text-center text-muted-foreground">No orders yet. <Link to="/shop" className="text-primary underline">Shop new arrivals</Link> — orders you place while signed in show up here.</p>
            )}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
