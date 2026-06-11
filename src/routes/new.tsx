import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, lastPriceFor, fmtINR, type ServiceType, type Measurement } from "@/lib/store";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Ruler, IndianRupee, User, Phone, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ScrollNumber } from "@/components/ScrollNumber";

export const Route = createFileRoute("/new")({
  head: () => ({ meta: [{ title: "New Booking — Saree Studio" }] }),
  component: NewBooking,
});

function NewBooking() {
  const navigate = useNavigate();
  const settings = useStore((s) => s.settings);
  const customers = useStore((s) => s.customers);
  const bookings = useStore((s) => s.bookings);
  const addCustomer = useStore((s) => s.addCustomer);
  const addBooking = useStore((s) => s.addBooking);

  const [service, setService] = useState<ServiceType>("prepleat");
  const [customerId, setCustomerId] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [showCustList, setShowCustList] = useState(false);
  const [custSearch, setCustSearch] = useState("");

  const [sareeCount, setSareeCount] = useState(1);
  const defaultPrice = service === "prepleat" ? settings.prepleatPrice : settings.drapePrice;
  const lastPrice = customerId ? lastPriceFor(customerId, service, bookings) : undefined;
  const [pricePerSaree, setPricePerSaree] = useState<number>(defaultPrice);
  const [priceTouched, setPriceTouched] = useState(false);

  const effPrice = priceTouched ? pricePerSaree : (lastPrice ?? defaultPrice);
  const total = sareeCount * effPrice;

  const today = format(new Date(), "yyyy-MM-dd");
  const [deliveryDate, setDeliveryDate] = useState(today);
  const [deliveryTime, setDeliveryTime] = useState("18:00");

  const [showPayment, setShowPayment] = useState(false);
  const [advance, setAdvance] = useState("");

  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");

  const [showMeasure, setShowMeasure] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>(settings.defaultMeasurements);

  const filteredCust = useMemo(() => {
    const q = custSearch.toLowerCase().trim();
    if (!q) return customers.slice(0, 6);
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, custSearch]);

  const selectedCust = customers.find((c) => c.id === customerId);

  const submit = () => {
    let cid = customerId;
    if (!cid) {
      if (!newName.trim() || !newPhone.trim()) return toast.error("Add customer name & phone");
      const c = addCustomer({ name: newName.trim(), phone: newPhone.trim() });
      cid = c.id;
    }
    if (!sareeCount || sareeCount < 1) return toast.error("Saree count required");
    if (!deliveryDate || !deliveryTime) return toast.error("Delivery date & time required");

    const b = addBooking({
      customerId: cid,
      service,
      sareeCount,
      pricePerSaree: effPrice,
      totalAmount: total,
      advancePaid: 0, // addBooking will add advance payment
      deliveryDate: new Date(deliveryDate).toISOString(),
      deliveryTime,
      notes: notes.trim() || undefined,
      measurements: showMeasure ? measurements : undefined,
    });
    // pass advance via separate payment if any
    const adv = Number(advance) || 0;
    if (adv > 0) {
      useStore.getState().addPayment({ bookingId: b.id, customerId: cid, amount: adv, date: new Date().toISOString(), note: "Advance" });
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
            onClick={() => { setService(s); setPriceTouched(false); setPricePerSaree(s === "prepleat" ? settings.prepleatPrice : settings.drapePrice); }}
            className={cn(
              "py-4 rounded-2xl font-semibold uppercase tracking-wider text-sm transition card-shadow",
              service === s ? "saree-gradient text-primary-foreground" : "bg-card text-foreground",
            )}
          >{s}</button>
        ))}
      </div>

      {/* Customer */}
      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Customer</p>
        {selectedCust ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{selectedCust.name}</p>
              <p className="text-xs text-muted-foreground">{selectedCust.phone}</p>
              {lastPrice && <p className="text-xs text-gold mt-1">Last {service} price: {fmtINR(lastPrice)}</p>}
            </div>
            <button onClick={() => { setCustomerId(""); setShowCustList(false); }} className="text-xs text-primary font-semibold">Change</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className="w-full bg-secondary rounded-full pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone" inputMode="tel" className="w-full bg-secondary rounded-full pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            {customers.length > 0 && (
              <>
                <button onClick={() => setShowCustList((v) => !v)} className="mt-3 text-xs text-primary font-semibold flex items-center gap-1">
                  {showCustList ? <ChevronUp className="size-3"/> : <ChevronDown className="size-3"/>} Choose existing customer
                </button>
                {showCustList && (
                  <>
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <input value={custSearch} onChange={(e) => setCustSearch(e.target.value)} placeholder="Search" className="w-full bg-secondary rounded-full pl-9 pr-3 py-2 text-sm focus:outline-none" />
                    </div>
                    <ul className="mt-2 max-h-48 overflow-y-auto space-y-1">
                      {filteredCust.map((c) => (
                        <li key={c.id}>
                          <button
                            onClick={() => { setCustomerId(c.id); setShowCustList(false); setNewName(""); setNewPhone(""); }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary transition"
                          >
                            <p className="text-sm font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.phone}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </>
        )}
      </section>

      {/* Sarees + price */}
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
          <div className="relative">
            <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="number"
              value={priceTouched ? pricePerSaree : effPrice}
              onChange={(e) => { setPriceTouched(true); setPricePerSaree(Number(e.target.value) || 0); }}
              className="w-24 bg-secondary rounded-full pl-7 pr-3 py-2 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
            />
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
          <input type="time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} className="bg-secondary rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </section>

      {/* Optional sections */}
      <CollapsibleSection icon="₹" label="Advance Payment" open={showPayment} onToggle={() => setShowPayment(!showPayment)}>
        <div className="relative">
          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="number"
            value={advance}
            onChange={(e) => setAdvance(e.target.value)}
            placeholder={`Optional advance (total ${fmtINR(total)})`}
            className="w-full bg-secondary rounded-full pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Pay anytime — update later in booking detail.</p>
      </CollapsibleSection>

      <CollapsibleSection icon="📐" label="Measurements" open={showMeasure} onToggle={() => setShowMeasure(!showMeasure)}>
        <div className="flex justify-around items-center py-2">
          {measurements.map((m, i) => (
            <ScrollNumber
              key={m.label}
              label={m.label}
              value={m.value}
              onChange={(v) => setMeasurements(measurements.map((x, j) => i === j ? { ...x, value: v } : x))}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">Scroll to change · all in inches</p>
      </CollapsibleSection>

      <CollapsibleSection icon="📝" label="Notes / Remarks" open={showNotes} onToggle={() => setShowNotes(!showNotes)}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Special instructions, fabric details..."
          className="w-full bg-secondary rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </CollapsibleSection>

      <button onClick={submit} className="w-full saree-gradient text-primary-foreground py-4 rounded-2xl font-semibold mt-4 flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg shadow-primary/20">
        <Check className="size-5" /> Save Booking
      </button>
    </AppShell>
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
