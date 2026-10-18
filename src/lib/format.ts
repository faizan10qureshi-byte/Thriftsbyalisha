import dress from "@/assets/p-dress.jpg";
import sneakers from "@/assets/p-sneakers.jpg";
import denim from "@/assets/p-denim.jpg";
import heels from "@/assets/p-heels.jpg";
import top from "@/assets/p-top.jpg";
import boots from "@/assets/p-boots.jpg";
import satin from "@/assets/p-satin.jpg";

const PHOTO_MAP: Record<string, string> = { dress, sneakers, denim, heels, top, boots, satin };

export function photoUrl(key?: string | null): string {
  if (!key) return dress;
  if (key.startsWith("http") || key.startsWith("data:")) return key;
  return PHOTO_MAP[key] ?? dress;
}

export const pkr = (n: number | null | undefined) =>
  `Rs. ${Math.round(n ?? 0).toLocaleString("en-PK")}`;

export const DELIVERY_FEE = 250;
export const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
] as const;
export const LEAD_STATUSES = ["New", "Contacted", "Interested", "Ordered", "Lost"] as const;
export const LEAD_SOURCES = ["Storefront", "Instagram", "WhatsApp"] as const;
export const ITEM_STATUSES = ["Available", "Reserved", "Sold"] as const;
export const EXPENSE_TYPES = ["sourcing", "ads", "packaging", "delivery"] as const;
/** Hours without a reply before a lead is flagged. */
export const LEAD_STALE_HOURS = 24;

export function isLeadStale(
  lead: { status: string; first_contact_at: string; last_reply_at: string | null },
  now = Date.now(),
) {
  if (lead.status === "Ordered" || lead.status === "Lost") return false;
  const ref = new Date(lead.last_reply_at ?? lead.first_contact_at).getTime();
  return now - ref > LEAD_STALE_HOURS * 3600_000;
}

export function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const h = (Date.now() - new Date(iso).getTime()) / 3600_000;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export const PK_PHONE = /^03\d{2}-?\d{7}$/;
export function normalizePhone(p: string) {
  const d = p.replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 4)}-${d.slice(4)}` : p.trim();
}
