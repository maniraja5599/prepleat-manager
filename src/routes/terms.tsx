import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms and Conditions — Eyas Saree Drapist" },
      { name: "description", content: "Terms of Service and Conditions for Eyas Saree Drapist & PrePleat Studio." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-foreground font-sans min-h-screen bg-background">
      <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-primary">Terms &amp; Conditions</h1>
          <p className="text-xs text-muted-foreground mt-1">Last updated: September 2026</p>
        </div>
        <Link to="/" className="text-xs text-primary font-semibold hover:underline">
          &larr; Back to App
        </Link>
      </div>

      <div className="space-y-6 text-xs text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-sm font-bold text-foreground mb-2">1. Overview &amp; Acceptance</h2>
          <p>
            Welcome to Eyas Saree Drapist (&quot;PrePleat Studio&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). These Terms of Service govern your access to and use of our booking platform, website (<span className="text-foreground font-medium">prepleat-manager.vercel.app</span>), and professional saree pre-pleating, folding, and draping services. By booking an appointment or utilizing our platform, you agree to be bound by these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-bold text-foreground mb-2">2. Services Offered</h2>
          <p>
            Eyas Saree Drapist provides professional saree care and preparation services, including:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Saree Pre-pleating and Box Folding (Silk, Georgette, Cotton, Organza, Kanjeevaram, etc.)</li>
            <li>Bridal &amp; Event Saree Draping appointments</li>
            <li>Steam Ironing and Zari care preparation</li>
            <li>Doorstep and studio collection / delivery coordination</li>
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-bold text-foreground mb-2">3. Appointments &amp; Bookings</h2>
          <p>
            Customers must provide accurate contact details, saree drop-off / event dates, and timing. For bridal and muhurtham orders, slots are reserved on a first-come, first-served basis upon confirmation.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-bold text-foreground mb-2">4. Pricing, Payment &amp; Billing</h2>
          <p>
            All prices are stated in Indian Rupees (INR ₹) inclusive of applicable taxes. Payments may be made via verified digital payment gateways (UPI, Cards, Net Banking) or upon service completion as agreed. Invoices and receipts are provided digitally.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-bold text-foreground mb-2">5. Saree Care &amp; Handling</h2>
          <p>
            We take exceptional care with luxury and delicate fabrics. Customers are advised to notify us of pre-existing damages, fragile zaris, or special handling instructions prior to service commencement.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-bold text-foreground mb-2">6. Cancellation &amp; Refund Policy</h2>
          <p>
            Please review our dedicated <Link to="/refund" className="text-primary font-semibold underline">Cancellation &amp; Refund Policy</Link>. Eligible refunds are processed directly to the original payment method within 5 to 7 business days.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-bold text-foreground mb-2">7. Governing Law &amp; Jurisdiction</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in Tamil Nadu, India.
          </p>
        </section>

        <section className="pt-4 border-t border-border">
          <h2 className="text-sm font-bold text-foreground mb-2">8. Contact Information</h2>
          <p>
            For inquiries, support, or billing queries:
          </p>
          <div className="mt-2 text-foreground font-medium space-y-1">
            <p>Eyas Saree Drapist / PrePleat Studio</p>
            <p>Email: <a href="mailto:eyasdrapist@gmail.com" className="text-primary underline">eyasdrapist@gmail.com</a></p>
            <p>Operating Region: Tamil Nadu, India</p>
          </div>
        </section>
      </div>
    </div>
  );
}
