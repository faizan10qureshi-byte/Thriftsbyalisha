import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "team" | "finance";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async (u: User | null) => {
      if (!active) return;
      setUser(u);
      if (u) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
        if (active) setRoles((data ?? []).map((r) => r.role as Role));
      } else setRoles([]);
      if (active) setLoading(false);
    };
    supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setTimeout(() => load(s?.user ?? null), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.includes("admin");
  const isStaff = isAdmin || roles.includes("team");
  const canFinance = isAdmin || roles.includes("finance");
  return { user, roles, loading, isAdmin, isStaff, canFinance };
}
