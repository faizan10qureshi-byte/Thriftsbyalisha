import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const COLS =
  "id,title,category,subcategory,size,measurements,condition_notes,description,photos,sell_price,status,created_at";

export const itemsQuery = () =>
  queryOptions({
    queryKey: ["items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select(COLS)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const itemQuery = (id: string) =>
  queryOptions({
    queryKey: ["item", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select(COLS).eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
