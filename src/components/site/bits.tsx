import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function HangerLoader({ label = "Finding treasures…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <svg
        viewBox="0 0 64 48"
        className="h-12 w-16 animate-hanger text-rose"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M32 4a5 5 0 0 1 5 5c0 3-5 4-5 8" />
        <path d="M32 17 6 36c-2 1.5-1 4 1.5 4h49c2.5 0 3.5-2.5 1.5-4L32 17Z" />
      </svg>
      <p className="font-display text-lg italic">{label}</p>
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  className,
}: {
  eyebrow?: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {eyebrow && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-primary">{eyebrow}</p>
      )}
      <h2 className="text-4xl font-semibold md:text-5xl">{title}</h2>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    Available: "bg-success/15 text-success",
    Reserved: "bg-warning/20 text-foreground",
    Sold: "bg-muted text-muted-foreground",
    Pending: "bg-warning/20 text-foreground",
    Confirmed: "bg-blush text-secondary-foreground",
    Packed: "bg-accent text-accent-foreground",
    Shipped: "bg-mauve/20 text-mauve",
    Delivered: "bg-success/15 text-success",
    Cancelled: "bg-destructive/15 text-destructive",
    New: "bg-primary/15 text-primary",
    Contacted: "bg-blush text-secondary-foreground",
    Interested: "bg-gold/25 text-foreground",
    Ordered: "bg-success/15 text-success",
    Lost: "bg-muted text-muted-foreground",
    Received: "bg-success/15 text-success",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[status] ?? "bg-muted"}`}
    >
      {status}
    </span>
  );
}
