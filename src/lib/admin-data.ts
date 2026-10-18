import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminItems() {
  return useQuery({
    queryKey: ["admin", "items"],
    queryFn: async () => {
      const [{ data: items, error }, { data: costs }] = await Promise.all([
        supabase.from("items").select("*").order("created_at", { ascending: false }),
        supabase.from("item_costs").select("item_id,cost_price"),
      ]);
      if (error) throw error;
      const map = new Map((costs ?? []).map((c) => [c.item_id, c.cost_price]));
      return (items ?? []).map((i) => ({ ...i, cost_price: map.get(i.id) ?? 0 }));
    },
  });
}

export function useAdminOrders() {
  return useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, customers(id,name,phone,city), items(id,title,category,photos)")
        .order("order_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminLeads() {
  return useQuery({
    queryKey: ["admin", "leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, customers(name,phone,instagram_handle), items(title)")
        .order("first_contact_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminCustomers() {
  return useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminExpenses(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["admin", "expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRefreshAdmin() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["admin"] });
}

/** Revenue counts orders that weren't cancelled. */
export const countsAsSale = (status: string) => status !== "Cancelled" && status !== "Pending";

export function weekKey(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}
