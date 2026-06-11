import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, totalDue, fmtINR, fmtTime12, type ServiceType, type PaymentMode } from "@/lib/store";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Trash2, MessageCircle, Plus, Check, Pencil, X, CalendarPlus, Receipt, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bookings/$id")({
  component: BookingDetail,
});

function BookingDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const allPayments = useStore((s) => s.payments);
  const booking = bookings.find((b) => b.id === id);
  const customer = booking ? customers.find((c) => c.id === booking.customerId) : undefined;
  const payments = allPayments.filter((p) => p.bookingId === id);
  const addPayment = useStore((s) => s.addPayment);
  const deletePayment = useStore((s) => s.deletePayment);
  const deleteBooking = useStore((s) => s.deleteBooking);
  const restoreBooking = useStore((s) => s.restoreBooking);
  const updateBooking = useStore((s) => s.updateBooking);
  const settings = useStore((s) => s.settings);
  const businessName = settings.businessName;
  const [payAmt, setPayAmt] = useState("");
  const [payMode, setPayMode] = useState<PaymentMode>(settings.defaultPaymentMode ?? "gpay");
  const [payNote, setPayNote] = useState("");
  const [editing, setEditing] = useState(false);

  if (!booking) {
    return (
      <AppShell title="Booking">
        <p className="text-muted-foreground text-sm">Not found. <Link to="/bookings" className="text-primary">Go back</Link></p>
      </AppShell>
    );
  }

  const due = totalDue(booking);

  const buildWhatsAppMessage = (kind: "reminder" | "bill") => {
    const site = settings.websiteUrl || "https://eyasdrapist.shop/";
    const dateStr = format(parseISO(booking.deliveryDate), "EEE, MMM d");
    const timeStr = fmtTime12(booking.deliveryTime);
    const paid = booking.advancePaid;
    const lines = [
      kind === "bill" ? `🧾 *${businessName}* — Bill` : `🧵 *${businessName}*`,
      ``,
      `Hi ${customer?.name} ✨`,
      kind === "bill"
        ? `Thank you for choosing us 💛 Here are your order details:`
        : `Friendly reminder about your saree order 💛`,
      ``,
      `📌 *Service:* ${booking.service.toUpperCase()}`,
      `🪡 *Sarees:* ${booking.sareeCount} × ${fmtINR(booking.pricePerSaree)}`,
      `📅 *Delivery:* ${dateStr}, ${timeStr}`,
      ``,
      `*Total:* ${fmtINR(booking.totalAmount)}`,
      `*Paid:* ${fmtINR(paid)}`,
      due > 0 ? `*Balance:* ${fmtINR(due)}` : `*Status:* ✅ Fully Paid`,
      ``,
      `🌐 ${site}`,
    ];
    return lines.join("\n");
  };

  const sendWhatsApp = (kind: "reminder" | "bill" = "reminder") => {
    if (!customer?.phone) return toast.error("No phone number");
    const phone = customer.phone.replace(/\D/g, "");
    const msg = buildWhatsAppMessage(kind);
    const encoded = encodeURIComponent(msg);
    // Try native app first, fall back to wa.me without opening an extra tab
    const native = `whatsapp://send?phone=${phone}&text=${encoded}`;
    const fallback = `https://wa.me/${phone}?text=${encoded}`;
    const start = Date.now();
    window.location.href = native;
    setTimeout(() => {
      if (Date.now() - start < 1600 && document.visibilityState === "visible") {
        window.location.href = fallback;
      }
    }, 800);
  };

  const addToGoogleCalendar = () => {
    const [hh, mm] = (booking.deliveryTime || "10:00").split(":").map((x) => Number(x) || 0);
    const start = new Date(booking.deliveryDate); start.setHours(hh, mm, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, "0") + String(d.getUTCDate()).padStart(2, "0") +
      "T" + String(d.getUTCHours()).padStart(2, "0") + String(d.getUTCMinutes()).padStart(2, "0") + "00Z";
    const text = encodeURIComponent(`${booking.service.toUpperCase()} · ${customer?.name ?? ""} (${businessName})`);
    const details = encodeURIComponent(`${booking.sareeCount} saree(s) · ${fmtINR(booking.totalAmount)}\nPhone: ${customer?.phone ?? ""}\n${booking.notes ?? ""}`);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${fmt(start)}/${fmt(end)}&details=${details}`;
    window.open(url, "_blank");
  };

  const printBill = () => {
    const site = settings.websiteUrl || "https://eyasdrapist.shop/";
    const dateStr = format(parseISO(booking.deliveryDate), "EEE, MMM d, yyyy");
    const timeStr = fmtTime12(booking.deliveryTime);
    const rows = `
      <tr><td>Service</td><td>${booking.service.toUpperCase()}</td></tr>
      <tr><td>Sarees</td><td>${booking.sareeCount} × ${fmtINR(booking.pricePerSaree)}</td></tr>
      <tr><td>Delivery</td><td>${dateStr} · ${timeStr}</td></tr>
      <tr><td>Total</td><td><b>${fmtINR(booking.totalAmount)}</b></td></tr>
      <tr><td>Paid</td><td>${fmtINR(booking.advancePaid)}</td></tr>
      <tr><td>Balance</td><td><b>${fmtINR(due)}</b></td></tr>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Bill — ${customer?.name}</title>
      <style>
        body{font-family:'Inter',system-ui,sans-serif;color:#222;max-width:480px;margin:24px auto;padding:24px;border:1px solid #eee;border-radius:18px}
        h1{font-family:Georgia,serif;color:#7a1f2a;margin:0 0 4px}
        .muted{color:#888;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:18px}
        td{padding:8px 0;border-bottom:1px dashed #eee;font-size:14px}
        td:last-child{text-align:right}
        .site{margin-top:24px;text-align:center;color:#7a1f2a;font-weight:600;font-size:13px}
        .foot{margin-top:8px;text-align:center;color:#aaa;font-size:11px}
        @media print { body{border:0; margin:0} }
      </style></head><body>
      <h1>${businessName}</h1>
      <p class="muted">Bill · ${format(new Date(), "MMM d, yyyy")}</p>
      <p style="margin-top:14px"><b>${customer?.name ?? ""}</b><br><span class="muted">${customer?.phone ?? ""}</span></p>
      <table>${rows}</table>
      <p class="site">🌐 ${site}</p>
      <p class="foot">Thank you for choosing us 💛</p>
      <script>window.onload=()=>setTimeout(()=>window.print(),250)</script>
      </body></html>`;
    const w = window.open("", "_blank", "width=520,height=720");
    if (!w) return toast.error("Allow pop-ups to print the bill");
    w.document.write(html); w.document.close();
  };

  const handlePay = () => {
    const n = Number(payAmt);
    if (!n || n <= 0) return toast.error("Enter a valid amount");
    if (n > due) {
      const ok = window.confirm(`Amount ${fmtINR(n)} exceeds pending ${fmtINR(due)}. Continue anyway?`);
      if (!ok) return;
    }
    addPayment({ bookingId: booking.id, customerId: booking.customerId, amount: n, date: new Date().toISOString(), mode: payMode, note: payNote.trim() || undefined });
    setPayAmt(""); setPayNote("");
    toast.success(`Payment of ${fmtINR(n)} added`);
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between pt-4 pb-3">
        <button onClick={() => navigate({ to: "/bookings" })} className="size-10 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing((v) => !v)}
            className={cn(
              "size-10 rounded-full flex items-center justify-center",
              editing ? "bg-primary text-primary-foreground" : "bg-secondary",
            )}
            aria-label="Edit"
          >{editing ? <X className="size-5" /> : <Pencil className="size-5" />}</button>
          <button
            onClick={() => {
              const bid = booking.id;
              deleteBooking(bid);
              toast.success("Booking deleted", {
                action: { label: "Undo", onClick: () => { restoreBooking(bid); toast.success("Restored"); } },
                duration: 6000,
              });
              navigate({ to: "/bookings" });
            }}
            className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center"
          ><Trash2 className="size-5" /></button>
        </div>
      </div>

      <div className="saree-gradient rounded-3xl p-5 text-primary-foreground card-shadow">
        <p className="text-xs uppercase tracking-wider opacity-80">{booking.service}</p>
        <h1 className="text-2xl font-display font-semibold mt-1 truncate">{customer?.name}</h1>
        <p className="text-sm opacity-90">{customer?.phone}</p>
        {customer?.address && <p className="text-xs opacity-80 mt-1 line-clamp-2">{customer.address}</p>}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="opacity-70 text-xs uppercase tracking-wider">Delivery</p>
            <p className="font-semibold">{format(parseISO(booking.deliveryDate), "EEE, MMM d")}</p>
            <p>{fmtTime12(booking.deliveryTime)}</p>
          </div>
          <div>
            <p className="opacity-70 text-xs uppercase tracking-wider">Sarees</p>
            <p className="font-semibold">{booking.sareeCount} × {fmtINR(booking.pricePerSaree)}</p>
            <p>= {fmtINR(booking.totalAmount)}</p>
          </div>
        </div>
      </div>

      {editing && (
        <EditPanel
          booking={booking}
          onSave={(patch) => {
            const total = patch.sareeCount * patch.pricePerSaree;
            updateBooking(booking.id, { ...patch, totalAmount: total });
            toast.success("Booking updated");
            setEditing(false);
          }}
        />
      )}

      <div className="bg-card card-shadow rounded-2xl p-4 mt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment</h2>
          {due === 0 ? (
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-success/15 text-success">Fully paid</span>
          ) : <span className="text-xs font-semibold text-destructive">{fmtINR(due)} due</span>}
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span>Total</span><span className="font-semibold tabular-nums">{fmtINR(booking.totalAmount)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span>Paid</span><span className="font-semibold tabular-nums text-success">{fmtINR(booking.advancePaid)}</span>
        </div>
        {due > 0 && (
          <>
            <div className="mt-3 flex gap-2">
              <input
                value={payAmt}
                onChange={(e) => setPayAmt(e.target.value)}
                type="number"
                placeholder={`Add payment (due ${due})`}
                className="flex-1 min-w-0 bg-secondary border-0 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button onClick={handlePay} className="size-10 shrink-0 rounded-full saree-gradient text-primary-foreground flex items-center justify-center">
                <Plus className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button onClick={() => setPayAmt(String(Math.round(due / 2)))} className="py-1.5 rounded-full bg-secondary text-xs font-semibold">50%</button>
              <button onClick={() => setPayAmt(String(due))} className="py-1.5 rounded-full bg-secondary text-xs font-semibold">Full ({fmtINR(due)})</button>
              <button onClick={() => setPayAmt("")} className="py-1.5 rounded-full bg-secondary text-xs font-semibold">Clear</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {(["gpay", "cash", "other"] as PaymentMode[]).map((m) => (
                <button key={m} onClick={() => setPayMode(m)} className={cn("py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider",
                  payMode === m ? "bg-primary text-primary-foreground" : "bg-secondary")}>{m}</button>
              ))}
            </div>
            <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Note (optional)"
              className="w-full mt-2 bg-secondary rounded-full px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
          </>
        )}
        {payments.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between items-center text-muted-foreground border-t border-border pt-1.5">
                <span className="truncate">{format(parseISO(p.date), "MMM d")} · {(p.mode ?? "gpay").toUpperCase()}{p.note ? ` · ${p.note}` : ""}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="tabular-nums">{fmtINR(p.amount)}</span>
                  <button
                    onClick={() => { if (confirm("Delete this payment?")) deletePayment(p.id); }}
                    className="text-destructive/70 hover:text-destructive"
                  ><X className="size-3" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {booking.measurements && booking.measurements.length > 0 && (
        <div className="bg-card card-shadow rounded-2xl p-4 mt-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Measurements (inch)</h2>
          <div className="flex gap-4 flex-wrap">
            {booking.measurements.map((m) => (
              <div key={m.label}>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-lg font-bold tabular-nums">{m.value}″</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {booking.notes && (
        <div className="bg-card card-shadow rounded-2xl p-4 mt-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{booking.notes}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={() => sendWhatsApp("reminder")} className="bg-[oklch(0.62_0.18_150)] text-white py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold active:scale-95 transition">
          <MessageCircle className="size-5" /> Reminder
        </button>
        <button onClick={() => sendWhatsApp("bill")} className="bg-primary text-primary-foreground py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold active:scale-95 transition">
          <Receipt className="size-5" /> Send bill
        </button>
      </div>
      <button
        onClick={() => {
          updateBooking(booking.id, { status: booking.status === "delivered" ? "pending" : "delivered", completedAt: new Date().toISOString() });
          toast.success(booking.status === "delivered" ? "Marked pending" : "Marked delivered");
        }}
        className={cn("w-full mt-2 py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold active:scale-95 transition",
          booking.status === "delivered" ? "bg-muted text-foreground" : "bg-success/15 text-success")}
      >
        <Check className="size-5" /> {booking.status === "delivered" ? "Reopen booking" : "Mark delivered"}
      </button>

      <button
        onClick={addToGoogleCalendar}
        className="w-full mt-2 bg-secondary text-foreground py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold active:scale-95 transition"
      >
        <CalendarPlus className="size-5" /> Add to Google Calendar
      </button>
    </AppShell>
  );
}

function EditPanel({ booking, onSave }: {
  booking: { service: ServiceType; sareeCount: number; pricePerSaree: number; deliveryDate: string; deliveryTime: string; notes?: string };
  onSave: (patch: { service: ServiceType; sareeCount: number; pricePerSaree: number; deliveryDate: string; deliveryTime: string; notes?: string }) => void;
}) {
  const [service, setService] = useState<ServiceType>(booking.service);
  const [sareeCount, setSareeCount] = useState(booking.sareeCount);
  const [pricePerSaree, setPricePerSaree] = useState(booking.pricePerSaree);
  const [deliveryDate, setDeliveryDate] = useState(format(parseISO(booking.deliveryDate), "yyyy-MM-dd"));
  const [deliveryTime, setDeliveryTime] = useState(booking.deliveryTime);
  const [notes, setNotes] = useState(booking.notes ?? "");

  return (
    <div className="bg-card card-shadow rounded-2xl p-4 mt-4 space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Edit booking</h2>
      <div className="grid grid-cols-2 gap-2">
        {(["prepleat", "drape"] as ServiceType[]).map((s) => (
          <button
            key={s}
            onClick={() => setService(s)}
            className={cn("py-2 rounded-full text-xs font-semibold uppercase tracking-wider",
              service === s ? "bg-primary text-primary-foreground" : "bg-secondary")}
          >{s}</button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm">Sarees</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setSareeCount(Math.max(1, sareeCount - 1))} className="size-8 rounded-full bg-secondary font-bold">−</button>
          <span className="w-6 text-center tabular-nums font-bold">{sareeCount}</span>
          <button onClick={() => setSareeCount(sareeCount + 1)} className="size-8 rounded-full bg-secondary font-bold">+</button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm">Price/saree</span>
        <div className="flex items-center gap-1 bg-secondary rounded-full px-1">
          <button onClick={() => setPricePerSaree(Math.max(0, pricePerSaree - 50))} className="size-7 rounded-full font-bold">−</button>
          <input type="number" value={pricePerSaree} onChange={(e) => setPricePerSaree(Number(e.target.value) || 0)} className="w-16 bg-transparent text-center text-sm tabular-nums focus:outline-none" />
          <button onClick={() => setPricePerSaree(pricePerSaree + 50)} className="size-7 rounded-full font-bold">+</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="bg-secondary rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        <input type="time" step={900} value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} className="bg-secondary rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes" className="w-full bg-secondary rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
      <button
        onClick={() => onSave({
          service, sareeCount, pricePerSaree,
          deliveryDate: new Date(deliveryDate).toISOString(),
          deliveryTime,
          notes: notes.trim() || undefined,
        })}
        className="w-full saree-gradient text-primary-foreground py-3 rounded-2xl font-semibold"
      >Save changes</button>
    </div>
  );
}