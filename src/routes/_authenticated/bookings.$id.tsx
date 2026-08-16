import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  useStore,
  totalDue,
  netBookingTotal,
  netBookingAmount,
  formatShortBillNumber,
  fmtINR,
  fmtTime12,
  type ServiceType,
  type PaymentMode,
  type Payment,
  type Measurement,
  formatAppDate,
  formatAppTime,
  formatAppDateTime,
} from "@/lib/store";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Trash2,
  MessageCircle,
  Plus,
  Check,
  CheckCircle,
  Pencil,
  X,
  Receipt,
  FileDown,
  IndianRupee,
  Ban,
  MessageSquare,
  Phone,
  Calendar,
  Clock,
  RefreshCw,
  Map,
  MapPin,
  Send,
  AlertCircle,
  Wallet,
  Car,
  Tag,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn, cleanPhoneForDialing, cleanPhoneForWhatsApp } from "@/lib/utils";
import { generateBillPDF } from "@/lib/pdf-bill";
import { ScrollNumber } from "@/components/ScrollNumber";

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
  const restorePayment = useStore((s) => s.restorePayment);
  const updatePayment = useStore((s) => s.updatePayment);
  const deleteBooking = useStore((s) => s.deleteBooking);
  const cancelBooking = useStore((s) => s.cancelBooking);
  const restoreBooking = useStore((s) => s.restoreBooking);
  const updateBooking = useStore((s) => s.updateBooking);
  const settings = useStore((s) => s.settings);
  const businessName = settings.businessName;
  const [payAmt, setPayAmt] = useState("");
  const [discountAmt, setDiscountAmt] = useState("");
  const [extraChargeAmt, setExtraChargeAmt] = useState("");
  const [extraChargeNote, setExtraChargeNote] = useState("Travel");
  const [showAddExtraCharge, setShowAddExtraCharge] = useState(false);
  const [payMode, setPayMode] = useState<PaymentMode>(settings.defaultPaymentMode ?? "gpay");
  const [payNote, setPayNote] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [editing, setEditing] = useState(false);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [previewMode, setPreviewMode] = useState<null | {
    channel: "whatsapp" | "sms";
    kind: "reminder" | "bill" | "balance" | "status";
  }>(null);
  const [includeLink, setIncludeLink] = useState(false);

  const [completionOpen, setCompletionOpen] = useState(false);
  const [completionDiscount, setCompletionDiscount] = useState("");
  const [completionExtraCharge, setCompletionExtraCharge] = useState("");
  const [completionExtraNote, setCompletionExtraNote] = useState("Travel");
  const [completionPayMode, setCompletionPayMode] = useState<PaymentMode>(settings.defaultPaymentMode ?? "gpay");

  if (!booking) {
    return (
      <AppShell title="Booking">
        <p className="text-muted-foreground text-sm">
          Not found.{" "}
          <Link to="/bookings" className="text-primary">
            Go back
          </Link>
        </p>
      </AppShell>
    );
  }

  const due = totalDue(booking);
  const enteredPay = Number(payAmt) || 0;
  const enteredDisc = Number(discountAmt) || 0;
  const enteredExtra = Number(extraChargeAmt) || 0;
  const dynamicDue = due + enteredExtra;
  const remainingDue = Math.max(0, dynamicDue - enteredPay - enteredDisc);
  const isDiscountTooHigh = enteredDisc > dynamicDue;
  const isOverpaid = (enteredPay + enteredDisc) > dynamicDue;

  const buildWhatsAppMessage = (
    kind: "reminder" | "bill" | "balance" | "status",
    withLink = false,
  ) => {
    const site = settings.websiteUrl || "https://eyasdrapist.shop/";
    const dateStr = formatAppDate(booking.deliveryDate);
    const timeStr = fmtTime12(booking.deliveryTime);
    const paid = booking.advancePaid;
    const name = customer?.name || "Customer";
    const netTotal = netBookingTotal(booking);
    let parts: string[] = [];

    const extraLine = booking.extraCharges && booking.extraCharges > 0
      ? `🚗 Extra / Travel: ${fmtINR(booking.extraCharges)} (${booking.extraChargesNote || "Travel"})`
      : "";
    const discLine = booking.discount && booking.discount > 0
      ? `🏷️ Discount: -${fmtINR(booking.discount)}`
      : "";

    if (kind === "status") {
      if (booking.status === "completed") {
        parts = [
          `Hi ${name},`,
          `Your order is *completed* ✅ Thank you for trusting us 💛`,
          `🧾 Bill: ${formatShortBillNumber(booking.billNumber, booking.id)} | ${booking.sareeCount} saree${booking.sareeCount > 1 ? "s" : ""} × ${fmtINR(booking.pricePerSaree)}`,
          extraLine,
          discLine,
          `Total: ${fmtINR(netTotal)} | Paid: ${fmtINR(paid)}`,
          due > 0 ? `💰 Balance: *${fmtINR(due)}*` : `✅ Fully Paid`,
        ].filter(Boolean);
      } else {
        parts = [
          `Hi ${name} 🙏`,
          `Your order is booked for *${booking.service === "prepleat" ? "PrePleat" : "Draping"}*.`,
          `📅 Delivery: ${dateStr}, ${timeStr}`,
          extraLine,
          discLine,
          `Total: ${fmtINR(netTotal)} | Paid: ${fmtINR(paid)}`,
          due > 0 ? `💰 Balance: *${fmtINR(due)}*` : `✅ Fully paid`,
        ].filter(Boolean);
      }
    }
    
    if (kind === "balance") {
      parts = [
        `Hi ${name} 🙏`,
        `Gentle reminder — balance pending for your saree order.`,
        `Service: *${booking.service === "prepleat" ? "PrePleat" : "Draping"}* (${booking.sareeCount} saree${booking.sareeCount > 1 ? "s" : ""})`,
        extraLine,
        discLine,
        `Total: ${fmtINR(netTotal)} | Paid: ${fmtINR(paid)}`,
        `💰 *Due: ${fmtINR(due)}*`,
        `📅 Delivery: ${dateStr}, ${timeStr}`,
        `Pay via GPay / Cash. Thank you! 🙏`,
      ].filter(Boolean);
    }
    
    if (kind === "bill") {
      parts = [
        `Hi ${name},`,
        `Here are your order details 📋`,
        `Service: *${booking.service === "prepleat" ? "PrePleat" : "Draping"}* | ${booking.sareeCount} saree${booking.sareeCount > 1 ? "s" : ""} × ${fmtINR(booking.pricePerSaree)}`,
        extraLine,
        discLine,
        `📅 Delivery: ${dateStr}, ${timeStr}`,
        `Total: ${fmtINR(netTotal)} | Paid: ${fmtINR(paid)}`,
        due > 0 ? `💰 *Balance: ${fmtINR(due)}*` : `✅ Fully Paid`,
      ].filter(Boolean);
    }

    if (withLink) {
      parts.push("");
      parts.push(`🔗 ${site}`);
    }

    return parts.join("\n");
  };

  const sendWhatsApp = (
    kind: "reminder" | "bill" | "balance" | "status" = "reminder",
    withLink = false,
  ) => {
    if (!customer?.phone) return toast.error("No phone number");
    const phone = cleanPhoneForWhatsApp(customer.phone);
    const encoded = encodeURIComponent(buildWhatsAppMessage(kind, withLink));
    window.location.href = `https://wa.me/${phone}?text=${encoded}`;
  };

  const downloadBillPDF = async () => {
    try {
      await generateBillPDF({ booking, customer, artist, payments, settings });
      toast.success("Bill downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Could not generate PDF");
    }
  };

  const sendSMS = (
    kind: "reminder" | "bill" | "balance" | "status" = "status",
    withLink = false,
  ) => {
    if (!customer?.phone) return toast.error("No phone number");
    const phone = cleanPhoneForDialing(customer.phone);
    const msg = buildWhatsAppMessage(kind, withLink)
      .replace(/\*/g, "")
      .replace(/[💛🧵🌐🪡📅📌🧾✅💰✨🙏😊😁🚗🏷️]/g, "")
      .replace(/\n{2,}/g, "\n")
      .trim();
    window.location.href = `sms:${phone}?&body=${encodeURIComponent(msg)}`;
  };

  const handlePay = () => {
    const n = Number(payAmt);
    const d = Number(discountAmt);
    const e = Number(extraChargeAmt);

    if ((!n || n <= 0) && (!d || d <= 0) && (!e || e <= 0)) {
      return toast.error("Enter a valid payment amount, discount, or extra charge");
    }

    if (n > 0 && n > (due + e) - d) {
      const ok = window.confirm(
        `Amount ${fmtINR(n)} exceeds pending ${fmtINR((due + e) - d)}. Continue anyway?`,
      );
      if (!ok) return;
    }

    const bookingPatch: Partial<typeof booking> = {};
    if (e > 0) {
      bookingPatch.extraCharges = (booking.extraCharges || 0) + e;
      bookingPatch.extraChargesNote = booking.extraCharges
        ? `${booking.extraChargesNote || "Extra"} + ${extraChargeNote || "Travel"}`
        : (extraChargeNote || "Travel");
    }
    if (d > 0) {
      bookingPatch.discount = (booking.discount || 0) + d;
    }
    if (Object.keys(bookingPatch).length > 0) {
      updateBooking(booking.id, bookingPatch);
    }

    if (n > 0) {
      // Preserve the picked date but use current time-of-day so chronological order stays sane.
      const today = new Date().toISOString().slice(0, 10);
      const dateIso =
        payDate === today ? new Date().toISOString() : new Date(payDate + "T12:00:00").toISOString();
      addPayment({
        bookingId: booking.id,
        customerId: booking.customerId,
        amount: n,
        date: dateIso,
        mode: payMode,
        note: payNote.trim() || undefined,
      });
    }

    setPayAmt("");
    setDiscountAmt("");
    setExtraChargeAmt("");
    setShowAddExtraCharge(false);
    setPayNote("");
    setPayDate(new Date().toISOString().slice(0, 10));
    setShowAddPayment(false);

    const msgs: string[] = [];
    if (e > 0) msgs.push(`Extra charge of ${fmtINR(e)} added`);
    if (d > 0) msgs.push(`Discount of ${fmtINR(d)} applied`);
    if (n > 0) msgs.push(`Payment of ${fmtINR(n)} added`);
    toast.success(msgs.join(" · "));
  };

  const getStatusInfo = () => {
    if (booking.status === "cancelled") {
      return { label: "Cancelled", style: "bg-red-500/10 border-red-500/20 text-red-500" };
    }
    if (booking.deliveredAt) {
      return {
        label: "Delivered",
        style:
          "bg-[oklch(0.55_0.13_150)]/10 border-[oklch(0.55_0.13_150)]/20 text-[oklch(0.55_0.13_150)]",
      };
    }
    if (booking.workDoneAt) {
      return { label: "Ready", style: "bg-blue-500/10 border-blue-500/20 text-blue-500" };
    }
    if (booking.receivedAt) {
      return { label: "Received", style: "bg-amber-500/10 border-amber-500/20 text-amber-500" };
    }
    return { label: "Pending", style: "bg-orange-500/10 border-orange-500/20 text-orange-500" };
  };
  const statusInfo = getStatusInfo();
  const dialPhone = cleanPhoneForDialing(customer?.phone);
  const whatsappPhone = cleanPhoneForWhatsApp(customer?.phone);
  const netTotalVal = netBookingTotal(booking);
  const paidPercent =
    netTotalVal > 0
      ? Math.min(100, Math.round(((booking.advancePaid || 0) / netTotalVal) * 100))
      : 0;

  return (
    <AppShell>
      {/* Message Preview Modal */}
      {previewMode && (
        <div className="fixed inset-0 z-[20000] flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm px-3 pb-4 sm:pb-0 text-left">
          <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
            {/* Modal Header */}
            <div
              className={cn(
                "px-5 py-4 flex items-center justify-between",
                previewMode.channel === "whatsapp"
                  ? "bg-[oklch(0.55_0.18_150)] text-white"
                  : "bg-primary text-primary-foreground",
              )}
            >
              <div className="flex items-center gap-2.5">
                {previewMode.channel === "whatsapp" ? (
                  <MessageCircle className="size-5" />
                ) : (
                  <MessageSquare className="size-5" />
                )}
                <div>
                  <p className="font-bold text-sm">
                    {previewMode.channel === "whatsapp" ? "WhatsApp Preview" : "SMS Preview"}
                  </p>
                  <p className="text-[11px] opacity-80">
                    To: {customer?.name || "Customer"} · {customer?.phone}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewMode(null)}
                className="size-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Message Preview */}
            <div className="px-5 py-4 max-h-[55vh] overflow-y-auto">
              <div
                className={cn(
                  "rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono",
                  previewMode.channel === "whatsapp"
                    ? "bg-[#dcf8c6] text-[#111] text-xs"
                    : "bg-secondary text-foreground text-xs",
                )}
              >
                {previewMode.channel === "whatsapp"
                  ? buildWhatsAppMessage(previewMode.kind, includeLink)
                  : buildWhatsAppMessage(previewMode.kind, includeLink)
                      .replace(/\*/g, "")
                      .replace(/[💛🧵🌐🪡📅📌🧾✅💰✨🙏]/g, "")
                      .replace(/\n{2,}/g, "\n")
                      .trim()}
              </div>
              {/* Include link toggle */}
              <div className="mt-3 flex items-center justify-between bg-secondary rounded-2xl px-4 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-foreground">Include website link</p>
                  <p className="text-[10px] text-muted-foreground">
                    {previewMode.channel === "whatsapp"
                      ? "Link shows a big preview card in WhatsApp"
                      : "Adds website URL to SMS"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeLink}
                  onClick={() => setIncludeLink(!includeLink)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition cursor-pointer shrink-0",
                    includeLink ? "saree-gradient" : "bg-muted-foreground/20",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block size-4.5 rounded-full bg-white shadow transition-transform",
                      includeLink ? "translate-x-5.5" : "translate-x-1",
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setPreviewMode(null)}
                className="py-3 rounded-2xl bg-secondary text-foreground text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition"
              >
                <X className="size-4" /> Cancel
              </button>
              <button
                onClick={() => {
                  if (previewMode.channel === "whatsapp") {
                    sendWhatsApp(previewMode.kind, includeLink);
                  } else {
                    sendSMS(previewMode.kind, includeLink);
                  }
                  setPreviewMode(null);
                }}
                className={cn(
                  "py-3 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition shadow-sm",
                  previewMode.channel === "whatsapp" ? "bg-[oklch(0.55_0.18_150)]" : "saree-gradient",
                )}
              >
                <Send className="size-4" /> Send
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between pt-4 pb-3">
        <button
          onClick={() => navigate({ to: "/bookings" })}
          className="size-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition cursor-pointer"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing((v) => !v)}
            className={cn(
              "size-10 rounded-full flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition cursor-pointer",
              editing ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary",
            )}
            aria-label="Edit"
          >
            {editing ? <X className="size-5" /> : <Pencil className="size-5" />}
          </button>
          <button
            onClick={() => {
              const bid = booking.id;
              deleteBooking(bid);
              toast.success("Booking deleted", {
                action: {
                  label: "Undo",
                  onClick: () => {
                    restoreBooking(bid);
                    toast.success("Restored");
                  },
                },
                duration: 6000,
              });
              navigate({ to: "/bookings" });
            }}
            className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 active:scale-95 transition cursor-pointer"
          >
            <Trash2 className="size-5" />
          </button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="saree-gradient rounded-3xl p-5 text-primary-foreground card-shadow relative overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/20 border border-white/10">
            {booking.service === "prepleat" ? "PRE" : booking.service}
          </span>
          <div className="flex items-center gap-1.5">
            {(booking.billNumber || booking.id) && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15">
                {formatShortBillNumber(booking.billNumber, booking.id)}
              </span>
            )}
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/20 bg-white/10 text-white",
              )}
            >
              {statusInfo.label}
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-display font-bold mt-3 truncate">{customer?.name}</h1>

        <div className="mt-1 flex items-center gap-2">
          {customer?.phone && (
            <a
              href={`tel:${dialPhone}`}
              className="text-xs opacity-90 hover:underline cursor-pointer"
            >
              {customer.phone}
            </a>
          )}
          {customer?.phone && (
            <div className="flex gap-1.5 ml-1">
              <a
                href={`tel:${dialPhone}`}
                className="size-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition active:scale-90"
                title="Call Customer"
              >
                <Phone className="size-3 text-white" />
              </a>
              <a
                href={`https://wa.me/${whatsappPhone}`}
                target="_blank"
                rel="noreferrer"
                className="size-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition active:scale-90"
                title="WhatsApp Chat"
              >
                <MessageCircle className="size-3 text-white" />
              </a>
            </div>
          )}
        </div>

        {customer?.address && (
          <p className="text-xs opacity-80 mt-1.5 line-clamp-2 italic flex items-start gap-1">
            <MapPin className="size-3 mt-0.5 shrink-0" />
            {customer.address}
          </p>
        )}
        {customer?.locationUrl && (
          <div className="mt-2">
            <a
              href={customer.locationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-xs font-semibold transition-colors"
            >
              <Map className="size-3.5" /> Get Directions
            </a>
          </div>
        )}

        {artist && (
          <p className="text-[10px] mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 font-medium">
            <span className="opacity-80">Artist Reference:</span>{" "}
            <span className="font-semibold">{artist.name}</span>
          </p>
        )}

        <div className="mt-4.5 grid grid-cols-2 gap-4 text-xs pt-3.5 border-t border-white/10">
          <div>
            <p className="opacity-70 text-[9px] uppercase font-bold tracking-wider">
              Delivery Schedule
            </p>
            <p className="font-semibold text-sm mt-0.5 flex items-center gap-1">
              <Calendar className="size-3.5 shrink-0" />
              {formatAppDate(booking.deliveryDate)}
            </p>
            <p className="opacity-95 text-[11px] mt-0.5 ml-4.5 flex items-center gap-1">
              <Clock className="size-3 shrink-0" />
              {fmtTime12(booking.deliveryTime)}
            </p>
          </div>
          <div>
            <p className="opacity-70 text-[9px] uppercase font-bold tracking-wider">
              Saree Counter
            </p>
            <p className="font-semibold text-sm mt-0.5">
              {booking.sareeCount} {booking.sareeCount === 1 ? "Saree" : "Sarees"}
            </p>
            <p className="opacity-95 text-[11px] mt-0.5">
              {fmtINR(booking.pricePerSaree)} each ={" "}
              <span className="font-bold">{fmtINR(booking.totalAmount)}</span>
            </p>
          </div>
        </div>
      </div>

      {editing && (
        <EditPanel
          booking={booking}
          onCancel={() => setEditing(false)}
          onSave={(patch) => {
            const total = patch.sareeCount * patch.pricePerSaree;
            updateBooking(booking.id, { ...patch, totalAmount: total });
            toast.success("Booking updated");
            setEditing(false);
          }}
        />
      )}

      {booking.status !== "cancelled" && (
        <div className="bg-card card-shadow rounded-2xl p-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Booking Status
            </h2>
            <span className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
              booking.status === "completed" || booking.status === "delivered"
                ? "bg-success/10 text-success"
                : "bg-primary/10 text-primary"
            )}>
              {booking.status === "completed" ? "Completed" : booking.status === "delivered" ? "Delivered" : "Booked"}
            </span>
          </div>
          
          <div className="mt-4 flex gap-3">
            {booking.status !== "completed" && booking.status !== "delivered" ? (
              <button
                onClick={() => {
                  if (due > 0) {
                    setCompletionOpen(true);
                  } else {
                    const patch: Partial<typeof booking> = { status: "completed", completedAt: new Date().toISOString() };
                    updateBooking(booking.id, patch);
                    toast.success("Booking Completed!");
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-success text-success-foreground font-bold text-sm hover:opacity-90 active:scale-95 transition shadow-sm flex items-center justify-center gap-2 border border-success/20"
              >
                <CheckCircle className="size-5" /> Mark as Completed
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!confirm("Are you sure you want to revert this booking to Booked (Active)?")) return;
                  updateBooking(booking.id, { status: "pending", completedAt: undefined, deliveredAt: undefined });
                  toast.success("Reverted to Booked");
                }}
                className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-bold text-sm border border-border/40 hover:bg-secondary/80 active:scale-95 transition"
              >
                Revert to Booked
              </button>
            )}
          </div>
        </div>
      )}

      {/* Details (Measurements & Notes) */}
      {((booking.measurements && booking.measurements.length > 0) || booking.notes) && (
        <div className="grid grid-cols-1 gap-3 mt-3">
          {booking.measurements && booking.measurements.length > 0 && (
            <div className="bg-card card-shadow rounded-2xl p-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                Measurements (inch)
              </h2>
              <div className="flex gap-4 flex-wrap">
                {booking.measurements.map((m) => (
                  <div key={m.label} className="min-w-[45px]">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      {m.label}
                    </p>
                    <p className="text-base font-bold tabular-nums text-foreground mt-0.5">
                      {m.value}″
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {booking.notes && (
            <div className="bg-card card-shadow rounded-2xl p-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Notes & Custom Request
              </h2>
              <p className="text-xs text-foreground/95 leading-relaxed whitespace-pre-wrap">
                {booking.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Financial Summary & Payments */}
      <div className="bg-card card-shadow rounded-2xl p-4 mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Financial Summary
          </h2>
          {due === 0 ? (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20">
              Fully paid
            </span>
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              {fmtINR(due)} Pending
            </span>
          )}
        </div>

        {/* Paid Progress Bar */}
        <div className="mt-3.5">
          <div className="flex justify-between items-center text-[10px] text-muted-foreground mb-1">
            <span>Paid Progress</span>
            <span className="font-semibold">{paidPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full saree-gradient transition-all duration-500 rounded-full"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
        </div>

        {/* Detailed Breakdown Pill Row if Extra or Discount exists */}
        {(Boolean(booking.extraCharges && booking.extraCharges > 0) || Boolean(booking.discount && booking.discount > 0)) && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 pt-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-full bg-secondary/80 text-foreground/80 font-medium">
              Sarees: <strong className="font-bold">{fmtINR(booking.totalAmount)}</strong>
            </span>
            {booking.extraCharges && booking.extraCharges > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium flex items-center gap-1">
                <Car className="size-3" />
                {booking.extraChargesNote || "Extra"}: <strong className="font-bold">+{fmtINR(booking.extraCharges)}</strong>
              </span>
            )}
            {booking.discount && booking.discount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 font-medium flex items-center gap-1">
                <Tag className="size-3" />
                Discount: <strong className="font-bold">-{fmtINR(booking.discount)}</strong>
              </span>
            )}
          </div>
        )}

        {/* Amount Row Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3.5 border-t border-border/40 text-center">
          <div>
            <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
              Net Bill
            </p>
            <p className="text-sm font-bold mt-0.5">{fmtINR(netBookingTotal(booking))}</p>
          </div>
          <div className="border-l border-border/30">
            <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
              Total Paid
            </p>
            <p className="text-sm font-bold text-[oklch(0.55_0.13_150)] mt-0.5">
              {fmtINR(booking.advancePaid)}
            </p>
          </div>
          <div className="border-l border-border/30">
            <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
              Balance Due
            </p>
            <p
              className={cn(
                "text-sm font-bold mt-0.5",
                due > 0 ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {due > 0 ? fmtINR(due) : "₹0"}
            </p>
          </div>
        </div>

        {/* Add Payment Form (Hidden if Fully Paid) */}
        {due > 0 && !showAddPayment && (
          <button
            onClick={() => setShowAddPayment(true)}
            className="w-full mt-4 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer border border-border/40"
          >
            <Plus className="size-4 text-primary" /> Collect Payment
          </button>
        )}

        {due > 0 && showAddPayment && (
          <div className="mt-4 pt-4 border-t border-border/40 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wallet className="size-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Collect Payment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddPayment(false);
                  setExtraChargeAmt("");
                  setShowAddExtraCharge(false);
                }}
                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition px-2.5 py-1 bg-secondary rounded-full cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Inputs Block */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  ₹
                </span>
                <input
                  value={payAmt}
                  onChange={(e) => setPayAmt(e.target.value)}
                  type="number"
                  placeholder="Amount"
                  className="w-full bg-secondary border border-border/30 rounded-xl pl-6 pr-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition tabular-nums"
                />
              </div>
              <div className="relative">
                <input
                  value={discountAmt}
                  onChange={(e) => setDiscountAmt(e.target.value)}
                  type="number"
                  placeholder="Discount"
                  className="w-full bg-secondary border border-border/30 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent text-rose-500 transition tabular-nums"
                />
              </div>
            </div>

            {/* Extra / Travel Charge section in Collect Payment */}
            {!showAddExtraCharge && enteredExtra === 0 ? (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAddExtraCharge(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline cursor-pointer active:scale-95"
                >
                  <Car className="size-3.5" /> + Add Travel / Extra Charge
                </button>
              </div>
            ) : (
              <div className="p-3 bg-secondary/40 rounded-2xl border border-border/20 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Car className="size-3.5 text-primary" /> Extra / Travel Charge
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddExtraCharge(false);
                      setExtraChargeAmt("");
                    }}
                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-full bg-secondary cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["Travel", "Delivery", "Urgent", "Other"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setExtraChargeNote(tag)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer border",
                        extraChargeNote === tag
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80",
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">₹</span>
                    <input
                      type="number"
                      value={extraChargeAmt}
                      onChange={(e) => setExtraChargeAmt(e.target.value)}
                      placeholder="Extra amount"
                      className="w-full bg-secondary border border-border/30 rounded-xl pl-6 pr-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 tabular-nums"
                    />
                  </div>
                  <div className="flex gap-1">
                    {[100, 150, 200].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setExtraChargeAmt(String(amt))}
                        className="px-2 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-[10px] font-bold cursor-pointer active:scale-95 transition"
                      >
                        +₹{amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quick shortcuts */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPayAmt(String(Math.max(0, Math.round((dynamicDue - enteredDisc) / 2))))}
                className="py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-[10px] font-bold uppercase active:scale-95 transition cursor-pointer text-center"
              >
                50% (₹{Math.max(0, Math.round((dynamicDue - enteredDisc) / 2))})
              </button>
              <button
                onClick={() => setPayAmt(String(Math.max(0, dynamicDue - enteredDisc)))}
                className="py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-[10px] font-bold uppercase active:scale-95 transition cursor-pointer text-center"
              >
                Full (₹{Math.max(0, dynamicDue - enteredDisc)})
              </button>
              <button
                onClick={() => {
                  setPayAmt("");
                  setDiscountAmt("");
                  setExtraChargeAmt("");
                }}
                className="py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-[10px] font-bold uppercase active:scale-95 transition cursor-pointer text-center"
              >
                Clear
              </button>
            </div>

            {/* Segmented Mode Selector */}
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Payment Mode
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["gpay", "cash", "other"] as PaymentMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPayMode(m)}
                    className={cn(
                      "py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer active:scale-95 text-center border border-transparent",
                      payMode === m
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "bg-secondary hover:bg-secondary/80 text-foreground/80",
                    )}
                  >
                    {m === "gpay" ? "📱 GPay" : m === "cash" ? "💵 Cash" : "💳 Other"}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Remaining Balance Summary */}
            {(payAmt || discountAmt || extraChargeAmt) && (
              <div className="px-3.5 py-3 bg-secondary/30 rounded-2xl border border-border/10 flex flex-col gap-1.5 animate-in fade-in duration-200">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Original Due:</span>
                  <span className="font-semibold tabular-nums">{fmtINR(due)}</span>
                </div>
                {enteredExtra > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-primary font-semibold flex items-center gap-1">
                      <Car className="size-3" /> Extra ({extraChargeNote}):
                    </span>
                    <span className="font-semibold text-primary tabular-nums">+ {fmtINR(enteredExtra)}</span>
                  </div>
                )}
                {enteredPay > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Entering Payment:</span>
                    <span className="font-semibold text-primary tabular-nums">- {fmtINR(enteredPay)}</span>
                  </div>
                )}
                {enteredDisc > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-rose-500 font-semibold flex items-center gap-1">
                      <Tag className="size-3" /> Entering Discount:
                    </span>
                    <span className="font-semibold text-rose-500 tabular-nums">- {fmtINR(enteredDisc)}</span>
                  </div>
                )}
                <div className="h-px bg-border/20 my-0.5" />
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-foreground">Remaining Balance:</span>
                  <span className={cn(
                    "tabular-nums",
                    remainingDue === 0 ? "text-success" : "text-foreground"
                  )}>
                    {fmtINR(remainingDue)}
                  </span>
                </div>
              </div>
            )}

            {/* Warnings */}
            {isDiscountTooHigh && (
              <div className="px-3 py-2 bg-rose-500/10 text-rose-500 text-[10px] font-semibold rounded-xl border border-rose-500/20 flex items-center gap-1.5 animate-in shake duration-200">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>Discount cannot exceed pending balance ({fmtINR(dynamicDue)})</span>
              </div>
            )}
            {!isDiscountTooHigh && isOverpaid && (
              <div className="px-3 py-2 bg-rose-500/10 text-rose-500 text-[10px] font-semibold rounded-xl border border-rose-500/20 flex items-center gap-1.5 animate-in shake duration-200">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>Total cannot exceed pending balance ({fmtINR(dynamicDue)})</span>
              </div>
            )}

            {/* Advanced Options Toggle */}
            <div className="border-t border-border/20 pt-2.5">
              <details className="group">
                <summary className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer transition list-none flex items-center gap-1">
                  <span className="transition-transform group-open:rotate-90">▶</span> Advanced Options
                </summary>
                <div className="mt-3.5 space-y-3 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Payment Date
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={payDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setPayDate(e.target.value)}
                        className="flex-1 min-w-0 bg-secondary border border-border/30 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition"
                      />
                      <button
                        type="button"
                        onClick={() => setPayDate(new Date().toISOString().slice(0, 10))}
                        className="px-3 py-2 rounded-xl bg-secondary text-[10px] font-bold uppercase hover:bg-secondary/80 active:scale-95 transition cursor-pointer"
                      >
                        Today
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Notes
                    </label>
                    <input
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                      placeholder="Note / reference (optional)"
                      className="w-full bg-secondary border border-border/30 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition"
                    />
                  </div>
                </div>
              </details>
            </div>

            {/* Full Action Button */}
            <button
              disabled={isOverpaid || isDiscountTooHigh || (enteredPay === 0 && enteredDisc === 0 && enteredExtra === 0)}
              onClick={handlePay}
              className={cn(
                "w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer",
                isOverpaid || isDiscountTooHigh || (enteredPay === 0 && enteredDisc === 0 && enteredExtra === 0)
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                  : "saree-gradient text-white active:scale-95 shadow-primary/10 hover:brightness-105"
              )}
            >
              <Check className="size-4" />
              {enteredPay > 0 && enteredExtra > 0
                ? `Record ${fmtINR(enteredPay)} Payment + ${fmtINR(enteredExtra)} ${extraChargeNote}`
                : enteredPay > 0 && enteredDisc > 0
                ? `Record ${fmtINR(enteredPay)} & Apply ${fmtINR(enteredDisc)} Discount`
                : enteredPay > 0
                ? `Record ${fmtINR(enteredPay)} Payment`
                : enteredExtra > 0
                ? `Add ${fmtINR(enteredExtra)} ${extraChargeNote}`
                : enteredDisc > 0
                ? `Apply ${fmtINR(enteredDisc)} Discount`
                : "Submit"}
            </button>
          </div>
        )}

        {/* Transaction History Logs */}
        {payments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/40">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2">
              Transaction Logs
            </p>
            <ul className="space-y-1.5">
              {payments.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setActivePayment(p)}
                    className="w-full flex justify-between items-center text-[11px] text-muted-foreground border border-border/20 rounded-xl px-3 py-2 bg-secondary/30 hover:bg-secondary/60 hover:text-foreground transition text-left cursor-pointer"
                  >
                    <span className="truncate pr-2">
                      <span className="font-semibold">{formatAppDate(p.date)}</span>
                      {" · "}
                      <span className="uppercase font-bold text-[9px] border border-border rounded px-1 py-0.5 bg-background">
                        {p.mode ?? "gpay"}
                      </span>
                      {p.note ? ` · ${p.note}` : ""}
                    </span>
                    <span className="tabular-nums font-bold text-foreground shrink-0">
                      {fmtINR(p.amount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Share & Action Center */}
      <div className="bg-card card-shadow rounded-2xl p-4 mt-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Share & Action Center
        </h2>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setPreviewMode({ channel: "whatsapp", kind: "bill" })}
            className="py-3 rounded-xl bg-secondary hover:bg-secondary/80 border border-border/40 text-foreground text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
          >
            <Receipt className="size-4 text-primary" /> WhatsApp Bill
          </button>

          <button
            onClick={downloadBillPDF}
            className="py-3 rounded-xl bg-secondary hover:bg-secondary/80 border border-border/40 text-foreground text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
          >
            <FileDown className="size-4 text-primary" /> Download PDF
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2.5">
          <button
            onClick={() => setPreviewMode({ channel: "sms", kind: "status" })}
            className="py-2.5 rounded-xl bg-secondary/50 hover:bg-secondary/70 text-muted-foreground text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
          >
            <MessageSquare className="size-3.5" /> SMS Update
          </button>

          {due > 0 && booking.status !== "cancelled" && (
            <button
              onClick={() => setPreviewMode({ channel: "whatsapp", kind: "balance" })}
              className="py-2.5 rounded-xl bg-secondary/50 hover:bg-secondary/70 text-muted-foreground text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
            >
              <IndianRupee className="size-3.5" /> Remind Due
            </button>
          )}

          {booking.status !== "cancelled" ? (
            <button
              onClick={() => {
                if (!confirm("Cancel this booking? It will stay in records as cancelled.")) return;
                cancelBooking(booking.id);
                toast.success("Booking cancelled");
              }}
              className="py-2.5 rounded-xl bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
            >
              <Ban className="size-3.5" /> Cancel Order
            </button>
          ) : (
            <button
              onClick={() => {
                updateBooking(booking.id, { status: "pending" });
                toast.success("Booking re-opened");
              }}
              className="py-2.5 rounded-xl bg-[oklch(0.55_0.13_150)]/10 text-[oklch(0.55_0.13_150)] text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
            >
              <Check className="size-3.5" /> Reopen Order
            </button>
          )}
        </div>
      </div>

      {activePayment && (
        <EditPaymentModal
          payment={activePayment}
          onClose={() => setActivePayment(null)}
          onSave={(patch) => {
            updatePayment(activePayment.id, patch);
            setActivePayment(null);
            toast.success("Payment updated");
          }}
          onDelete={() => {
            if (confirm("Delete this payment? The order dues will recalculate automatically.")) {
              const pid = activePayment.id;
              deletePayment(pid);
              setActivePayment(null);
              toast.success("Payment removed", {
                action: {
                  label: "Undo",
                  onClick: () => {
                    restorePayment(pid);
                    toast.success("Payment restored");
                  },
                },
                duration: 6000,
              });
            }
          }}
        />
      )}

      {completionOpen && (
        <div className="fixed inset-0 z-[20000] flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm px-3 pb-4 sm:pb-0 text-left animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl p-5 overflow-hidden animate-in slide-in-from-bottom-4 duration-200 border border-border/40">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
              <span>✅</span> Complete Booking
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Apply any final extra charge/discount and record balance payment to mark this booking as completed.
            </p>
            
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs font-semibold bg-secondary/50 rounded-xl p-3">
                <span className="text-muted-foreground">Pending Balance:</span>
                <span className="text-sm font-bold text-destructive">{fmtINR(due)}</span>
              </div>

              {/* Extra Charge input in completion */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Car className="size-3 text-primary" /> Extra / Travel Charge (optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Extra / Travel amount"
                    value={completionExtraCharge}
                    onChange={(e) => setCompletionExtraCharge(e.target.value)}
                    className="flex-1 bg-secondary border-0 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 font-semibold tabular-nums"
                  />
                  <div className="flex gap-1">
                    {["Travel", "Delivery"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setCompletionExtraNote(tag)}
                        className={cn(
                          "px-2 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer border",
                          completionExtraNote === tag ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-transparent"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Tag className="size-3 text-rose-500" /> Final Discount (optional)
                </label>
                <input
                  type="number"
                  placeholder="Discount amount"
                  value={completionDiscount}
                  onChange={(e) => setCompletionDiscount(e.target.value)}
                  className="w-full bg-secondary border-0 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 font-semibold text-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Payment Mode for Balance
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["gpay", "cash", "other"] as PaymentMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCompletionPayMode(m)}
                      className={cn(
                        "py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer active:scale-95",
                        completionPayMode === m
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-secondary/80",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {((due + (Number(completionExtraCharge) || 0)) - Number(completionDiscount || 0)) > 0 && (
                <div className="flex justify-between items-center text-xs font-semibold bg-success/10 text-success rounded-xl p-3 border border-success/20">
                  <span>Final Payment Received:</span>
                  <span className="text-sm font-bold">
                    {fmtINR(Math.max(0, (due + (Number(completionExtraCharge) || 0)) - Number(completionDiscount || 0)))}
                  </span>
                </div>
              )}
            </div>

            {Number(completionDiscount) > (due + (Number(completionExtraCharge) || 0)) && (
              <div className="mt-3 px-3 py-2 bg-rose-500/10 text-rose-500 text-[10px] font-semibold rounded-xl border border-rose-500/20 flex items-center gap-1.5 animate-in shake duration-200">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>Discount cannot exceed the total balance ({fmtINR(due + (Number(completionExtraCharge) || 0))})</span>
              </div>
            )}

            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => {
                  setCompletionOpen(false);
                  setCompletionDiscount("");
                  setCompletionExtraCharge("");
                }}
                className="flex-1 py-2.5 rounded-xl bg-secondary text-xs font-bold uppercase tracking-wider transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Number(completionDiscount) > (due + (Number(completionExtraCharge) || 0))}
                onClick={() => {
                  const d = Number(completionDiscount) || 0;
                  const eAmt = Number(completionExtraCharge) || 0;
                  const dynamicDueOnComplete = due + eAmt;

                  if (d > dynamicDueOnComplete) {
                    return toast.error("Discount cannot exceed balance");
                  }
                  
                  const amt = dynamicDueOnComplete - d;
                  const patch: Partial<typeof booking> = { status: "completed", completedAt: new Date().toISOString() };
                  
                  if (eAmt > 0) {
                    patch.extraCharges = (booking.extraCharges || 0) + eAmt;
                    patch.extraChargesNote = booking.extraCharges
                      ? `${booking.extraChargesNote || "Extra"} + ${completionExtraNote || "Travel"}`
                      : (completionExtraNote || "Travel");
                  }

                  if (d > 0) {
                    patch.discount = (booking.discount || 0) + d;
                  }
                  
                  if (amt > 0) {
                    addPayment({
                      bookingId: booking.id,
                      customerId: booking.customerId,
                      amount: amt,
                      date: new Date().toISOString(),
                      mode: completionPayMode,
                      note: "On completion",
                    });
                  }
                  
                  updateBooking(booking.id, patch);
                  setCompletionOpen(false);
                  setCompletionDiscount("");
                  setCompletionExtraCharge("");
                  toast.success("Booking Completed!");
                }}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer",
                  Number(completionDiscount) > (due + (Number(completionExtraCharge) || 0))
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "saree-gradient text-white active:scale-95"
                )}
              >
                Complete
              </button>
            </div>
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
      <span className={cn("text-sm tabular-nums", bold && "font-bold text-primary text-base")}>
        {value}
      </span>
    </div>
  );
}

function EditPaymentModal({
  payment,
  onClose,
  onSave,
  onDelete,
}: {
  payment: Payment;
  onClose: () => void;
  onSave: (patch: Partial<Payment>) => void;
  onDelete: () => void;
}) {
  const [amount, setAmount] = useState(String(payment.amount));
  const [mode, setMode] = useState<PaymentMode>(payment.mode ?? "gpay");
  const [date, setDate] = useState(() => payment.date.slice(0, 10));
  const [note, setNote] = useState(payment.note ?? "");

  const handleSave = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid payment amount");
    const old = parseISO(payment.date);
    const hh = String(old.getHours()).padStart(2, "0");
    const mm = String(old.getMinutes()).padStart(2, "0");
    const ss = String(old.getSeconds()).padStart(2, "0");
    const nextIso = new Date(`${date}T${hh}:${mm}:${ss}`).toISOString();
    onSave({
      amount: amt,
      mode,
      date: nextIso,
      note: note.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[20000] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-4 duration-200 border border-border/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/30 pb-3">
          <h3 className="font-display font-bold text-base flex items-center gap-1.5">
            <Wallet className="size-4 text-primary" /> Edit Payment
          </h3>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/80 active:scale-95 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">
            Payment Amount
          </label>
          <div className="relative bg-secondary rounded-2xl flex items-center px-3.5 py-2">
            <IndianRupee className="size-4 text-muted-foreground" />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent flex-1 pl-1 text-xl font-bold tabular-nums focus:outline-none"
              placeholder="0"
              autoFocus
            />
          </div>
        </div>

        {/* Mode Selector */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block mb-1.5">
            Payment Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["gpay", "cash", "other"] as PaymentMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer active:scale-95 text-center border border-transparent",
                  mode === m
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "bg-secondary hover:bg-secondary/80 text-foreground/80",
                )}
              >
                {m === "gpay" ? "📱 GPay" : m === "cash" ? "💵 Cash" : "💳 Other"}
              </button>
            ))}
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 text-xs font-semibold bg-secondary border border-border/30 rounded-xl px-3 outline-none focus:border-foreground/30 transition"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">
              Recorded Time
            </label>
            <div className="w-full h-10 text-xs font-semibold bg-secondary/50 border border-border/20 rounded-xl px-3 flex items-center text-muted-foreground">
              {formatAppTime(format(parseISO(payment.date), "HH:mm"))}
            </div>
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">
            Note (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="E.g. advance, final balance..."
            className="w-full text-xs font-semibold bg-secondary border border-border/30 rounded-xl px-3 py-2.5 outline-none focus:border-foreground/30 transition"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 pt-2 border-t border-border/30">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl saree-gradient text-white font-bold text-xs uppercase tracking-wider shadow-sm active:scale-95 transition cursor-pointer"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="w-12 flex items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition cursor-pointer shrink-0"
            title="Delete Payment"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EditPanel({
  booking,
  onCancel,
  onSave,
}: {
  booking: {
    service: ServiceType;
    sareeCount: number;
    pricePerSaree: number;
    extraCharges?: number;
    extraChargesNote?: string;
    deliveryDate: string;
    deliveryTime: string;
    notes?: string;
    measurements?: Measurement[];
  };
  onCancel: () => void;
  onSave: (patch: {
    service: ServiceType;
    sareeCount: number;
    pricePerSaree: number;
    extraCharges?: number;
    extraChargesNote?: string;
    deliveryDate: string;
    deliveryTime: string;
    notes?: string;
    measurements?: Measurement[];
  }) => void;
}) {
  const settings = useStore((s) => s.settings);
  const [service, setService] = useState<ServiceType>(booking.service);
  const [sareeCount, setSareeCount] = useState(booking.sareeCount);
  const [pricePerSaree, setPricePerSaree] = useState(booking.pricePerSaree);
  const [extraCharges, setExtraCharges] = useState(booking.extraCharges ? String(booking.extraCharges) : "");
  const [extraChargesNote, setExtraChargesNote] = useState(booking.extraChargesNote || "Travel");
  const [deliveryDate, setDeliveryDate] = useState(
    format(parseISO(booking.deliveryDate), "yyyy-MM-dd"),
  );
  const [deliveryTime, setDeliveryTime] = useState(booking.deliveryTime);
  const [notes, setNotes] = useState(booking.notes ?? "");
  const [showMeasure, setShowMeasure] = useState(
    () => !!booking.measurements && booking.measurements.length > 0,
  );
  const [measurements, setMeasurements] = useState<Measurement[]>(() => {
    if (booking.measurements && booking.measurements.length > 0) {
      return booking.measurements;
    }
    return settings.defaultMeasurements.map((m) => ({ label: m.label, value: m.value ?? 30 }));
  });

  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");

  const handleAddField = () => {
    const name = newFieldName.trim();
    if (!name) return;
    if (measurements.some((m) => m.label.toLowerCase() === name.toLowerCase())) {
      toast.error("This measurement already exists!");
      return;
    }
    setMeasurements([...measurements, { label: name, value: 30 }]);
    setNewFieldName("");
    setShowAddField(false);
    toast.success(`Added custom field: ${name}`);
  };

  return (
    <div className="bg-card card-shadow rounded-2xl p-5 mt-4 space-y-4 border border-border/20">
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Edit Booking Details
        </h2>
        <span className="text-[10px] text-muted-foreground font-medium">
          Update info & measurements
        </span>
      </div>

      {/* Service Type Selection */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
          Service Type
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(["prepleat", "drape"] as ServiceType[]).map((s) => {
            const active = service === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setService(s)}
                className={cn(
                  "py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "bg-secondary hover:bg-secondary/80 text-foreground/80",
                )}
              >
                {active && <Check className="size-3.5 stroke-[3]" />}
                {s === "prepleat" ? "PRE" : s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Saree Count and Price/Saree */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            Sarees
          </p>
          <div className="flex items-center justify-between bg-secondary rounded-xl p-1 px-2 h-10">
            <button
              type="button"
              onClick={() => setSareeCount(Math.max(1, sareeCount - 1))}
              className="size-7 rounded-lg bg-background border border-border/40 hover:bg-secondary flex items-center justify-center font-bold active:scale-90 transition cursor-pointer"
            >
              −
            </button>
            <span className="text-sm font-bold tabular-nums">{sareeCount}</span>
            <button
              type="button"
              onClick={() => setSareeCount(sareeCount + 1)}
              className="size-7 rounded-lg bg-background border border-border/40 hover:bg-secondary flex items-center justify-center font-bold active:scale-90 transition cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            Price Per Saree (₹)
          </p>
          <div className="flex items-center justify-between bg-secondary rounded-xl p-1 px-2 h-10">
            <button
              type="button"
              onClick={() => setPricePerSaree(Math.max(0, pricePerSaree - 50))}
              className="size-7 rounded-lg bg-background border border-border/40 hover:bg-secondary flex items-center justify-center font-bold active:scale-90 transition cursor-pointer"
            >
              −
            </button>
            <input
              type="number"
              value={pricePerSaree}
              onChange={(e) => setPricePerSaree(Number(e.target.value) || 0)}
              className="w-14 bg-transparent text-center text-sm font-bold tabular-nums focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setPricePerSaree(pricePerSaree + 50)}
              className="size-7 rounded-lg bg-background border border-border/40 hover:bg-secondary flex items-center justify-center font-bold active:scale-90 transition cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Extra / Travel Charge in EditPanel */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
          <Car className="size-3 text-primary" /> Extra / Travel Charge (₹)
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="number"
              value={extraCharges}
              onChange={(e) => setExtraCharges(e.target.value)}
              placeholder="0 (Travel / Extra)"
              className="w-full bg-secondary rounded-xl pl-7 pr-3 py-2 text-xs font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {["Travel", "Delivery", "Urgent", "Other"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setExtraChargesNote(tag)}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer border",
                  extraChargesNote === tag
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80",
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            Delivery Date
          </p>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full min-w-0 bg-secondary rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            Delivery Time
          </p>
          <input
            type="time"
            step={900}
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            className="w-full min-w-0 bg-secondary rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Measurements Section */}
      <div className="bg-secondary/40 rounded-xl p-3.5 border border-border/20 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Body Measurements
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              Toggle to record size chart (inch)
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showMeasure}
            onClick={() => setShowMeasure(!showMeasure)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition cursor-pointer",
              showMeasure ? "saree-gradient" : "bg-secondary-foreground/15",
            )}
          >
            <span
              className={cn(
                "inline-block size-4.5 rounded-full bg-card shadow transition-transform",
                showMeasure ? "translate-x-5.5" : "translate-x-1",
              )}
            />
          </button>
        </div>

        {showMeasure && measurements.length > 0 && (
          <div className="pt-2 border-t border-border/30">
            <div className="flex justify-around items-start py-2 gap-2 flex-wrap bg-background/50 rounded-xl border border-border/10">
              {measurements.map((m, i) => (
                <div key={i} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setMeasurements(measurements.filter((_, idx) => idx !== i));
                    }}
                    className="absolute -top-1.5 -right-1.5 z-30 size-4 rounded-full bg-destructive/95 text-white flex items-center justify-center cursor-pointer shadow active:scale-95 transition"
                  >
                    <X className="size-2.5" strokeWidth={3} />
                  </button>
                  <ScrollNumber
                    label={m.label}
                    value={m.value}
                    onChange={(v) =>
                      setMeasurements(
                        measurements.map((x, j) => (i === j ? { ...x, value: v } : x)),
                      )
                    }
                  />
                </div>
              ))}
            </div>

            {showAddField ? (
              <div className="flex items-center gap-1.5 justify-center mt-2 border-t border-border/20 pt-2 max-w-[280px] mx-auto">
                <input
                  type="text"
                  placeholder="Field name (e.g. Armhole)"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="flex-1 text-[11px] h-7 px-3 border border-border rounded-full bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddField();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddField}
                  className="h-7 px-3 rounded-full bg-primary text-primary-foreground text-[10px] font-bold cursor-pointer hover:brightness-95 active:scale-95"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddField(false);
                    setNewFieldName("");
                  }}
                  className="h-7 px-3 rounded-full bg-secondary text-muted-foreground text-[10px] font-bold cursor-pointer hover:bg-secondary/80 active:scale-95"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center mt-2 border-t border-border/20 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddField(true)}
                  className="text-[11px] font-semibold text-primary flex items-center gap-1 hover:underline cursor-pointer active:scale-95"
                >
                  + Add Custom Field
                </button>
              </div>
            )}

            <p className="text-[9px] text-muted-foreground/85 mt-2 text-center">
              Scroll inside each picker to adjust value
            </p>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
          Notes & Custom Request
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Enter notes / specifications..."
          className="w-full bg-secondary rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none leading-relaxed"
        />
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/30">
        <button
          type="button"
          onClick={onCancel}
          className="py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase tracking-wider active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <X className="size-4" /> Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            const extra = Number(extraCharges) || 0;
            onSave({
              service,
              sareeCount,
              pricePerSaree,
              extraCharges: extra > 0 ? extra : undefined,
              extraChargesNote: extra > 0 ? (extraChargesNote || "Travel") : undefined,
              deliveryDate: new Date(deliveryDate).toISOString(),
              deliveryTime,
              notes: notes.trim() || undefined,
              measurements: showMeasure ? measurements : undefined,
            });
          }}
          className="py-3 rounded-xl saree-gradient text-primary-foreground text-xs font-bold uppercase tracking-wider active:scale-95 transition cursor-pointer shadow-sm shadow-primary/20 flex items-center justify-center gap-1.5"
        >
          <Check className="size-4" /> Save
        </button>
      </div>
    </div>
  );
}
