import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, totalDue, fmtINR } from "@/lib/store";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Trash2, MessageCircle, Plus, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bookings/$id")({
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
  const deleteBooking = useStore((s) => s.deleteBooking);
  const updateBooking = useStore((s) => s.updateBooking);
  const businessName = useStore((s) => s.settings.businessName);
  const [payAmt, setPayAmt] = useState("");

  if (!booking) {
    return (
      <AppShell title="Booking">
        <p className="text-muted-foreground text-sm">Not found. <Link to="/bookings" className="text-primary">Go back</Link></p>
      </AppShell>
    );
  }

  const due = totalDue(booking);

  const sendWhatsApp = () => {
    if (!customer?.phone) return toast.error("No phone number");
    const phone = customer.phone.replace(/\D/g, "");
    const msg = `Hi ${customer.name}, this is a friendly reminder from ${businessName}.\n\nYour ${booking.service} order (${booking.sareeCount} saree${booking.sareeCount > 1 ? "s" : ""}) is scheduled for delivery on ${format(parseISO(booking.deliveryDate), "MMM d")} at ${booking.deliveryTime}.\n\nPending amount: ${fmtINR(due)}\n\nThank you!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handlePay = () => {
    const n = Number(payAmt);
    if (!n || n <= 0) return toast.error("Enter a valid amount");
    addPayment({ bookingId: booking.id, customerId: booking.customerId, amount: n, date: new Date().toISOString() });
    setPayAmt("");
    toast.success(`Payment of ${fmtINR(n)} added`);
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between pt-4 pb-3">
        <button onClick={() => navigate({ to: "/bookings" })} className="size-10 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="size-5" />
        </button>
        <button
          onClick={() => {
            if (confirm("Delete this booking?")) {
              deleteBooking(booking.id);
              navigate({ to: "/bookings" });
            }
          }}
          className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center"
        >
          <Trash2 className="size-5" />
        </button>
      </div>

      <div className="saree-gradient rounded-3xl p-5 text-primary-foreground card-shadow">
        <p className="text-xs uppercase tracking-wider opacity-80">{booking.service}</p>
        <h1 className="text-2xl font-display font-semibold mt-1">{customer?.name}</h1>
        <p className="text-sm opacity-90">{customer?.phone}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="opacity-70 text-xs uppercase tracking-wider">Delivery</p>
            <p className="font-semibold">{format(parseISO(booking.deliveryDate), "EEE, MMM d")}</p>
            <p>{booking.deliveryTime}</p>
          </div>
          <div>
            <p className="opacity-70 text-xs uppercase tracking-wider">Sarees</p>
            <p className="font-semibold">{booking.sareeCount} × {fmtINR(booking.pricePerSaree)}</p>
            <p>= {fmtINR(booking.totalAmount)}</p>
          </div>
        </div>
      </div>

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
          <div className="mt-3 flex gap-2">
            <input
              value={payAmt}
              onChange={(e) => setPayAmt(e.target.value)}
              type="number"
              placeholder={`Add payment (max ${due})`}
              className="flex-1 bg-secondary border-0 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button onClick={handlePay} className="size-10 rounded-full saree-gradient text-primary-foreground flex items-center justify-center">
              <Plus className="size-5" />
            </button>
          </div>
        )}
        {payments.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between text-muted-foreground border-t border-border pt-1.5">
                <span>{format(parseISO(p.date), "MMM d")} · {p.note ?? "Payment"}</span>
                <span className="tabular-nums">{fmtINR(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {booking.measurements && booking.measurements.length > 0 && (
        <div className="bg-card card-shadow rounded-2xl p-4 mt-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Measurements (inch)</h2>
          <div className="flex gap-4">
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
        <button onClick={sendWhatsApp} className="bg-[oklch(0.62_0.18_150)] text-white py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold active:scale-95 transition">
          <MessageCircle className="size-5" /> WhatsApp
        </button>
        <button
          onClick={() => {
            updateBooking(booking.id, { status: booking.status === "delivered" ? "pending" : "delivered", completedAt: new Date().toISOString() });
            toast.success(booking.status === "delivered" ? "Marked pending" : "Marked delivered");
          }}
          className={cn("py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold active:scale-95 transition",
            booking.status === "delivered" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground")}
        >
          <Check className="size-5" /> {booking.status === "delivered" ? "Reopen" : "Delivered"}
        </button>
      </div>
    </AppShell>
  );
}
