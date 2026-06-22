import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Eyas Saree Drapist" },
      { name: "description", content: "Privacy policy for Eyas Saree Drapist App." },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 text-foreground font-sans min-h-screen bg-background">
      <h1 className="text-3xl font-bold mb-4 font-display text-primary">Privacy Policy</h1>
      <p className="text-[10px] text-muted-foreground mb-8">Last updated: June 22, 2026</p>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-base font-bold mb-2 text-foreground">1. Introduction</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Welcome to Eyas Saree Drapist. We value your privacy and are committed to protecting the personal data of our customers and users. This privacy policy explains how we collect, use, and protect your information when you use our booking application.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2 text-foreground">2. Information We Collect</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We collect personal information that you provide directly to us, including:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-muted-foreground">
            <li>Contact details such as Name, Phone number, and Address.</li>
            <li>Booking preferences, saree count, and delivery details.</li>
            <li>Payment records and outstanding balances.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2 text-foreground">3. How We Use Your Information</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We use your personal data to:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-muted-foreground">
            <li>Schedule, manage, and complete your saree prepleat/draping appointments.</li>
            <li>Send WhatsApp reminders, invoices, and booking confirmations.</li>
            <li>Process payments and maintain billing history.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2 text-foreground">4. Data Security & Storage</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your booking details are stored securely using Google Firebase services. We implement strict security access controls to protect your data from unauthorized access, loss, misuse, or alteration.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2 text-foreground">5. Data Deletion</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You can request the deletion of your customer account and all associated booking data at any time by contacting us directly.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2 text-foreground">6. Contact Us</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            If you have any questions regarding this Privacy Policy, please contact us at:  
            <br />
            <span className="font-semibold text-foreground mt-1 block">Email: eyassareedrapist@gmail.com</span>
          </p>
        </section>
      </div>
    </div>
  );
}
