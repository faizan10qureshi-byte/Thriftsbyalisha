import { Link } from "@tanstack/react-router";
import { Instagram, Menu, ShoppingBag, User, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatBubble } from "./ChatBubble";
import { useCart } from "@/lib/cart";

const NAV = [
  { to: "/shop", label: "Shop" },
  { to: "/track", label: "Track order" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
] as const;

export function SiteLayout({ children }: { children: ReactNode }) {
  const { items } = useCart();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-gradient-cta py-2 text-center text-xs font-semibold tracking-wide text-primary-foreground">
        Nationwide delivery via TCS · One-of-a-kind pieces, sourced weekly in Islamabad
      </div>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="font-display text-2xl font-bold italic">thriftsbyalisha</Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="transition-colors hover:text-primary" activeProps={{ className: "text-primary" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Link to="/account" aria-label="My account" className="grid h-10 w-10 place-items-center rounded-full hover:bg-accent"><User className="h-5 w-5" /></Link>
            <Link to="/cart" aria-label="Cart" className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-accent">
              <ShoppingBag className="h-5 w-5" />
              {items.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{items.length}</span>
              )}
            </Link>
            <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-accent md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t md:hidden">
              <div className="flex flex-col p-4">
                {NAV.map((n) => (
                  <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="py-2 font-display text-xl">{n.label}</Link>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
      <motion.main className="flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        {children}
      </motion.main>
      <ChatBubble />
      <footer className="mt-20 border-t bg-gradient-blush">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
          <div>
            <p className="font-display text-2xl font-bold italic">thriftsbyalisha</p>
            <p className="mt-2 text-sm text-muted-foreground">Pre-loved fashion with a second story. Islamabad, Pakistan.</p>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <Link to="/shop" className="hover:text-primary">Shop all</Link>
            <Link to="/track" className="hover:text-primary">Track your order</Link>
            <Link to="/faq" className="hover:text-primary">Delivery & returns</Link>
            <Link to="/admin" className="hover:text-primary">Team login</Link>
          </div>
          <div className="text-sm">
            <a href="https://instagram.com/thriftsbyalisha" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold hover:text-primary">
              <Instagram className="h-4 w-4" /> @thriftsbyalisha
            </a>
            <p className="mt-2 text-muted-foreground">WhatsApp: 0300-0000000</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
