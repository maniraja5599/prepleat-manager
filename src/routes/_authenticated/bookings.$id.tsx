import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, totalDue, fmtINR, fmtTime12, type ServiceType, type PaymentMode, type Payment } from "@/lib/store";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Trash2, MessageCircle, Plus, Check, Pencil, X, Receipt, FileDown, IndianRupee, Ban, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateBillPDF } from "@/lib/pdf-bill";

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
  const artist = booking?.artistId ? customers.find((c) => c.id === booking.artistId) : undefined;
  const payments = allPayments.filter((p) => p.bookingId === id);

  const addPayment = useStore((s) => s.addPayment);
  const deletePayment = useStore((s) => s.deletePayment);
  const deleteBooking = useStore((s) => s.deleteBooking);
  const cancelBooking = useStore((s) => s.cancelBooking);
  const restoreBooking = useStore((s) => s.restoreBooking);
  const updateBooking = useStore((s) => s.updateBooking);
  const settings = useStore((s) => s.settings);
  const businessName = settings.businessName;
  const [payAmt, setPayAmt] = useState("");
  const [payMode, setPayMode] = useState<PaymentMode>(settings.defaultPaymentMode ?? "gpay");
  const [payNote, setPayNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);

  if (!booking) {
    return (
      <AppShell title="Booking">
        <p className="text-muted-foreground text-sm">Not found. <Link to="/bookings" className="text-primary">Go back</Link></p>
      </AppShell>
    );
  }

  const due = totalDue(booking);

  const buildWhatsAppMessage = (kind: "reminder" | "bill" | "balance") => {
    const site = settings.websiteUrl || "https://eyasdrapist.shop/";
    const dateStr = format(parseISO(booking.deliveryDate), "EEE, MMM d");
    const timeStr = fmtTime12(booking.deliveryTime);
    const paid = booking.advancePaid;
    if (kind === "balance") {
      return [
        `💛 *${businessName}*`,
        ``,
        `Hi ${customer?.name} 🙏`,
        `A gentle reminder — your saree order has a remaining balance.`,
        ``,
        `🧾 *Total:* ${fmtINR(booking.totalAmount)}`,
        `✅ *Paid:* ${fmtINR(paid)}`,
        `💰 *Balance due:* ${fmtINR(due)}`,
        ``,
        `📅 Delivery: ${dateStr}, ${timeStr}`,
        ``,
        `You can pay via GPay / Cash on delivery. Thank you ✨`,
        `🌐 ${site}`,
      ].join("\n");
    }
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


  const sendWhatsApp = (kind: "reminder" | "bill" | "balance" = "reminder") => {
    if (!customer?.phone) return toast.error("No phone number");
    const phone = customer.phone.replace(/\D/g, "");
    const encoded = encodeURIComponent(buildWhatsAppMessage(kind));
    window.location.href = `https://wa.me/${phone}?text=${encoded}`;
  };


  const downloadBillPDF = () => {
    try {
      generateBillPDF({ booking, customer, artist, payments, settings });
      toast.success("Bill downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Could not generate PDF");
    }
  };

  const sendSMS = () => {
    if (!customer?.phone) return toast.error("No phone number");
    const phone = customer.phone.replace(/\D/g, "");
    const msg = buildWhatsAppMessage(due > 0 ? "balance" : "bill")
      .replace(/\*/g, "")
      .replace(/[💛🧵🌐🪡📅📌🧾✅💰✨🙏]/g, "")
      .replace(/\n{2,}/g, "\n")
      .trim();
    window.location.href = `sms:${phone}?&body=${encodeURIComponent(msg)}`;
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
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs uppercase tracking-wider opacity-80">{booking.service}</p>
          {booking.billNumber && (
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15">
              {booking.billNumber}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-display font-semibold mt-1 truncate">{customer?.name}</h1>
        <p className="text-sm opacity-90">{customer?.phone}</p>
        {customer?.address && <p className="text-xs opacity-80 mt-1 line-clamp-2">{customer.address}</p>}
        {artist && (
          <p className="text-[11px] mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15">
            <span className="opacity-80">Artist:</span> <span className="font-semibold">{artist.name}</span>
          </p>
        )}
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
              <li key={p.id}>
                <button
                  onClick={() => setActivePayment(p)}
                  className="w-full flex justify-between items-center text-muted-foreground border-t border-border pt-1.5 hover:text-foreground transition"
                >
                  <span className="truncate text-left">{format(parseISO(p.date), "MMM d")} · {(p.mode ?? "gpay").toUpperCase()}{p.note ? ` · ${p.note}` : ""}</span>
                  <span className="tabular-nums shrink-0">{fmtINR(p.amount)}</span>
                </button>
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

      <div className={cn("grid gap-2 mt-4", due > 0 ? "grid-cols-3" : "grid-cols-2")}>
        <button onClick={() => sendWhatsApp("reminder")} className="bg-[oklch(0.62_0.18_150)] text-white py-3 rounded-2xl flex items-center justify-center gap-1.5 font-semibold text-sm active:scale-95 transition">
          <MessageCircle className="size-4" /> Remind
        </button>
        {due > 0 && (
          <button onClick={() => sendWhatsApp("balance")} className="bg-destructive text-destructive-foreground py-3 rounded-2xl flex items-center justify-center gap-1.5 font-semibold text-sm active:scale-95 transition">
            <IndianRupee className="size-4" /> Balance
          </button>
        )}
        <button onClick={() => sendWhatsApp("bill")} className="bg-primary text-primary-foreground py-3 rounded-2xl flex items-center justify-center gap-1.5 font-semibold text-sm active:scale-95 transition">
          <Receipt className="size-4" /> Bill
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

      <div className="grid grid-cols-3 gap-2 mt-2">
        <button
          onClick={downloadBillPDF}
          className="bg-secondary text-foreground py-3 rounded-2xl flex items-center justify-center gap-1.5 font-semibold text-sm active:scale-95 transition"
        >
          <FileDown className="size-4" /> PDF
        </button>
        <button
          onClick={sendSMS}
          className="bg-secondary text-foreground py-3 rounded-2xl flex items-center justify-center gap-1.5 font-semibold text-sm active:scale-95 transition"
        >
          <MessageSquare className="size-4" /> SMS
        </button>
        {booking.status !== "cancelled" ? (
          <button
            onClick={() => {
              if (!confirm("Cancel this booking? It will stay in records as cancelled.")) return;
              cancelBooking(booking.id);
              toast.success("Booking cancelled");
            }}
            className="bg-warning/15 text-warning py-3 rounded-2xl flex items-center justify-center gap-1.5 font-semibold text-sm active:scale-95 transition"
          >
            <Ban className="size-4" /> Cancel
          </button>
        ) : (
          <button
            onClick={() => { updateBooking(booking.id, { status: "pending" }); toast.success("Booking re-opened"); }}
            className="bg-secondary text-foreground py-3 rounded-2xl flex items-center justify-center gap-1.5 font-semibold text-sm active:scale-95 transition"
          >
            <Check className="size-4" /> Reopen
          </button>
        )}
      </div>

      {activePayment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setActivePayment(null)}>
          <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold">Payment details</h3>
              <button onClick={() => setActivePayment(null)} className="size-8 rounded-full bg-secondary flex items-center justify-center"><X className="size-4" /></button>
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Amount" value={fmtINR(activePayment.amount)} bold />
              <Row label="Mode" value={(activePayment.mode ?? "gpay").toUpperCase()} />
              <Row label="Date" value={format(parseISO(activePayment.date), "EEE, MMM d, yyyy")} />
              <Row label="Time" value={format(parseISO(activePayment.date), "h:mm a")} />
              {activePayment.note && <Row label="Note" value={activePayment.note} />}
            </div>
            <button
              onClick={() => {
                if (!confirm("Delete this payment?")) return;
                deletePayment(activePayment.id);
                setActivePayment(null);
                toast.success("Payment removed");
              }}
              className="mt-4 w-full py-3 rounded-2xl bg-destructive/10 text-destructive text-sm font-semibold flex items-center justify-center gap-2"
            ><Trash2 className="size-4" /> Delete payment</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm tabular-nums", bold && "font-bold text-primary text-base")}>{value}</span>
    </div>
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