import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = { id: string; title: string; price: number; size: string; photo: string };

type Ctx = {
  items: CartItem[];
  add: (i: CartItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  saved: string[];
  toggleSaved: (id: string) => void;
};

const CartCtx = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem("tba-cart") ?? "[]"));
      setSaved(JSON.parse(localStorage.getItem("tba-saved") ?? "[]"));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem("tba-cart", JSON.stringify(items));
  }, [items, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem("tba-saved", JSON.stringify(saved));
  }, [saved, ready]);

  return (
    <CartCtx.Provider
      value={{
        items,
        add: (i) => setItems((p) => (p.some((x) => x.id === i.id) ? p : [...p, i])),
        remove: (id) => setItems((p) => p.filter((x) => x.id !== id)),
        clear: () => setItems([]),
        saved,
        toggleSaved: (id) =>
          setSaved((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])),
      }}
    >
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
