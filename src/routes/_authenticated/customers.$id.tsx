import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, customerBookings, totalDue, fmtINR, formatAppDate, type Measurement } from "@/lib/store";
import {
  ArrowLeft,
  MessageCircle,
  Trash2,
  Phone,
  Pencil,
  Check,
  X,
  MapPin,
  MessageSquare,
  Send,
  Eye,
  Map,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollNumber } from "@/components/ScrollNumber";
import { MapPicker } from "@/components/MapPicker";

export const Route = createFileRoute("/_authenticated/customers/$id")({
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const customer = useStore((s) => s.customers.find((c) => c.id === id));
  const bookings = useStore((s) => s.bookings);
  const deleteCustomer = useStore((s) => s.deleteCustomer);
  const restoreCustomer = useStore((s) => s.restoreCustomer);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const settings = useStore((s) => s.settings);
  const businessName = settings.businessName || "Eyas Drapist";
  const websiteUrl = settings.websiteUrl || "https://eyasdrapist.shop/";
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [locationUrl, setLocationUrl] = useState(customer?.locationUrl ?? "");
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [reference, setReference] = useState(customer?.reference ?? "");

  // Message preview modal state
  const [previewMode, setPreviewMode] = useState<null | "whatsapp" | "sms">(null);
  const [includeLink, setIncludeLink] = useState(false);

  const [showMeasure, setShowMeasure] = useState(
    () => !!customer?.measurements && customer.measurements.length > 0,
  );
  const [measurements, setMeasurements] = useState<Measurement[]>(() => {
    if (customer?.measurements && customer.measurements.length > 0) {
      return customer.measurements;
    }
    return settings.defaultMeasurements.map((m) => ({ label: m.label, value: m.value ?? 30 }));
  });
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");

  const handleAddField = () => {
    const name = newFieldName.trim();
    if (!name) return;
    if (measurements.some((m) => m.label.toLowerCase() === name.toLowerCase())) {
      toast.error("Field already exists");
      return;
    }
    setMeasurements([...measurements, { label: name, value: 30 }]);
    setNewFieldName("");
    setShowAddField(false);
  };

  if (!customer) {
    return (
      <AppShell title="Customer">
        <p className="text-sm text-muted-foreground">Not found.</p>
      </AppShell>
    );
  }

  const cb = customerBookings(customer.id, bookings);
  const totalSpent = cb.reduce((s, b) => s + b.advancePaid, 0);
  const totalDueAll = cb.reduce((s, b) => s + totalDue(b), 0);
  const pendingOrders = cb.filter((b) => totalDue(b) > 0);
  const nextDelivery = pendingOrders[0];

  // Build a beautiful, client-friendly WhatsApp message
  const buildWhatsAppMessage = (withLink = includeLink) => {
    const lines: string[] = [];

    lines.push(`Hi *${customer.name}* 🙏`);

    if (pendingOrders.length > 0) {
      lines.push(
        `Reminder: ${pendingOrders.length > 1 ? `*${pendingOrders.length} pending orders*` : "*1 pending order*"} with us.`,
      );
      lines.push(`💰 *Balance Due: ${fmtINR(totalDueAll)}*`);
      if (nextDelivery) {
        lines.push(`📅 Delivery: ${formatAppDate(nextDelivery.deliveryDate)}`);
      }
      lines.push(`Pay via GPay / Cash. Thank you! 🙏`);
    } else if (cb.length > 0) {
      lines.push(`Thank you for trusting us! 💛 Hope to see you again soon ✨`);
    } else {
      lines.push(`We'd love to have you for your next occasion! Feel free to book anytime 😊`);
    }

    if (withLink) {
      lines.push("");
      lines.push(`🔗 ${websiteUrl}`);
    }

    return lines.join("\n");
  };

  // Build a plain SMS-friendly message (no markdown, shorter)
  const buildSmsMessage = (withLink = includeLink) => {
    const lines: string[] = [];
    lines.push(`Hi ${customer.name},`);
    if (pendingOrders.length > 0) {
      lines.push(`Balance due: ${fmtINR(totalDueAll)} for ${pendingOrders.length} order(s).`);
      if (nextDelivery) {
        lines.push(`Delivery: ${formatAppDate(nextDelivery.deliveryDate)}.`);
      }
      lines.push(`Pay via GPay/Cash. Thanks.`);
    } else if (cb.length > 0) {
      lines.push(`Thank you! Hope to see you again soon.`);
    } else {
      lines.push(`We'd love to have you for your next occasion. Feel free to reach out!`);
    }
    if (withLink) {
      lines.push(websiteUrl);
    }
    return lines.join("\n");
  };

  const handleSendWhatsApp = () => {
    if (!customer.phone) return toast.error("No phone number saved for this customer");
    const ph = customer.phone.replace(/\D/g, "");
    const text = buildWhatsAppMessage();
    window.location.href = `https://wa.me/${ph.startsWith("91") ? ph : "91" + ph}?text=${encodeURIComponent(text)}`;
    setPreviewMode(null);
  };

  const handleSendSMS = () => {
    if (!customer.phone) return toast.error("No phone number saved for this customer");
    const ph = customer.phone.replace(/\D/g, "");
    const msg = buildSmsMessage();
    window.location.href = `sms:${ph}&body=${encodeURIComponent(msg)}`;
    setPreviewMode(null);
  };

  const previewMessage =
    previewMode === "whatsapp" ? buildWhatsAppMessage(includeLink) : buildSmsMessage(includeLink);

  return (
    <AppShell>
      {/* Message Preview Modal */}
      {previewMode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm px-3 pb-4 sm:pb-0">
          <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
            {/* Modal Header */}
            <div
              className={cn(
                "px-5 py-4 flex items-center justify-between",
                previewMode === "whatsapp"
                  ? "bg-[oklch(0.55_0.18_150)] text-white"
                  : "bg-primary text-primary-foreground",
              )}
            >
              <div className="flex items-center gap-2.5">
                {previewMode === "whatsapp" ? (
                  <MessageCircle className="size-5" />
                ) : (
                  <MessageSquare className="size-5" />
                )}
                <div>
                  <p className="font-bold text-sm">
                    {previewMode === "whatsapp" ? "WhatsApp Preview" : "SMS Preview"}
                  </p>
                  <p className="text-[11px] opacity-80">
                    To: {customer.name} · {customer.phone}
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
                  previewMode === "whatsapp"
                    ? "bg-[#dcf8c6] text-[#111] text-xs"
                    : "bg-secondary text-foreground text-xs",
                )}
              >
                {previewMessage}
              </div>
              {/* Include link toggle */}
              <div className="mt-3 flex items-center justify-between bg-secondary rounded-2xl px-4 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-foreground">Include website link</p>
                  <p className="text-[10px] text-muted-foreground">
                    {previewMode === "whatsapp"
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
                onClick={previewMode === "whatsapp" ? handleSendWhatsApp : handleSendSMS}
                className={cn(
                  "py-3 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition shadow-sm",
                  previewMode === "whatsapp" ? "bg-[oklch(0.55_0.18_150)]" : "saree-gradient",
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
          onClick={() => navigate({ to: "/customers" })}
          className="size-10 rounded-full bg-secondary flex items-center justify-center"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (editing) {
                updateCustomer(customer.id, {
                  name: name.trim() || customer.name,
                  phone: phone.trim() || customer.phone,
                  address: address.trim() || undefined,
                  locationUrl: locationUrl.trim() || undefined,
                  reference: reference.trim() || undefined,
                  measurements:
                    customer.kind === "client" && showMeasure ? measurements : undefined,
                });
                toast.success("Customer updated");
              } else {
                setName(customer.name);
                setPhone(customer.phone);
                setAddress(customer.address ?? "");
                setLocationUrl(customer.locationUrl ?? "");
                setReference(customer.reference ?? "");
                setMeasurements(
                  customer.measurements && customer.measurements.length > 0
                    ? customer.measurements
                    : settings.defaultMeasurements.map((m) => ({
                        label: m.label,
                        value: m.value ?? 30,
                      })),
                );
                setShowMeasure(!!customer.measurements && customer.measurements.length > 0);
              }
              setEditing(!editing);
            }}
            className={`size-10 rounded-full flex items-center justify-center ${editing ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
          >
            {editing ? <Check className="size-5" /> : <Pencil className="size-5" />}
          </button>
          {editing && (
            <button
              onClick={() => {
                setEditing(false);
                setShowAddField(false);
                setNewFieldName("");
              }}
              className="size-10 rounded-full bg-secondary flex items-center justify-center"
            >
              <X className="size-5" />
            </button>
          )}
          <button
            onClick={() => {
              if (customer && confirm("Delete customer and all their bookings?")) {
                const cid = customer.id;
                deleteCustomer(cid);
                toast.success("Customer deleted", {
                  action: {
                    label: "Undo",
                    onClick: () => {
                      restoreCustomer(cid);
                      toast.success("Customer restored");
                    },
                  },
                  duration: 6000,
                });
                navigate({ to: "/customers" });
              }
            }}
            className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center"
          >
            <Trash2 className="size-5" />
          </button>
        </div>
      </div>

      <div className="saree-gradient rounded-3xl p-5 text-primary-foreground card-shadow">
        {editing ? (
          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/15 placeholder-white/60 rounded-xl px-3 py-2 text-base font-semibold focus:outline-none"
              placeholder="Name"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              className="w-full bg-white/15 placeholder-white/60 rounded-xl px-3 py-2 text-sm focus:outline-none"
              placeholder="Phone"
            />
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full bg-white/15 placeholder-white/60 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
              placeholder="Address"
            />
            <div className="flex items-center gap-2">
              <input
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                className="w-full bg-white/15 placeholder-white/60 rounded-xl px-3 py-2 text-sm focus:outline-none"
                placeholder="Google Maps URL"
              />
              <button type="button" onClick={() => setShowMapPicker(true)} className="p-2 bg-white/15 hover:bg-white/25 rounded-full shrink-0 transition-colors">
                <Map className="size-4" />
              </button>
            </div>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full bg-white/15 placeholder-white/60 rounded-xl px-3 py-2 text-sm focus:outline-none"
              placeholder="Reference (who referred)"
            />
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-display font-semibold truncate">{customer.name}</h1>
            <a
              href={`tel:${customer.phone}`}
              className="text-sm opacity-90 hover:underline inline-flex items-center gap-1 mt-1 cursor-pointer"
            >
              <Phone className="size-3.5" />
              {customer.phone}
            </a>
            {customer.address && (
              <p className="text-xs opacity-80 mt-1 flex items-start gap-1">
                <MapPin className="size-3.5 mt-0.5 shrink-0" />
                {customer.address}
              </p>
            )}
            {customer.locationUrl && (
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
            {customer.reference && (
              <p className="text-[11px] opacity-80 mt-1">ref: {customer.reference}</p>
            )}
          </>
        )}
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div>
            <p className="text-xs opacity-70 uppercase tracking-wider">Orders</p>
            <p className="text-xl font-bold">{cb.length}</p>
          </div>
          <div>
            <p className="text-xs opacity-70 uppercase tracking-wider">Paid</p>
            <p className="text-xl font-bold">{fmtINR(totalSpent)}</p>
          </div>
          <div>
            <p className="text-xs opacity-70 uppercase tracking-wider">Due</p>
            <p className="text-xl font-bold">{fmtINR(totalDueAll)}</p>
          </div>
        </div>
      </div>

      {editing && customer.kind === "client" && (
        <div className="bg-card card-shadow rounded-3xl p-4 mt-3 border border-border/10 space-y-3">
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
            </div>
          )}
        </div>
      )}

      {!editing &&
        customer.kind === "client" &&
        customer.measurements &&
        customer.measurements.length > 0 && (
          <div className="bg-card card-shadow rounded-3xl p-4 mt-3 border border-border/10">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
              <span>📐</span> Body Measurements
            </p>
            <div className="flex flex-wrap gap-2">
              {customer.measurements.map((m, idx) => (
                <div
                  key={idx}
                  className="bg-secondary px-3 py-2 rounded-2xl flex flex-col min-w-[70px]"
                >
                  <span className="text-[10px] text-muted-foreground font-semibold">{m.label}</span>
                  <span className="text-sm font-bold text-foreground mt-0.5">{m.value}"</span>
                </div>
              ))}
            </div>
          </div>
        )}

      <div className="relative mt-3 book-ring-animate rounded-2xl">
        <Link
          to="/new"
          search={
            customer.kind === "client" ? { customerId: customer.id } : { artistId: customer.id }
          }
          className="relative z-10 w-full saree-gradient text-white py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold active:scale-95 transition card-shadow text-center text-sm shadow-md"
        >
          📅 {customer.kind === "client" ? "Book Appointment / Order" : "Book for this Artist"}
        </Link>
      </div>

      {/* Quick Actions (Call / WhatsApp / SMS) */}
      {customer.phone && (
        <div className="bg-card card-shadow rounded-3xl p-4 mt-3 border border-border/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Eye className="size-3" /> Quick Actions
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPreviewMode("whatsapp")}
              className="bg-[oklch(0.55_0.18_150)] text-white py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold active:scale-95 transition cursor-pointer px-1 text-center"
            >
              <MessageCircle className="size-4" />
              WhatsApp
            </button>
            <button
              onClick={() => setPreviewMode("sms")}
              className="bg-secondary text-foreground py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold active:scale-95 transition cursor-pointer px-1 text-center"
            >
              <MessageSquare className="size-4" />
              SMS
            </button>
            <a
              href={`tel:${customer.phone}`}
              className="bg-primary text-primary-foreground py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold active:scale-95 transition cursor-pointer px-1 text-center"
            >
              <Phone className="size-4" />
              Call
            </a>
          </div>
        </div>
      )}

      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mt-5 mb-2">
        History
      </h2>
      {cb.length === 0 ? (
        <p className="text-sm text-muted-foreground bg-card rounded-2xl p-6 text-center card-shadow">
          No bookings yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {cb.map((b) => (
            <li key={b.id}>
              <Link
                to="/bookings/$id"
                params={{ id: b.id }}
                className="block bg-card card-shadow rounded-2xl p-4"
              >
                <div className="flex justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {b.service}
                    </p>
                    <p className="font-semibold">
                      {formatAppDate(b.deliveryDate)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {b.sareeCount} × {fmtINR(b.pricePerSaree)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{fmtINR(b.totalAmount)}</p>
                    {totalDue(b) > 0 ? (
                      <p className="text-xs text-destructive font-semibold">
                        {fmtINR(totalDue(b))} due
                      </p>
                    ) : (
                      <p className="text-xs text-success">Paid</p>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <MapPicker
        open={showMapPicker}
        onOpenChange={setShowMapPicker}
        onConfirm={(url) => setLocationUrl(url)}
      />
    </AppShell>
  );
}
