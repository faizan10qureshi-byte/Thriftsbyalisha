import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DELIVERY_FEE, normalizePhone } from "./format";
import { orderSchema } from "./shop-rules";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export async function capabilityHash(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes)).map(x => x.toString(16).padStart(2, "0")).join("");
}

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => orderSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("checkout_with_delivery", { p: {
      ...data, phone: normalizePhone(data.phone), channel: "Storefront", deliveryFee: DELIVERY_FEE,
      bagHash: data.bagToken ? await capabilityHash(data.bagToken) : null,
    } });
    if (error) return { ok: false as const, error: error.message };
    const codes = z.object({ codes: z.array(z.string()) }).parse(result).codes;
    return { ok: true as const, codes };
  });

export const manualOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => orderSchema.extend({ channel: z.enum(["Instagram", "WhatsApp"]), advancePaid: z.number().int().min(0), deliveryFee: z.number().int().min(0).max(10000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!staff) throw new Error("Shop access is required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("checkout_with_delivery", { p: { ...data, phone: normalizePhone(data.phone) } });
    if (error) throw new Error(error.message);
    return z.object({ codes: z.array(z.string()) }).parse(result);
  });

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ code: z.string().trim().min(4).max(12), phone: z.string().trim().min(10).max(14) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o } = await supabaseAdmin
      .from("orders")
      .select("code,status,courier,tracking_number,order_date,price,advance_paid,balance_due,customers!inner(phone,name),items(title,photos)")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();
    if (!o || (o.customers as { phone: string }).phone.replace(/\D/g, "") !== data.phone.replace(/\D/g, "")) {
      return { found: false as const };
    }
    const item = o.items as { title: string; photos: string[] } | null;
    return {
      found: true as const,
      order: {
        code: o.code, status: o.status, courier: o.courier, tracking: o.tracking_number,
        date: o.order_date, price: o.price, advance: o.advance_paid, balance: o.balance_due,
        name: (o.customers as { name: string }).name, item: item?.title ?? "", photo: item?.photos?.[0] ?? null,
      },
    };
  });
