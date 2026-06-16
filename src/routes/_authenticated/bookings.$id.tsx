import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  useStore,
  totalDue,
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
  Send,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  const [includeLink, setIncludeLink] = useState(true);

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

  // Workflow-aware messages: the content adapts to whichever step the booking
  // is in (received / ready / delivered) so the customer always gets the
  // right update at the right time.
  const currentStage: "received" | "ready" | "delivered" | "new" = booking.deliveredAt
    ? "delivered"
    : booking.workDoneAt
      ? "ready"
      : booking.receivedAt
        ? "received"
        : "new";

  const buildWhatsAppMessage = (
    kind: "reminder" | "bill" | "balance" | "status",
    withLink = true,
  ) => {
    const site = settings.websiteUrl || "https://eyasdrapist.shop/";
    const dateStr = formatAppDate(booking.deliveryDate);
    const timeStr = fmtTime12(booking.deliveryTime);
    const paid = booking.advancePaid;
    let parts: string[] = [];

    if (kind === "status") {
      const head = `🧵 *${businessName}*`;
      const greet = `Hi ${customer?.name || "Customer"} ✨`;
      if (currentStage === "received") {
        parts = [
          head,
          "",
          greet,
          `We've *received your saree* for ${booking.service.toUpperCase()} 🪡`,
          `Sarees: ${booking.sareeCount}`,
          `Delivery: 📅 ${dateStr}, ${timeStr}`,
          due > 0 ? `Balance: ${fmtINR(due)}` : `Status: ✅ Fully paid`,
        ];
      } else if (currentStage === "ready") {
        const label = booking.service === "prepleat" ? "PrePleat is ready" : "Drape is ready";
        parts = [
          head,
          "",
          greet,
          `Good news — your *${label}* 💛`,
          `Pickup / Delivery: 📅 ${dateStr}, ${timeStr}`,
          due > 0
            ? `Balance to pay: ${fmtINR(due)} (GPay / Cash)`
            : `Already fully paid — thank you!`,
        ];
      } else if (currentStage === "delivered") {
        parts = [
          head,
          "",
          greet,
          `Your order has been *delivered* ✅ Thank you for trusting us 💛`,
          ``,
          `🧾 *Bill:* ${booking.billNumber ?? booking.id.slice(0, 6).toUpperCase()}`,
          `Sarees: ${booking.sareeCount} × ${fmtINR(booking.pricePerSaree)}`,
          `Total: ${fmtINR(booking.totalAmount)}`,
          `Paid: ${fmtINR(paid)}`,
          due > 0 ? `Balance: ${fmtINR(due)}` : `Status: ✅ Fully Paid`,
          "",
          `Hope to drape for you again ✨`,
        ];
      } else {
        kind = "bill";
      }
    }
    
    if (kind === "balance") {
      parts = [
        `💛 *${businessName}*`,
        ``,
        `Hi ${customer?.name || "Customer"} 🙏`,
        `A gentle reminder — your saree order has a remaining balance.`,
        ``,
        `🧾 *Total:* ${fmtINR(booking.totalAmount)}`,
        `✅ *Paid:* ${fmtINR(paid)}`,
        `💰 *Balance due:* ${fmtINR(due)}`,
        ``,
        `📅 Delivery: ${dateStr}, ${timeStr}`,
        ``,
        `You can pay via GPay / Cash on delivery. Thank you ✨`,
      ];
    }
    
    if (kind === "bill") {
      parts = [
        `🧾 *${businessName}* — Bill`,
        ``,
        `Hi ${customer?.name || "Customer"} ✨`,
        `Thank you for choosing us 💛 Here are your order details:`,
        ``,
        `📌 *Service:* ${booking.service.toUpperCase()}`,
        `🪡 *Sarees:* ${booking.sareeCount} × ${fmtINR(booking.pricePerSaree)}`,
        `📅 *Delivery:* ${dateStr}, ${timeStr}`,
        ``,
        `*Total:* ${fmtINR(booking.totalAmount)}`,
        `*Paid:* ${fmtINR(paid)}`,
        due > 0 ? `*Balance:* ${fmtINR(due)}` : `*Status:* ✅ Fully Paid`,
      ];
    }

    if (withLink) {
      parts.push("");
      parts.push(`🌐 ${site}`);
    }

    return parts.join("\n");
  };

  const sendWhatsApp = (
    kind: "reminder" | "bill" | "balance" | "status" = "reminder",
    withLink = true,
  ) => {
    if (!customer?.phone) return toast.error("No phone number");
    const phone = customer.phone.replace(/\D/g, "");
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
    withLink = true,
  ) => {
    if (!customer?.phone) return toast.error("No phone number");
    const phone = customer.phone.replace(/\D/g, "");
    const msg = buildWhatsAppMessage(kind, withLink)
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
      const ok = window.confirm(
        `Amount ${fmtINR(n)} exceeds pending ${fmtINR(due)}. Continue anyway?`,
      );
      if (!ok) return;
    }
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
    setPayAmt("");
    setPayNote("");
    setPayDate(today);
    setShowAddPayment(false);
    toast.success(`Payment of ${fmtINR(n)} added`);
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
  const phoneClean = customer?.phone ? customer.phone.replace(/\D/g, "") : "";
  const paidPercent =
    booking.totalAmount > 0
      ? Math.min(100, Math.round((booking.advancePaid / booking.totalAmount) * 100))
      : 0;

  return (
    <AppShell>
      {/* Message Preview Modal */}
      {previewMode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm px-3 pb-4 sm:pb-0 text-left">
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
            {booking.billNumber && (
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15">
                {booking.billNumber}
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
              href={`tel:${phoneClean}`}
              className="text-xs opacity-90 hover:underline cursor-pointer"
            >
              {customer.phone}
            </a>
          )}
          {phoneClean && (
            <div className="flex gap-1.5 ml-1">
              <a
                href={`tel:${phoneClean}`}
                className="size-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition active:scale-90"
                title="Call Customer"
              >
                <Phone className="size-3 text-white" />
              </a>
              <a
                href={`https://wa.me/${phoneClean}`}
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
          <p className="text-xs opacity-80 mt-1.5 line-clamp-2 italic">{customer.address}</p>
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

      {/* Interactive horizontal stepper timeline */}
      {booking.status !== "cancelled" && (
        <div className="bg-card card-shadow rounded-2xl p-4 mt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Workflow Status
          </h2>
          <div className="relative flex items-center justify-between mt-2 px-1">
            {/* Stepper connecting line */}
            <div className="absolute top-[18px] left-[15%] right-[15%] h-0.5 bg-border -z-10" />

            {/* Active track color */}
            <div
              className="absolute top-[18px] left-[15%] h-0.5 bg-success transition-all duration-300 -z-10"
              style={{
                width: booking.deliveredAt ? "70%" : booking.workDoneAt ? "35%" : "0%",
              }}
            />

            {[
              { key: "receivedAt" as const, label: "Received", fullLabel: "Saree Received" },
              {
                key: "workDoneAt" as const,
                label: booking.service === "prepleat" ? "PrePleat Done" : "Drape Done",
                fullLabel: "Work Done",
              },
              { key: "deliveredAt" as const, label: "Delivered", fullLabel: "Order Delivered" },
            ].map((step, i, arr) => {
              const ts = booking[step.key];
              const prevDone = i === 0 ? true : !!booking[arr[i - 1].key];
              const isDone = !!ts;

              const handleStepClick = () => {
                if (isDone) {
                  const patch: Partial<typeof booking> = {};
                  for (let j = i; j < arr.length; j++)
                    (patch as Record<string, undefined>)[arr[j].key] = undefined;
                  if (booking.status === "delivered") patch.status = "pending";
                  updateBooking(booking.id, patch);
                  toast.success("Workflow reverted");
                  return;
                }
                if (step.key === "deliveredAt" && due > 0) {
                  const ok = window.confirm(
                    `Balance ${fmtINR(due)} pending. Mark as paid (${(settings.defaultPaymentMode ?? "gpay").toUpperCase()}) and deliver?`,
                  );
                  if (ok) {
                    addPayment({
                      bookingId: booking.id,
                      customerId: booking.customerId,
                      amount: due,
                      date: new Date().toISOString(),
                      mode: settings.defaultPaymentMode ?? "gpay",
                      note: "On delivery",
                    });
                  }
                }
                const patch: Partial<typeof booking> = {
                  [step.key]: new Date().toISOString(),
                } as Partial<typeof booking>;
                if (step.key === "deliveredAt") {
                  patch.status = "delivered";
                  patch.completedAt = new Date().toISOString();
                  if (!booking.workDoneAt) patch.workDoneAt = new Date().toISOString();
                  if (!booking.receivedAt) patch.receivedAt = new Date().toISOString();
                }
                updateBooking(booking.id, patch);
                toast.success(`${step.fullLabel} ✓`);
              };

              return (
                <button
                  key={step.key}
                  disabled={!prevDone && !isDone}
                  onClick={handleStepClick}
                  className="flex flex-col items-center flex-1 focus:outline-none disabled:opacity-50"
                >
                  <div
                    className={cn(
                      "size-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition active:scale-95 cursor-pointer shadow-sm",
                      isDone
                        ? "bg-success border-success text-success-foreground"
                        : prevDone
                          ? "bg-background border-primary text-primary"
                          : "bg-background border-border text-muted-foreground/40",
                    )}
                  >
                    {isDone ? <Check className="size-4 stroke-[3]" /> : i + 1}
                  </div>
                  <span className="text-[10px] font-bold mt-1.5 leading-tight text-center">
                    {step.label}
                  </span>
                  {ts && (
                    <span className="text-[8px] text-muted-foreground/80 mt-0.5 leading-none">
                      {formatAppDate(ts)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Stage aware notification prompt */}
          {currentStage !== "new" && (
            <div className="mt-4 pt-3.5 border-t border-border/40 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] uppercase font-bold tracking-wider text-primary">
                  Recommend stage update
                </p>
                <p className="text-xs font-semibold text-foreground mt-0.5 truncate">
                  {currentStage === "received" && "Saree Received Update"}
                  {currentStage === "ready" &&
                    (booking.service === "prepleat" ? "PrePleat Done Notice" : "Drape Done Notice")}
                  {currentStage === "delivered" && "Delivered Invoice Receipt"}
                </p>
              </div>
              <button
                onClick={() => setPreviewMode({ channel: "whatsapp", kind: "status" })}
                className="px-4 py-2 saree-gradient text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-xl active:scale-95 transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-primary/20"
              >
                <MessageCircle className="size-4" /> Send Update
              </button>
            </div>
          )}
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

        {/* Amount Row Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-border/40 text-center">
          <div>
            <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
              Total Bill
            </p>
            <p className="text-sm font-bold mt-0.5">{fmtINR(booking.totalAmount)}</p>
          </div>
          <div className="border-l border-border/30">
            <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
              Advance Paid
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
          <div className="mt-4 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Collect Payment
              </p>
              <button
                type="button"
                onClick={() => setShowAddPayment(false)}
                className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition"
              >
                Hide
              </button>
            </div>

            <div className="flex gap-2">
              <input
                value={payAmt}
                onChange={(e) => setPayAmt(e.target.value)}
                type="number"
                placeholder={`Amount (due ${due})`}
                className="flex-1 min-w-0 bg-secondary border-0 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={handlePay}
                className="size-8.5 shrink-0 rounded-xl saree-gradient text-primary-foreground flex items-center justify-center active:scale-95 transition cursor-pointer shadow-sm shadow-primary/20"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mt-2">
              <button
                onClick={() => setPayAmt(String(Math.round(due / 2)))}
                className="py-1.5 rounded-lg bg-secondary text-[10px] font-bold uppercase hover:bg-secondary/80 active:scale-95 transition cursor-pointer"
              >
                50%
              </button>
              <button
                onClick={() => setPayAmt(String(due))}
                className="py-1.5 rounded-lg bg-secondary text-[10px] font-bold uppercase hover:bg-secondary/80 active:scale-95 transition cursor-pointer"
              >
                Full
              </button>
              <button
                onClick={() => setPayAmt("")}
                className="py-1.5 rounded-lg bg-secondary text-[10px] font-bold uppercase hover:bg-secondary/80 active:scale-95 transition cursor-pointer"
              >
                Clear
              </button>
            </div>

            {/* Segmented Mode Selector */}
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {(["gpay", "cash", "other"] as PaymentMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setPayMode(m)}
                  className={cn(
                    "py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer active:scale-95",
                    payMode === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <input
                type="date"
                value={payDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setPayDate(e.target.value)}
                className="flex-1 min-w-0 bg-secondary rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => setPayDate(new Date().toISOString().slice(0, 10))}
                className="px-2.5 py-1.5 rounded-lg bg-secondary text-[10px] font-bold uppercase tracking-wider hover:bg-secondary/80 active:scale-95 transition cursor-pointer"
              >
                Today
              </button>
            </div>

            <input
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="Note / reference (optional)"
              className="w-full mt-2 bg-secondary rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
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
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => setActivePayment(null)}
        >
          <div
            className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold">Payment details</h3>
              <button
                onClick={() => setActivePayment(null)}
                className="size-8 rounded-full bg-secondary flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Amount" value={fmtINR(activePayment.amount)} bold />
              <Row label="Mode" value={(activePayment.mode ?? "gpay").toUpperCase()} />
              <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border">
                <span className="text-xs text-muted-foreground">Date</span>
                <input
                  type="date"
                  value={activePayment.date.slice(0, 10)}
                  onChange={(e) => {
                    const ymd = e.target.value;
                    if (!ymd) return;
                    // Preserve existing time-of-day to keep chronological order.
                    const old = parseISO(activePayment.date);
                    const hh = String(old.getHours()).padStart(2, "0");
                    const mm = String(old.getMinutes()).padStart(2, "0");
                    const ss = String(old.getSeconds()).padStart(2, "0");
                    const nextIso = new Date(`${ymd}T${hh}:${mm}:${ss}`).toISOString();
                    updatePayment(activePayment.id, { date: nextIso });
                    setActivePayment({ ...activePayment, date: nextIso });
                    toast.success("Payment date updated");
                  }}
                  className="bg-secondary rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <Row label="Time" value={formatAppTime(format(parseISO(activePayment.date), "HH:mm"))} />
              {activePayment.note && <Row label="Note" value={activePayment.note} />}
            </div>
            <button
              onClick={() => {
                if (activePayment && confirm("Delete this payment?")) {
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
              className="mt-4 w-full py-3 rounded-2xl bg-destructive/10 text-destructive text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Trash2 className="size-4" /> Delete payment
            </button>
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

function EditPanel({
  booking,
  onCancel,
  onSave,
}: {
  booking: {
    service: ServiceType;
    sareeCount: number;
    pricePerSaree: number;
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
            className="w-full bg-secondary rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
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
            className="w-full bg-secondary rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
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
            onSave({
              service,
              sareeCount,
              pricePerSaree,
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
