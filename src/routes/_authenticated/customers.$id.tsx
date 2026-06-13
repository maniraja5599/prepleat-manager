import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, customerBookings, totalDue, fmtINR } from "@/lib/store";
import { ArrowLeft, MessageCircle, Trash2, Phone, Pencil, Check, X, MapPin, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/customers/$id")({
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const customer = useStore((s) => s.customers.find((c) => c.id === id));
  const bookings = useStore((s) => s.bookings);
  const deleteCustomer = useStore((s) => s.deleteCustomer);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const settings = useStore((s) => s.settings);
  const businessName = settings.businessName;
  const websiteUrl = settings.websiteUrl || "https://eyasdrapist.shop/";
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [reference, setReference] = useState(customer?.reference ?? "");

  if (!customer) {
    return <AppShell title="Customer"><p className="text-sm text-muted-foreground">Not found.</p></AppShell>;
  }

  const cb = customerBookings(customer.id, bookings);
  const totalSpent = cb.reduce((s, b) => s + b.advancePaid, 0);
  const totalDueAll = cb.reduce((s, b) => s + totalDue(b), 0);

  const buildMessage = (richEmojis: boolean) => {
    const e = (s: string) => (richEmojis ? s : "");
    const pending = cb.filter((b) => totalDue(b) > 0);
    const lines: string[] = [];
    lines.push(`${e("💛 ")}*${businessName}*`);
    lines.push("");
    lines.push(`Hi ${customer.name} ${e("🙏")}`);
    if (pending.length) {
      lines.push(`A gentle reminder ${e("🌸")} — you have ${pending.length} pending order${pending.length > 1 ? "s" : ""}.`);
      lines.push("");
      lines.push(`${e("💰 ")}*Balance due:* ${fmtINR(totalDueAll)}`);
      const next = pending[0];
      if (next) lines.push(`${e("📅 ")}*Next delivery:* ${format(parseISO(next.deliveryDate), "EEE, MMM d")}`);
      lines.push("");
      lines.push(`Pay via GPay / Cash on delivery. Thank you ${e("✨")}`);
    } else {
      lines.push(`Thank you for choosing us ${e("💛✨")}`);
      lines.push(`Looking forward to draping for you again soon.`);
    }
    lines.push("");
    lines.push(`${e("🌐 ")}${websiteUrl}`);
    return lines.join("\n");
  };

  const sendWhatsApp = () => {
    if (!customer.phone) return toast.error("No phone");
    const ph = customer.phone.replace(/\D/g, "");
    window.location.href = `https://wa.me/${ph}?text=${encodeURIComponent(buildMessage(true))}`;
  };

  const sendSMS = () => {
    if (!customer.phone) return toast.error("No phone");
    const ph = customer.phone.replace(/\D/g, "");
    const msg = buildMessage(false).replace(/\*/g, "").replace(/\n{2,}/g, "\n").trim();
    window.location.href = `sms:${ph}?&body=${encodeURIComponent(msg)}`;
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between pt-4 pb-3">
        <button onClick={() => navigate({ to: "/customers" })} className="size-10 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (editing) {
                updateCustomer(customer.id, { name: name.trim() || customer.name, phone: phone.trim() || customer.phone, address: address.trim() || undefined, reference: reference.trim() || undefined });
                toast.success("Customer updated");
              } else {
                setName(customer.name); setPhone(customer.phone); setAddress(customer.address ?? ""); setReference(customer.reference ?? "");
              }
              setEditing(!editing);
            }}
            className={`size-10 rounded-full flex items-center justify-center ${editing ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
          >{editing ? <Check className="size-5" /> : <Pencil className="size-5" />}</button>
          {editing && (
            <button onClick={() => setEditing(false)} className="size-10 rounded-full bg-secondary flex items-center justify-center"><X className="size-5" /></button>
          )}
          <button onClick={() => { if (confirm("Delete customer and all their bookings?")) { deleteCustomer(customer.id); navigate({ to: "/customers" }); } }} className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <Trash2 className="size-5" />
          </button>
        </div>
      </div>

      <div className="saree-gradient rounded-3xl p-5 text-primary-foreground card-shadow">
        {editing ? (
          <div className="space-y-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/15 placeholder-white/60 rounded-xl px-3 py-2 text-base font-semibold focus:outline-none" placeholder="Name" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="w-full bg-white/15 placeholder-white/60 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="Phone" />
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="w-full bg-white/15 placeholder-white/60 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" placeholder="Address" />
            <input value={reference} onChange={(e) => setReference(e.target.value)} className="w-full bg-white/15 placeholder-white/60 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="Reference (who referred)" />
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-display font-semibold truncate">{customer.name}</h1>
            <p className="text-sm opacity-90 flex items-center gap-1 mt-1"><Phone className="size-3.5"/>{customer.phone}</p>
            {customer.address && <p className="text-xs opacity-80 mt-1 flex items-start gap-1"><MapPin className="size-3.5 mt-0.5 shrink-0"/>{customer.address}</p>}
            {customer.reference && <p className="text-[11px] opacity-80 mt-1">ref: {customer.reference}</p>}
          </>
        )}
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div><p className="text-xs opacity-70 uppercase tracking-wider">Orders</p><p className="text-xl font-bold">{cb.length}</p></div>
          <div><p className="text-xs opacity-70 uppercase tracking-wider">Paid</p><p className="text-xl font-bold">{fmtINR(totalSpent)}</p></div>
          <div><p className="text-xs opacity-70 uppercase tracking-wider">Due</p><p className="text-xl font-bold">{fmtINR(totalDueAll)}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button onClick={sendWhatsApp} className="bg-[oklch(0.62_0.18_150)] text-white py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold active:scale-95 transition">
          <MessageCircle className="size-5" /> WhatsApp
        </button>
        <button onClick={sendSMS} className="bg-secondary text-foreground py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold active:scale-95 transition">
          <MessageSquare className="size-5" /> SMS
        </button>
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mt-5 mb-2">History</h2>
      {cb.length === 0 ? (
        <p className="text-sm text-muted-foreground bg-card rounded-2xl p-6 text-center card-shadow">No bookings yet.</p>
      ) : (
        <ul className="space-y-2">
          {cb.map((b) => (
            <li key={b.id}>
              <Link to="/bookings/$id" params={{ id: b.id }} className="block bg-card card-shadow rounded-2xl p-4">
                <div className="flex justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{b.service}</p>
                    <p className="font-semibold">{format(parseISO(b.deliveryDate), "MMM d, yyyy")}</p>
                    <p className="text-xs text-muted-foreground">{b.sareeCount} × {fmtINR(b.pricePerSaree)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{fmtINR(b.totalAmount)}</p>
                    {totalDue(b) > 0 ? <p className="text-xs text-destructive font-semibold">{fmtINR(totalDue(b))} due</p> : <p className="text-xs text-success">Paid</p>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
