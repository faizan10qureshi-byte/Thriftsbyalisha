import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DELIVERY_FEE, normalizePhone } from "./format";

const orderSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(10),
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^03\d{2}-?\d{7}$/, "Use 03XX-XXXXXXX"),
  address: z.string().trim().min(5).max(250),
  city: z.string().trim().min(2).max(60),
  instagram: z.string().trim().max(60).optional(),
  advanceRef: z.string().trim().max(80).optional(),
  userId: z.string().uuid().nullable().optional(),
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => orderSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalizePhone(data.phone);

    const { data: items, error: iErr } = await supabaseAdmin
      .from("items")
      .select("id,title,sell_price,status")
      .in("id", data.itemIds);
    if (iErr) throw new Error("Could not load items");
    const unavailable = (items ?? []).filter((i) => i.status !== "Available");
    if (!items?.length || unavailable.length) {
      return {
        ok: false as const,
        error: `Sorry — ${unavailable.map((i) => i.title).join(", ") || "an item"} was just reserved by someone else.`,
      };
    }

    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id,user_id")
      .eq("phone", phone)
      .maybeSingle();
    let customerId = existing?.id;
    if (customerId) {
      await supabaseAdmin
        .from("customers")
        .update({
          name: data.name,
          address: data.address,
          city: data.city,
          ...(data.instagram ? { instagram_handle: data.instagram } : {}),
          user_id: existing?.user_id ?? data.userId ?? null,
        })
        .eq("id", customerId);
    } else {
      const { data: c, error } = await supabaseAdmin
        .from("customers")
        .insert({
          name: data.name,
          phone,
          address: data.address,
          city: data.city,
          instagram_handle: data.instagram || null,
          user_id: data.userId ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error("Could not save your details");
      customerId = c.id;
    }

    const codes: string[] = [];
    for (const [idx, it] of items.entries()) {
      const { data: o, error } = await supabaseAdmin
        .from("orders")
        .insert({
          customer_id: customerId!,
          item_id: it.id,
          price: it.sell_price + (idx === 0 ? DELIVERY_FEE : 0),
          status: "Pending",
          advance_status: "Pending",
          courier: "TCS",
        })
        .select("code")
        .single();
      if (error) throw new Error("Could not place order");
      codes.push(o.code);
      await supabaseAdmin.from("items").update({ status: "Reserved" }).eq("id", it.id);
      await supabaseAdmin.from("leads").insert({
        customer_id: customerId!,
        item_id: it.id,
        source: "Storefront",
        status: "Ordered",
        note: data.advanceRef ? `Advance ref: ${data.advanceRef}` : "Awaiting advance",
      });
    }
    return { ok: true as const, codes };
  });

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ code: z.string().trim().min(4).max(12), phone: z.string().trim().min(10).max(14) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o } = await supabaseAdmin
      .from("orders")
      .select(
        "code,status,courier,tracking_number,order_date,price,advance_paid,balance_due,customers!inner(phone,name),items(title,photos)",
      )
      .eq("code", data.code.toUpperCase())
      .maybeSingle();
    if (
      !o ||
      (o.customers as { phone: string }).phone.replace(/\D/g, "") !== data.phone.replace(/\D/g, "")
    ) {
      return { found: false as const };
    }
    const item = o.items as { title: string; photos: string[] } | null;
    return {
      found: true as const,
      order: {
        code: o.code,
        status: o.status,
        courier: o.courier,
        tracking: o.tracking_number,
        date: o.order_date,
        price: o.price,
        advance: o.advance_paid,
        balance: o.balance_due,
        name: (o.customers as { name: string }).name,
        item: item?.title ?? "",
        photo: item?.photos?.[0] ?? null,
      },
    };
  });
