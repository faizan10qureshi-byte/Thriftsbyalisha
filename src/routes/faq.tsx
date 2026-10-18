import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SectionTitle } from "@/components/site/bits";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ, delivery & sizing — thriftsbyalisha" },
      {
        name: "description",
        content:
          "Delivery times, advance payments, sizing guide and our exchange policy for thrifted orders across Pakistan.",
      },
      { property: "og:title", content: "FAQ — thriftsbyalisha" },
      { property: "og:description", content: "Delivery, sizing and returns." },
    ],
  }),
  component: Faq,
});

const QA = [
  [
    "How does delivery work?",
    "We ship nationwide with TCS (and Leopards / M&P where faster). Delivery is a flat Rs. 250 and usually takes 2–5 working days. You'll get a tracking number on WhatsApp once shipped.",
  ],
  [
    "Why do I pay an advance?",
    "Every piece is one of a kind, so a small advance (Rs. 500 per item) holds it just for you. The remaining balance is paid cash on delivery.",
  ],
  [
    "How long is an item reserved?",
    "Items stay reserved for 24 hours while we wait for your advance. After that they go back on the rail.",
  ],
  [
    "Can I return or exchange?",
    "Because items are pre-loved and single stock, we don't accept returns for change of mind. If something arrives with an undisclosed flaw, message us within 48 hours with photos and we'll offer an exchange or store credit.",
  ],
  [
    "Are the clothes washed?",
    "Yes — every piece is washed or steamed and checked before it's listed. Any flaws are written in the condition notes.",
  ],
] as const;

const SIZES = [
  ["XS", "30–31", "24–25", "33–34"],
  ["S", "32–33", "26–27", "35–36"],
  ["M", "34–36", "28–29", "37–38"],
  ["L", "38–40", "30–32", "39–41"],
  ["XL", "42–44", "33–35", "42–44"],
];

function Faq() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <SectionTitle eyebrow="Good to know" title="Questions & answers" />
        <Accordion
          type="single"
          collapsible
          className="mt-6 rounded-2xl border bg-card px-5 shadow-soft"
        >
          {QA.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="font-display text-lg">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <h2 className="mt-14 text-3xl font-semibold">Sizing guide (inches)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Vintage sizes vary — always check the measurements on each item.
        </p>
        <table className="mt-4 w-full overflow-hidden rounded-2xl border bg-card text-sm shadow-soft">
          <thead className="bg-blush text-left">
            <tr>
              {["Size", "Chest", "Waist", "Hip"].map((h) => (
                <th key={h} className="px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SIZES.map((r) => (
              <tr key={r[0]} className="border-t">
                {r.map((c, i) => (
                  <td key={i} className={`px-4 py-2.5 ${i === 0 ? "font-bold" : ""}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SiteLayout>
  );
}
