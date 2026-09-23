import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing & Services — Eyas Saree Drapist" },
      { name: "description", content: "Transparent service pricing for saree prepleating, box folding, and draping." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const services = [
    {
      name: "Standard Pre-Pleating",
      price: "₹250",
      desc: "Ideal for cotton, georgette, chiffon, and daily/party wear sarees.",
      features: [
        "Shoulder & waist pleating",
        "Steam finish and pin-setting",
        "Neat hanger / roll pack",
        "24-48 hours delivery",
      ],
    },
    {
      name: "Silk & Kanjeevaram Luxury",
      price: "₹350",
      desc: "Specialized delicate zari care for bridal and heavy pattu sarees.",
      features: [
        "Precision gold zari pleat alignment",
        "Low-heat protective steam ironing",
        "Rigid box packing with tissue lining",
        "Crease-free travel guarantee",
      ],
      popular: true,
    },
    {
      name: "Bridal Draping Appointment",
      price: "₹1,499",
      desc: "Professional on-location or studio bridal dressing and styling.",
      features: [
        "Complete saree draping with double-pin locking",
        "Pleat spread & flare styling",
        "Jewelry & hip-belt (Oddiyanam) fixing",
        "Includes complimentary veil/pallu setting",
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-foreground font-sans min-h-screen bg-background">
      <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-primary">Services &amp; Pricing</h1>
          <p className="text-xs text-muted-foreground mt-1">Clear, transparent pricing with no hidden charges.</p>
        </div>
        <Link to="/" className="text-xs text-primary font-semibold hover:underline">
          &larr; Back to App
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6 pt-2">
        {services.map((s) => (
          <div
            key={s.name}
            className={`p-6 rounded-2xl border flex flex-col justify-between ${
              s.popular
                ? "border-primary bg-primary/5 shadow-md relative"
                : "border-border bg-card"
            }`}
          >
            {s.popular && (
              <span className="absolute -top-3 left-6 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="size-3" /> Most Popular
              </span>
            )}

            <div>
              <h3 className="font-bold text-base text-foreground">{s.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">{s.desc}</p>

              <div className="my-4">
                <span className="text-3xl font-extrabold text-foreground">{s.price}</span>
                <span className="text-xs text-muted-foreground"> / saree</span>
              </div>

              <div className="space-y-2 pt-4 border-t border-border">
                {s.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="size-3.5 text-primary shrink-0 stroke-[2.5]" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 mt-4">
              <Link
                to="/auth"
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center transition ${
                  s.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                Book Appointment
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-4 rounded-xl border border-border bg-card text-center text-xs text-muted-foreground">
        Need bulk wedding packages or event orders? Contact us at{" "}
        <a href="mailto:eyasdrapist@gmail.com" className="text-primary font-semibold underline">
          eyasdrapist@gmail.com
        </a>{" "}
        for customized group rates.
      </div>
    </div>
  );
}
