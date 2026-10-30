import { Link, useParams } from "react-router-dom";
import NotFound from "@/pages/NotFound";

// Simple editorial content pages (footer policy/support links) — static copy only.
const CONTENT: Record<string, { title: string; overline: string; blocks: { h?: string; p: string[] }[] }> = {
  about: {
    overline: "Our story",
    title: "About Salesphere",
    blocks: [
      {
        p: [
          "Salesphere is a fashion destination for men, women and kids — a curated sphere of clothing, footwear and accessories at honest prices. We edit rather than overwhelm: a tight catalogue of tees, shirts, dresses, denim, ethnic wear and more, each chosen for fabric, fit and finish.",
        ],
      },
      {
        p: [
          "This storefront is built as the customer-facing half of a Data Warehousing and Mining project. The catalogue you browse is clearly-labelled sample data; behind it sits a real FastAPI + MongoDB backend handling accounts, carts, COD orders and inventory — the same data model that will later feed the Salesphere Manager Dashboard's RFM and clustering analytics.",
        ],
      },
    ],
  },
  "shipping-returns": {
    overline: "Policies",
    title: "Shipping & Returns",
    blocks: [
      {
        h: "Delivery",
        p: [
          "Orders are dispatched within 24–48 hours and typically arrive within 5–7 business days. Delivery is free on orders of ₹1,499 and above; a flat ₹99 fee applies below that.",
        ],
      },
      {
        h: "Cash on Delivery",
        p: [
          "Pay in cash when your order arrives. There are no extra COD fees. Keep the exact amount ready — our delivery partner carries limited change.",
        ],
      },
      {
        h: "Returns & exchanges",
        p: [
          "You can raise a return or size exchange within 7 days of delivery, provided the item is unworn with tags intact. Refunds for COD orders are processed to your bank account once the pickup is completed.",
        ],
      },
    ],
  },
  privacy: {
    overline: "Policies",
    title: "Privacy Policy",
    blocks: [
      {
        p: [
          "Salesphere collects only what it needs to run your shopping experience: your name, contact details, addresses, order history and minimal activity events (product views, searches, cart and wishlist activity) that improve recommendations and — later — analytics.",
        ],
      },
      {
        p: [
          "Passwords are stored only as salted hashes and are never readable by anyone at Salesphere. Sign-in sessions ride httpOnly cookies and expire automatically. We never sell your data. Because this is a student project, all catalogue data is synthetic sample data — no real customer information is collected on this deployment.",
        ],
      },
    ],
  },
  contact: {
    overline: "Customer care",
    title: "Contact Us",
    blocks: [
      {
        h: "We're here to help",
        p: [
          "Email support@salesphere.in for order help, returns or feedback — we reply within one working day, Monday to Saturday, 9 AM to 7 PM IST.",
        ],
      },
      {
        h: "Order questions",
        p: [
          "For the fastest help, keep your order ID (it looks like SP-XXXXXXXX) handy — you'll find it on the confirmation page and under My Orders.",
        ],
      },
    ],
  },
};

export default function StaticPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? CONTENT[slug] : undefined;

  if (!page) return <NotFound />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6" data-testid={`static-page-${slug}`}>
      <p className="overline-label">{page.overline}</p>
      <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight sm:text-5xl">{page.title}</h1>
      <div className="mt-8 space-y-8">
        {page.blocks.map((block, i) => (
          <section key={i}>
            {block.h && <h2 className="font-heading text-2xl font-medium">{block.h}</h2>}
            {block.p.map((para, j) => (
              <p key={j} className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
      <div className="mt-12 border-t border-border pt-6">
        <Link to="/" className="text-xs font-semibold uppercase tracking-[0.16em] underline underline-offset-4 hover:text-sale" data-testid="static-page-back-home">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
