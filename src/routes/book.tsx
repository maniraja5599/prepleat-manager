import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import logoAsset from "@/assets/eyas-logo.png";
import { z } from "zod";

const recipientSchema = z.string().uuid();

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Request a Booking — Eyas Saree Drapist" },
      { name: "description", content: "Request a PrePleat or Drape booking. We'll confirm by WhatsApp." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ to: typeof s.to === "string" ? s.to : undefined }),
  component: PublicBookPage,
});

function PublicBookPage() {
  const { to } = Route.useSearch();
  const recipient = to && recipientSchema.safeParse(to).success ? to : null;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState<"prepleat" | "drape">("prepleat");
  const [sareeCount, setSareeCount] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!recipient) return toast.error("Missing booking link recipient");
    if (!name.trim() || !phone.trim()) return toast.error("Name and phone are required");
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_user_id: recipient,
          name: name.trim(),
          phone: phone.trim(),
          service,
          saree_count: sareeCount,
          delivery_date: deliveryDate || null,
          delivery_time: deliveryTime || null,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || "Could not submit request");
        return;
      }
      setDone(true);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!recipient) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center px-5">
        <div className="max-w-sm w-full bg-card card-shadow rounded-3xl p-8 text-center">
          <div className="size-16 mx-auto rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-3">
            <AlertTriangle className="size-8" />
          </div>
          <h1 className="text-xl font-display font-semibold">Invalid booking link</h1>
          <p className="text-sm text-muted-foreground mt-2">
            This booking link is missing a recipient. Please use the personal booking link shared with you.
          </p>
        </div>
      </div>
    );
  }


  if (done) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center px-5">
        <div className="max-w-sm w-full bg-card card-shadow rounded-3xl p-8 text-center">
          <div className="size-16 mx-auto rounded-full bg-success/15 text-success flex items-center justify-center mb-3">
            <Check className="size-8" />
          </div>
          <h1 className="text-xl font-display font-semibold">Request received</h1>
          <p className="text-sm text-muted-foreground mt-2">
            We'll confirm your booking on WhatsApp at <span className="font-semibold text-foreground">{phone}</span> shortly.
          </p>
          <button onClick={() => { setDone(false); setName(""); setPhone(""); setSareeCount(1); setDeliveryDate(""); setDeliveryTime(""); setNotes(""); }}
            className="mt-5 w-full saree-gradient text-primary-foreground py-3 rounded-2xl text-sm font-semibold">
            Send another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-12">
      <div className="max-w-md mx-auto px-5 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-12 rounded-full overflow-hidden ring-2 ring-primary/20 shrink-0">
            <img src={logoAsset} alt="Eyas Saree Drapist" className="size-full rounded-full object-cover scale-[1.18]" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Eyas Saree Drapist</p>
            <h1 className="text-xl font-display font-semibold">Request a booking</h1>
          </div>
        </div>

        <div className="bg-card card-shadow rounded-2xl p-4 space-y-3">
          <Field label="Your name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
              className="w-full bg-secondary rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </Field>
          <Field label="WhatsApp number">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit phone" inputMode="tel"
              className="w-full bg-secondary rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </Field>
          <Field label="Service">
            <div className="grid grid-cols-2 gap-2">
              {(["prepleat", "drape"] as const).map((s) => (
                <button key={s} onClick={() => setService(s)}
                  className={`py-2.5 rounded-full text-sm font-semibold uppercase tracking-wider ${service === s ? "saree-gradient text-primary-foreground" : "bg-secondary"}`}>{s}</button>
              ))}
            </div>
          </Field>
          <Field label="Saree count">
            <div className="flex items-center gap-3">
              <button onClick={() => setSareeCount(Math.max(1, sareeCount - 1))} className="size-9 rounded-full bg-secondary font-bold">−</button>
              <span className="w-8 text-center text-lg font-bold tabular-nums">{sareeCount}</span>
              <button onClick={() => setSareeCount(sareeCount + 1)} className="size-9 rounded-full bg-secondary font-bold">+</button>
            </div>
          </Field>
          <Field label="Preferred delivery (optional)">
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}
                className="bg-secondary rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)}
                className="bg-secondary rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </Field>
          <Field label="Notes (optional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything we should know?"
              className="w-full bg-secondary rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </Field>
        </div>

        <button onClick={submit} disabled={submitting}
          className="w-full mt-4 saree-gradient text-primary-foreground py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {submitting ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
          {submitting ? "Sending…" : "Send request"}
        </button>
        <p className="text-[11px] text-center text-muted-foreground mt-3">
          We'll confirm by WhatsApp. No payment required to request.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
