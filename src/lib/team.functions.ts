import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
  if (!data?.length) throw new Error("Only the owner can manage the team");
}

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("id,user_id,role");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const byId = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    const rows = (roles ?? []).map((r) => ({ ...r, email: byId.get(r.user_id) ?? "unknown" }));
    for (const u of users?.users ?? []) {
      if (!rows.some(r => r.user_id === u.id)) rows.push({ id: u.id, user_id: u.id, role: "none" as typeof rows[number]["role"], email: u.email ?? "unknown" });
    }
    return rows;
  });

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().trim().email(), role: z.enum(["admin", "team", "finance"]) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const u = users?.users.find((x) => x.email?.toLowerCase() === data.email.toLowerCase());
    if (!u) return { ok: false as const, error: "No account with that email yet — ask them to sign up first." };
    const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: u.id, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error("Access could not be saved");
    return { ok: true as const };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("user_roles").select("user_id,role").eq("id", data.id).single();
    if (row?.user_id === context.userId && row.role === "admin") throw new Error("You can't remove your own owner access");
    const { error } = await supabaseAdmin.from("user_roles").delete().eq("id", data.id);
    if (error) throw new Error("Access could not be removed");
    return { ok: true };
  });
