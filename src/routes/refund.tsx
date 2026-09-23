import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Cancellation & Refund Policy — Eyas Saree Drapist" },
      { name: "description", content: "Cancellation and 5-7 business days refund policy for Eyas Saree Drapist." },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-foreground font-sans min-h-screen bg-background">
      <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-primary">Cancellation &amp; Refund Policy</h1>
          <p className="text-xs text-muted-foreground mt-1">Last updated: September 2026</p>
        </div>
        <Link to="/" className="text-xs text-primary font-semibold hover:underline">
          &larr; Back to App
        </Link>
      </div>

      <div className="space-y-6 text-xs text-muted-foreground leading-relaxed">
        {/* Highlight Guarantee Box for Cashfree Compliance */}
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl text-foreground space-y-1">
          <p className="font-bold text-sm text-primary">⚡ 5–7 Business Days Refund Guarantee</p>
          <p className="text-xs text-muted-foreground">
            In compliance with Reserve Bank of India (RBI) payment aggregator guidelines, any approved refund will be credited back directly to the customer&apos;s original payment method (Bank Account / UPI / Debit or Credit Card) within <span className="font-semibold text-foreground">5 to 7 working business days</span>.
          </p>
        </div>

        <section>
          <h2 className="text-sm font-bold text-foreground mb-2">1. Appointment Cancellation</h2>
          <p>
            Customers may cancel or reschedule their saree pre-pleating or draping bookings under the following terms:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1.5">
            <li>
              <span className="font-semibold text-foreground">Before work commences:</span> If you cancel at least 24 hours prior to scheduled saree pickup/drop-off, a <span className="font-semibold text-foreground">100% full refund</span> will be granted.
            </li>
            <li>
              <span className="font-semibold text-foreground">Bridal / Event Draping Appointments:</span> Cancellations made at least 48 hours before the event date qualify for a full refund of any advance paid.
            </li>
            <li>
              <span className="font-semibold text-foreground">After service execution:</span> Once a saree has been steamed, pleat-set, and boxed or the draping service completed, cancellations are not applicable.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-bold text-foreground mb-2">2. Rescheduling Policy</h2>
          <p>
            We understand wedding and auspicious muhurtham schedules can shift. Rescheduling is complimentary if informed at least 12 hours in advance, subject to slot availability.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-bold text-foreground mb-2">3. Refund Processing Timeline</h2>
          <p>
            Once a cancellation is confirmed by our support team:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>The refund request is initiated within 24 hours of approval.</li>
            <li>The funds will be credited to the original payment source (UPI, Debit Card, Credit Card, or Net Banking) within <span className="font-semibold text-foreground">5 to 7 working business days</span>.</li>
            <li>You will receive an electronic confirmation with the payment gateway transaction reference.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-bold text-foreground mb-2">4. Quality Concern &amp; Redo Guarantee</h2>
          <p>
            If you are not fully satisfied with pleat alignment, width, or folding, bring the saree to us within 24 hours and we will re-pleat and steam-finish it free of cost.
          </p>
        </section>

        <section className="pt-4 border-t border-border">
          <h2 className="text-sm font-bold text-foreground mb-2">5. How to Request a Refund</h2>
          <p>
            To initiate a cancellation or refund, please reach out with your customer name, phone number, and booking date:
          </p>
          <div className="mt-2 text-foreground font-medium space-y-1">
            <p>Eyas Saree Drapist Support</p>
            <p>Email: <a href="mailto:eyasdrapist@gmail.com" className="text-primary underline">eyasdrapist@gmail.com</a></p>
            <p>Location: Tamil Nadu, India</p>
          </div>
        </section>
      </div>
    </div>
  );
}
