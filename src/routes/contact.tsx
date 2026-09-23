import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — Eyas Saree Drapist" },
      { name: "description", content: "Contact Eyas Saree Drapist & PrePleat Studio for appointments and inquiries." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-foreground font-sans min-h-screen bg-background">
      <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-primary">Contact Us</h1>
          <p className="text-xs text-muted-foreground mt-1">Get in touch for appointments, saree bookings, and customer support.</p>
        </div>
        <Link to="/" className="text-xs text-primary font-semibold hover:underline">
          &larr; Back to App
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6 pt-4">
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Mail className="size-4" />
              <span>Email Support</span>
            </div>
            <p className="text-xs text-muted-foreground">For bookings, cancellations, invoices, and payment queries:</p>
            <a href="mailto:eyasdrapist@gmail.com" className="text-xs font-semibold text-foreground underline block">
              eyasdrapist@gmail.com
            </a>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Phone className="size-4" />
              <span>Customer Help &amp; WhatsApp</span>
            </div>
            <p className="text-xs text-muted-foreground">Call or message for urgent bridal slot bookings:</p>
            <p className="text-xs font-semibold text-foreground">+91 98400 12345 / WhatsApp Available</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <MapPin className="size-4" />
              <span>Studio Location</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Eyas Saree Drapist Studio<br />
              Anna Nagar / Chennai Region<br />
              Tamil Nadu — 600040, India
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Clock className="size-4" />
              <span>Studio Hours</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Monday – Sunday: 8:00 AM – 9:00 PM<br />
              Early morning bridal appointments available on request.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
