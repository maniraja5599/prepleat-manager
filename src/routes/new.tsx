import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, lastPriceFor, fmtINR, type ServiceType, type Measurement } from "@/lib/store";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, ChevronDown, ChevronUp, IndianRupee, User, Phone, MapPin, Plus, Minus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ScrollNumber } from "@/components/ScrollNumber";

function roundUpToQuarter(d = new Date()) {
  const ms = 15 * 60 * 1000;
  const r = new Date(Math.ceil(d.getTime() / ms) * ms);
  return `${String(r.getHours()).padStart(2, "0")}:${String(r.getMinutes()).padStart(2, "0")}`;
}

export const Route = createFileRoute("/new")({
  validateSearch: (s: Record<string, unknown>) => ({
    date: typeof s.date === "string" ? s.date : undefined,
  }),
  head: () => ({ meta: [{ title: "New Booking — Eyas Saree Drapist" }] }),
  component: NewBooking,
});

function NewBooking() {
  const navigate = useNavigate();
  const { date: presetDate } = Route.useSearch();
  const settings = useStore((s) => s.settings);
  const customers = useStore((s) => s.customers);
  const bookings = useStore((s) => s.bookings);
  const addCustomer = useStore((s) => s.addCustomer);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const addBooking = useStore((s) => s.addBooking);

  const [service, setService] = useState<ServiceType>("prepleat");
  const [customerId, setCustomerId] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [nameFocus, setNameFocus] = useState(false);

  const [sareeCount, setSareeCount] = useState(1);
  const defaultPrice = service === "prepleat" ? settings.prepleatPrice : settings.drapePrice;
  const lastPrice = customerId ? lastPriceFor(customerId, service, bookings) : undefined;
  const [pricePerSaree, setPricePerSaree] = useState<number>(defaultPrice);
  const [priceTouched, setPriceTouched] = useState(false);
  const effPrice = priceTouched ? pricePerSaree : (lastPrice ?? defaultPrice);
  const total = sareeCount * effPrice;

  const today = format(new Date(), "yyyy-MM-dd");
  const [deliveryDate, setDeliveryDate] = useState(presetDate || today);
  const [deliveryTime, setDeliveryTime] = useState(roundUpToQuarter());

  useEffect(() => { if (presetDate) setDeliveryDate(presetDate); }, [presetDate]);

  const [advance, setAdvance] = useState("");
  const advNum = Number(advance) || 0;
  const remaining = Math.max(0, total - advNum);

  const [notes, setNotes] = useState("");
  const [showMeasure, setShowMeasure] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>(settings.defaultMeasurements);

  // Keep measurements in sync if settings change (e.g. user updates default labels live)
  useEffect(() => { setMeasurements(settings.defaultMeasurements); }, [settings.defaultMeasurements]);

  const nameSuggestions = useMemo(() => {
    const q = newName.toLowerCase().trim();
    if (!q) return [] as typeof customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5);
  }, [customers, newName]);

  const phoneSuggestions = useMemo(() => {
    const q = newPhone.replace(/\D/g, "");
    if (q.length < 3) return [] as typeof customers;
    return customers.filter((c) => c.phone.replace(/\D/g, "").includes(q)).slice(0, 5);
  }, [customers, newPhone]);

  const selectedCust = customers.find((c) => c.id === customerId);

  const pickCustomer = (c: typeof customers[number]) => {
    setCustomerId(c.id);
    setNewName(""); setNewPhone(""); setNewAddress("");
    setNameFocus(false);
  };

  const [reviewOpen, setReviewOpen] = useState(false);

  const openReview = () => {
    if (!customerId && (!newName.trim() || !newPhone.trim())) {
      return toast.error("Add customer name & phone");
    }
    if (!sareeCount || sareeCount < 1) return toast.error("Saree count required");
    if (!deliveryDate || !deliveryTime) return toast.error("Delivery date & time required");
    if (advNum > total) return toast.error("Advance cannot exceed total");
    setReviewOpen(true);
  };

  const confirmSave = () => {
    let cid = customerId;
    if (!cid) {
      const c = addCustomer({ name: newName.trim(), phone: newPhone.trim(), address: newAddress.trim() || undefined });
      cid = c.id;
    } else if (newAddress.trim() && selectedCust && !selectedCust.address) {
      updateCustomer(cid, { address: newAddress.trim() });
    }

    const b = addBooking({
      customerId: cid,
      service,
      sareeCount,
      pricePerSaree: effPrice,
      totalAmount: total,
      advancePaid: 0,
      deliveryDate: new Date(deliveryDate).toISOString(),
      deliveryTime,
      notes: notes.trim() || undefined,
      measurements: showMeasure ? measurements : undefined,
    });
    if (advNum > 0) {
      useStore.getState().addPayment({ bookingId: b.id, customerId: cid, amount: advNum, date: new Date().toISOString(), note: "Advance" });
    }
    toast.success("Booking created");
    navigate({ to: "/bookings/$id", params: { id: b.id } });
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between pt-4 pb-3">
        <button onClick={() => navigate({ to: "/" })} className="size-10 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-lg font-display font-semibold">New Booking</h1>
        <div className="size-10" />
      </div>

      {/* Service toggle */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(["prepleat", "drape"] as ServiceType[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setService(s); setPriceTouched(false);
              setPricePerSaree(s === "prepleat" ? settings.prepleatPrice : settings.drapePrice);
            }}
            className={cn(
              "py-4 rounded-2xl font-semibold uppercase tracking-wider text-sm transition card-shadow",
              service === s ? "saree-gradient text-primary-foreground" : "bg-card text-foreground",
            )}
          >{s === "prepleat" ? `PrePleat · ₹${settings.prepleatPrice}` : `Drape · ₹${settings.drapePrice}`}</button>
        ))}
      </div>

      {/* Customer */}
      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Customer</p>
        {selectedCust ? (
          <div>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-semibold truncate">{selectedCust.name}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedCust.phone}</p>
                {selectedCust.address && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{selectedCust.address}</p>}
                {lastPrice && <p className="text-xs text-gold mt-1">Last {service}: {fmtINR(lastPrice)}</p>}
              </div>
              <button onClick={() => setCustomerId("")} className="text-xs text-primary font-semibold shrink-0">Change</button>
            </div>
            {!selectedCust.address && (
              <div className="relative mt-3">
                <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <textarea
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  rows={2}
                  placeholder="Add address (optional)"
                  className="w-full bg-secondary rounded-2xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onFocus={() => setNameFocus(true)}
                onBlur={() => setTimeout(() => setNameFocus(false), 150)}
                placeholder="Customer name"
                className="w-full bg-secondary rounded-full pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {nameFocus && nameSuggestions.length > 0 && (
                <ul className="absolute z-30 left-0 right-0 mt-1 bg-popover border border-border rounded-2xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                  {nameSuggestions.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); pickCustomer(c); }}
                        className="w-full text-left px-3 py-2 hover:bg-secondary"
                      >
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.phone}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone"
                inputMode="tel"
                className="w-full bg-secondary rounded-full pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {phoneSuggestions.length > 0 && (
                <ul className="absolute z-30 left-0 right-0 mt-1 bg-popover border border-border rounded-2xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                  {phoneSuggestions.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); pickCustomer(c); }}
                        className="w-full text-left px-3 py-2 hover:bg-secondary"
                      >
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.phone}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <textarea
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                rows={2}
                placeholder="Address (optional)"
                className="w-full bg-secondary rounded-2xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
        )}
      </section>

      {/* Order */}
      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Order</p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">Saree count</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setSareeCount(Math.max(1, sareeCount - 1))} className="size-9 rounded-full bg-secondary text-lg font-bold">−</button>
            <span className="w-8 text-center text-xl font-bold tabular-nums">{sareeCount}</span>
            <button onClick={() => setSareeCount(sareeCount + 1)} className="size-9 rounded-full bg-secondary text-lg font-bold">+</button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 mt-3">
          <span className="text-sm">Price / saree</span>
          <div className="flex items-center gap-1 bg-secondary rounded-full px-1">
            <button
              onClick={() => { setPriceTouched(true); setPricePerSaree(Math.max(0, effPrice - 50)); }}
              className="size-7 rounded-full"
            ><Minus className="size-3.5 mx-auto" /></button>
            <div className="relative w-20">
              <IndianRupee className="absolute left-1 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <input
                type="number"
                value={priceTouched ? pricePerSaree : effPrice}
                onChange={(e) => { setPriceTouched(true); setPricePerSaree(Number(e.target.value) || 0); }}
                className="w-full bg-transparent pl-5 pr-1 py-1.5 text-sm text-right tabular-nums focus:outline-none"
              />
            </div>
            <button
              onClick={() => { setPriceTouched(true); setPricePerSaree(effPrice + 50); }}
              className="size-7 rounded-full"
            ><Plus className="size-3.5 mx-auto" /></button>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border flex justify-between items-baseline">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-2xl font-display font-bold text-primary">{fmtINR(total)}</span>
        </div>
      </section>

      {/* Delivery */}
      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Delivery</p>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="bg-secondary rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="time" step={900} value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} className="bg-secondary rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </section>

      {/* Advance */}
      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Advance</p>
          <p className="text-xs text-muted-foreground">Remaining <span className="font-semibold text-foreground">{fmtINR(remaining)}</span></p>
        </div>
        <div className="relative">
          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="number"
            value={advance}
            onChange={(e) => setAdvance(e.target.value)}
            placeholder="0"
            className="w-full bg-secondary rounded-full pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {[
            { label: "Clear", v: 0 },
            { label: "50%", v: Math.round(total / 2) },
            { label: "Full", v: total },
            { label: "+₹100", v: advNum + 100 },
          ].map((b) => (
            <button
              key={b.label}
              onClick={() => setAdvance(String(b.v))}
              className="py-1.5 rounded-full bg-secondary text-xs font-semibold"
            >{b.label}</button>
          ))}
        </div>
        {advNum > total && <p className="text-xs text-destructive mt-2">Cannot exceed total {fmtINR(total)}</p>}
      </section>

      <CollapsibleSection icon="📐" label="Measurements" open={showMeasure} onToggle={() => setShowMeasure(!showMeasure)}>
        <div className="flex justify-around items-start py-2 gap-2 flex-wrap">
          {measurements.map((m, i) => (
            <ScrollNumber
              key={i}
              label={m.label}
              value={m.value}
              onChange={(v) => setMeasurements(measurements.map((x, j) => i === j ? { ...x, value: v } : x))}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-1">Scroll inside each picker · all in inches</p>
      </CollapsibleSection>

      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional remarks…"
          className="w-full bg-secondary rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </section>

      <button
        onClick={openReview}
        className="w-full saree-gradient text-primary-foreground py-4 rounded-2xl font-semibold mt-2 flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg shadow-primary/20"
      >
        <Check className="size-5" /> Review & Save
      </button>

      {reviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setReviewOpen(false)}>
          <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-display font-semibold mb-1">Quick review</h3>
            <p className="text-xs text-muted-foreground mb-4">Confirm details before saving.</p>
            <ReviewRow label="Service" value={service === "prepleat" ? "PrePleat" : "Drape"} />
            <ReviewRow label="Customer" value={selectedCust?.name || newName} />
            <ReviewRow label="Sarees" value={`${sareeCount} × ${fmtINR(effPrice)}`} />
            <ReviewRow label="Delivery" value={`${format(new Date(deliveryDate), "EEE, MMM d")} · ${deliveryTime}`} />
            <ReviewRow label="Total" value={fmtINR(total)} bold />
            <ReviewRow label="Advance" value={fmtINR(advNum)} />
            <ReviewRow label="Remaining" value={fmtINR(remaining)} />
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={() => setReviewOpen(false)} className="py-3 rounded-2xl bg-secondary text-sm font-semibold">Edit</button>
              <button onClick={() => { setReviewOpen(false); confirmSave(); }} className="py-3 rounded-2xl saree-gradient text-primary-foreground text-sm font-semibold">Confirm & Save</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function ReviewRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm tabular-nums", bold && "font-bold text-primary text-base")}>{value}</span>
    </div>
  );
}

function CollapsibleSection({ icon, label, open, onToggle, children }: { icon: string; label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="bg-card card-shadow rounded-2xl mb-3 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 active:bg-secondary/50">
        <span className="flex items-center gap-2 text-sm font-semibold"><span>{icon}</span>{label}</span>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </section>
  );
}