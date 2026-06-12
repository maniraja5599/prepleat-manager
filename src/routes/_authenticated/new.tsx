import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, lastPriceFor, fmtINR, fmtTime12, bookingsOnDate, type ServiceType, type Measurement } from "@/lib/store";
import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, IndianRupee, User, MapPin, Plus, Minus, AlertTriangle, Palette, CalendarDays, Clock, Users, Search, X } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { ScrollNumber } from "@/components/ScrollNumber";
import { HorizontalPicker } from "@/components/HorizontalPicker";

function roundUpToQuarter(d = new Date()) {
  const ms = 15 * 60 * 1000;
  const r = new Date(Math.ceil(d.getTime() / ms) * ms);
  return `${String(r.getHours()).padStart(2, "0")}:${String(r.getMinutes()).padStart(2, "0")}`;
}

// Indian mobile number — strip +91 / 0091 / 0 / non-digits, keep last 10 digits.
function sanitizeIndianPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0091")) digits = digits.slice(4);
  else if (digits.startsWith("91") && digits.length > 10) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}
const isValidIndianMobile = (d: string) => /^[6-9]\d{9}$/.test(d);

export const Route = createFileRoute("/_authenticated/new")({
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
  const allCustomers = useStore((s) => s.customers);
  const customers = useMemo(() => allCustomers.filter((c) => (c.kind ?? "client") === "client"), [allCustomers]);
  const artists = useMemo(() => allCustomers.filter((c) => c.kind === "artist"), [allCustomers]);
  const bookings = useStore((s) => s.bookings);
  const addCustomer = useStore((s) => s.addCustomer);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const addBooking = useStore((s) => s.addBooking);

  const [bookingSource, setBookingSource] = useState<"direct" | "artist">("direct");
  const [artistId, setArtistId] = useState<string>("");
  const [artistSearch, setArtistSearch] = useState("");
  const [showArtistSearch, setShowArtistSearch] = useState(false);
  const [showCustomerForArtist, setShowCustomerForArtist] = useState(false);

  const [service, setService] = useState<ServiceType>("prepleat");
  const [customerId, setCustomerId] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [nameFocus, setNameFocus] = useState(false);
  const [showExisting, setShowExisting] = useState(false);
  const [showAddress, setShowAddress] = useState(false);

  const [sareeCount, setSareeCount] = useState(1);
  const defaultPrice = bookingSource === "artist"
    ? (service === "prepleat" ? settings.artistPrepleatPrice ?? settings.prepleatPrice : settings.artistDrapePrice ?? settings.drapePrice)
    : (service === "prepleat" ? settings.prepleatPrice : settings.drapePrice);
  const lastPrice = customerId ? lastPriceFor(customerId, service, bookings) : undefined;
  const lastArtistPrice = artistId
    ? bookings.find((b) => b.artistId === artistId && b.service === service)?.pricePerSaree
    : undefined;
  const quotedLastPrice = bookingSource === "artist" ? lastArtistPrice : lastPrice;
  const [pricePerSaree, setPricePerSaree] = useState<number>(defaultPrice);
  const [priceTouched, setPriceTouched] = useState(false);
  const effPrice = priceTouched ? pricePerSaree : (quotedLastPrice ?? defaultPrice);
  const total = sareeCount * effPrice;

  const today = format(new Date(), "yyyy-MM-dd");
  const [deliveryDate, setDeliveryDate] = useState(presetDate || today);
  const [deliveryTime, setDeliveryTime] = useState(roundUpToQuarter());
  // Hidden native pickers, opened on double-tap of the swipeable picker.
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const openNative = (el: HTMLInputElement | null) => {
    if (!el) return;
    // showPicker is the modern API; fall back to focus/click for older browsers.
    const anyEl = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof anyEl.showPicker === "function") {
      try { anyEl.showPicker(); return; } catch { /* fall through */ }
    }
    el.focus(); el.click();
  };

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
    return customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [customers, newName]);

  const phoneSuggestions = useMemo(() => {
    const q = newPhone.replace(/\D/g, "");
    if (q.length < 3) return [] as typeof customers;
    return customers.filter((c) => c.phone.replace(/\D/g, "").includes(q)).slice(0, 6);
  }, [customers, newPhone]);

  // Full list shown when user taps "Existing" without typing a query.
  const existingList = useMemo(
    () => [...customers].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 50),
    [customers],
  );

  const selectedCust = customers.find((c) => c.id === customerId);

  const pickCustomer = (c: typeof customers[number]) => {
    setCustomerId(c.id);
    setNewName(""); setNewPhone(""); setNewAddress("");
    setNameFocus(false);
  };

  const [reviewOpen, setReviewOpen] = useState(false);

  const openReview = () => {
    if (bookingSource === "artist" && !artistId) return toast.error("Select or add an artist");
    const customerRequired = bookingSource === "direct" || showCustomerForArtist;
    if (customerRequired && !customerId) {
      if (!newName.trim()) return toast.error("Customer name required");
      if (!isValidIndianMobile(newPhone)) return toast.error("Enter a valid 10-digit Indian mobile");
    }
    if (!sareeCount || sareeCount < 1) return toast.error("Saree count required");
    if (!deliveryDate || !deliveryTime) return toast.error("Delivery date & time required");
    if (advNum > total) return toast.error("Advance cannot exceed total");
    setReviewOpen(true);
  };

  const confirmSave = () => {
    let cid = customerId;
    const customerRequired = bookingSource === "direct" || showCustomerForArtist;
    if (!cid) {
      if (customerRequired && newName.trim()) {
        // Dedupe: if a client already exists with the same 10-digit phone, reuse them.
        const phoneDigits = newPhone.replace(/\D/g, "");
        const existingByPhone = phoneDigits.length === 10
          ? customers.find((c) => c.phone.replace(/\D/g, "").endsWith(phoneDigits))
          : undefined;
        const nameKey = newName.trim().toLowerCase();
        const existingByName = !existingByPhone
          ? customers.find((c) => c.name.trim().toLowerCase() === nameKey)
          : undefined;
        const existing = existingByPhone ?? existingByName;
        if (existing) {
          cid = existing.id;
          if (newAddress.trim() && !existing.address) {
            updateCustomer(existing.id, { address: newAddress.trim() });
          }
        } else {
          const c = addCustomer({ kind: "client", name: newName.trim(), phone: "+91" + newPhone, address: newAddress.trim() || undefined });
          cid = c.id;
        }
      } else if (bookingSource === "artist" && artistId) {
        // No customer captured — record the booking under the artist.
        cid = artistId;
      }
    } else if (newAddress.trim() && selectedCust && !selectedCust.address) {
      updateCustomer(cid, { address: newAddress.trim() });
    }
    if (!cid) return toast.error("Customer required");

    const b = addBooking({
      customerId: cid,
      artistId: artistId || undefined,
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

      {/* Booking source — always decide this first because pricing differs. */}
      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Booking for</p>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: "direct" as const, label: "Direct Client", icon: User },
            { id: "artist" as const, label: "Via Artist", icon: Palette },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => { setBookingSource(id); setPriceTouched(false); if (id === "direct") setArtistId(""); }}
              className={cn(
                "rounded-2xl px-3 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition",
                bookingSource === id ? "saree-gradient text-primary-foreground" : "bg-secondary text-foreground",
              )}
            ><Icon className="size-4" />{label}</button>
          ))}
        </div>
        {bookingSource === "artist" && (
          <div className="mt-3 pt-3 border-t border-border">
            {artists.length > 0 && (() => {
              const compact = artists.length > 5;
              const ql = artistSearch.toLowerCase().trim();
              const visible = compact
                ? (showArtistSearch
                    ? artists.filter((a) => !ql || a.name.toLowerCase().includes(ql)).slice(0, 12)
                    : artists.slice(0, 4))
                : artists;
              const selected = artists.find((a) => a.id === artistId);
              const selectedHidden = selected && !visible.some((a) => a.id === selected.id);
              return (
                <div className="mb-2">
                  <div className="flex gap-2 items-center overflow-x-auto no-scrollbar -mx-1 px-1">
                    {selectedHidden && (
                      <button type="button" onClick={() => { setArtistId(selected!.id); setPriceTouched(false); }}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-primary text-primary-foreground">
                        {selected!.name}
                      </button>
                    )}
                    {visible.map((a) => (
                      <button key={a.id} type="button" onClick={() => { setArtistId(a.id); setPriceTouched(false); }}
                        className={cn("px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0", artistId === a.id ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                        {a.name}
                      </button>
                    ))}
                    {compact && (
                      <button type="button" onClick={() => { setShowArtistSearch((v) => !v); if (showArtistSearch) setArtistSearch(""); }}
                        aria-label="Search artists"
                        className={cn("size-7 shrink-0 rounded-full flex items-center justify-center", showArtistSearch ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                        <Search className="size-3.5" />
                      </button>
                    )}
                  </div>
                  {compact && showArtistSearch && (
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <input
                        autoFocus
                        value={artistSearch}
                        onChange={(e) => setArtistSearch(e.target.value)}
                        placeholder={`Search ${artists.length} artists`}
                        className="w-full bg-secondary rounded-full pl-8 pr-8 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {artistSearch && (
                        <button type="button" onClick={() => setArtistSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 size-5 rounded-full bg-background/60 flex items-center justify-center">
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
            <AddArtistInline onAdd={(name) => {
              const c = addCustomer({ kind: "artist", name: name.trim(), phone: "" });
              setArtistId(c.id); setPriceTouched(false); toast.success(`Artist “${c.name}” added`);
            }} />
          </div>
        )}
      </section>

      {/* Service toggle */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(["prepleat", "drape"] as ServiceType[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setService(s); setPriceTouched(false);
              setPricePerSaree(bookingSource === "artist"
                ? (s === "prepleat" ? settings.artistPrepleatPrice ?? settings.prepleatPrice : settings.artistDrapePrice ?? settings.drapePrice)
                : (s === "prepleat" ? settings.prepleatPrice : settings.drapePrice));
            }}
            className={cn(
              "py-4 rounded-2xl font-semibold uppercase tracking-wider text-sm transition card-shadow",
              service === s ? "saree-gradient text-primary-foreground" : "bg-card text-foreground",
            )}
          >{s === "prepleat"
            ? `PrePleat · ₹${bookingSource === "artist" ? settings.artistPrepleatPrice ?? settings.prepleatPrice : settings.prepleatPrice}`
            : `Drape · ₹${bookingSource === "artist" ? settings.artistDrapePrice ?? settings.drapePrice : settings.drapePrice}`}</button>
        ))}
      </div>

      {/* Customer — hidden by default when booking via artist (often unknown). */}
      {bookingSource === "artist" && !showCustomerForArtist && !selectedCust ? (
        <button type="button" onClick={() => setShowCustomerForArtist(true)}
          className="w-full mb-3 py-2.5 rounded-2xl bg-card card-shadow text-xs font-semibold text-muted-foreground hover:text-primary flex items-center justify-center gap-1.5">
          <Plus className="size-3.5" /> Add customer details <span className="font-normal">(optional)</span>
        </button>
      ) : (
      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer{bookingSource === "artist" && <span className="ml-1 text-[10px] normal-case font-normal text-muted-foreground">(optional)</span>}</p>
          <div className="flex items-center gap-1.5">
            {!selectedCust && (
              <button type="button" onClick={() => setShowExisting((v) => !v)} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-primary">
                <Users className="size-3" /> Existing
              </button>
            )}
            {bookingSource === "artist" && (
              <button type="button" onClick={() => { setShowCustomerForArtist(false); setCustomerId(""); setNewName(""); setNewPhone(""); setNewAddress(""); }}
                className="text-[10px] text-muted-foreground px-2 py-1">Hide</button>
            )}
          </div>
        </div>
        {selectedCust ? (
          <div>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-semibold truncate">{selectedCust.name}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedCust.phone}</p>
                {selectedCust.address && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{selectedCust.address}</p>}
                {quotedLastPrice && <p className="text-xs text-gold mt-1">Last {service}: {fmtINR(quotedLastPrice)}</p>}
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
                onFocus={() => { setNameFocus(true); if (showExisting) setShowExisting(true); }}
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
              {showExisting && !newName.trim() && existingList.length > 0 && (
                <ul className="absolute z-30 left-0 right-0 mt-1 bg-popover border border-border rounded-2xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                  {existingList.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); pickCustomer(c); setShowExisting(false); }}
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
            <div>
              <div className="relative flex items-stretch bg-secondary rounded-full overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <span className="px-3 flex items-center text-sm font-semibold text-muted-foreground border-r border-border bg-background/40">+91</span>
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(sanitizeIndianPhone(e.target.value))}
                  onPaste={(e) => {
                    e.preventDefault();
                    const txt = e.clipboardData.getData("text");
                    setNewPhone(sanitizeIndianPhone(txt));
                  }}
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                  maxLength={10}
                  className="flex-1 min-w-0 bg-transparent pl-3 pr-3 py-2.5 text-sm tabular-nums focus:outline-none"
                />
              </div>
              {newPhone.length > 0 && !isValidIndianMobile(newPhone) && (
                <p className="text-[11px] text-destructive mt-1 ml-3">Enter a valid 10-digit number (starting 6–9)</p>
              )}
              {phoneSuggestions.length > 0 && !customerId && (
                <ul className="relative z-30 mt-1 bg-popover border border-border rounded-2xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
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
            {!showAddress ? (
              <button type="button" onClick={() => setShowAddress(true)} className="inline-flex items-center gap-1.5 px-1 py-1 text-xs font-semibold text-muted-foreground">
                <Plus className="size-3.5" /> Add address <span className="font-normal">(optional)</span>
              </button>
            ) : (
              <div className="relative">
                <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <textarea value={newAddress} onChange={(e) => setNewAddress(e.target.value)} rows={2} autoFocus placeholder="Address (optional)"
                  className="w-full bg-secondary rounded-2xl pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                <button type="button" onClick={() => { setShowAddress(false); setNewAddress(""); }} className="absolute right-3 top-2.5 text-muted-foreground">×</button>
              </div>
            )}
          </div>
        )}
      </section>
      )}

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
        {quotedLastPrice && (
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Last charged</span><span className="font-semibold text-gold">{fmtINR(quotedLastPrice)} / saree</span>
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-border flex justify-between items-baseline">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-2xl font-display font-bold text-primary">{fmtINR(total)}</span>
        </div>
      </section>

      {/* Delivery */}
      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Delivery</p>
        <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          <CalendarDays className="size-3.5 text-primary/70" />
          <span>Date · swipe ← →</span>
        </div>
        <HorizontalPicker
          itemWidth={72}
          value={deliveryDate}
          onChange={setDeliveryDate}
          onDoubleTap={() => openNative(dateInputRef.current)}
          items={(() => {
            const base = new Date(); base.setHours(0, 0, 0, 0);
            const start = addDays(base, -7);
            return Array.from({ length: 90 }, (_, i) => {
              const d = addDays(start, i);
              const key = format(d, "yyyy-MM-dd");
              return {
                key,
                primary: format(d, "d"),
                secondary: format(d, "EEE"),
              };
            });
          })()}
        />
        <div className="mt-3">
          <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            <Clock className="size-3.5 text-primary/70" />
            <span>Time · 15-min · double-tap for clock</span>
          </div>
          <HorizontalPicker
            itemWidth={86}
            value={deliveryTime}
            onChange={setDeliveryTime}
            onDoubleTap={() => openNative(timeInputRef.current)}
            items={Array.from({ length: 24 * 4 }, (_, i) => {
              const h = Math.floor(i / 4);
              const m = (i % 4) * 15;
              const key = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
              const hr12 = ((h + 11) % 12) + 1;
              const ampm = h < 12 ? "AM" : "PM";
              return { key, primary: `${hr12}:${String(m).padStart(2, "0")}`, secondary: ampm };
            })}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 text-center tabular-nums">
          {format(parseISO(deliveryDate), "EEE, MMM d")} · {fmtTime12(deliveryTime)}
        </p>
        {/* Hidden native pickers — opacity 0 (NOT sr-only) so iOS Safari
            allows showPicker() to surface the calendar / clock UI. */}
        <input
          ref={dateInputRef}
          type="date"
          value={deliveryDate}
          onChange={(e) => e.target.value && setDeliveryDate(e.target.value)}
          className="absolute opacity-0 pointer-events-none w-px h-px"
          aria-hidden
        />
        <input
          ref={timeInputRef}
          type="time"
          step={900}
          value={deliveryTime}
          onChange={(e) => e.target.value && setDeliveryTime(e.target.value)}
          className="absolute opacity-0 pointer-events-none w-px h-px"
          aria-hidden
        />
        <p className="text-[10px] text-muted-foreground/70 mt-1 text-center">Tip · double-tap date or time for calendar / clock picker</p>
        {(() => {
          const same = bookingsOnDate(new Date(deliveryDate).toISOString(), bookings);
          if (same.length === 0) return null;
          const totalSarees = same.reduce((s, b) => s + b.sareeCount, 0);
          return (
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-gold/10 px-3 py-2 text-[11px]">
              <AlertTriangle className="size-3.5 text-gold shrink-0 mt-0.5" />
              <span className="text-foreground/80">
                <span className="font-semibold text-gold">{same.length} booking{same.length > 1 ? "s" : ""}</span> already on this date · {totalSarees} saree{totalSarees > 1 ? "s" : ""}. Sure?
              </span>
            </div>
          );
        })()}
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

      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span>📐</span>Measurements
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={showMeasure}
            onClick={() => setShowMeasure(!showMeasure)}
            className={cn(
              "relative inline-flex h-7 w-12 items-center rounded-full transition",
              showMeasure ? "saree-gradient" : "bg-secondary",
            )}
          >
            <span
              className={cn(
                "inline-block size-5 rounded-full bg-card shadow transition-transform",
                showMeasure ? "translate-x-6" : "translate-x-1",
              )}
            />
            <span className="sr-only">Toggle measurements</span>
          </button>
        </div>
        {showMeasure ? (
          <>
            <div className="flex justify-around items-start py-3 gap-2 flex-wrap mt-2 border-t border-border">
              {measurements.map((m, i) => (
                <ScrollNumber
                  key={i}
                  label={m.label}
                  value={m.value}
                  onChange={(v) => setMeasurements(measurements.map((x, j) => i === j ? { ...x, value: v } : x))}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">Scroll inside each picker · all in inches</p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">Turn on to record blouse measurements for this customer.</p>
        )}
      </section>

      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
        {(settings.occasionPresets ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(settings.occasionPresets ?? []).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  const current = notes.trim();
                  if (current.toLowerCase().includes(preset.toLowerCase())) return;
                  setNotes(current ? `${current} · ${preset}` : preset);
                }}
                className="px-2.5 py-1 rounded-full bg-secondary text-[11px] font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
              >+ {preset}</button>
            ))}
          </div>
        )}
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
            <ReviewRow label="Delivery" value={`${format(new Date(deliveryDate), "EEE, MMM d")} · ${fmtTime12(deliveryTime)}`} />
            {artistId && <ReviewRow label="Artist" value={artists.find((a) => a.id === artistId)?.name ?? ""} />}
            <ReviewRow label="Total" value={fmtINR(total)} bold />
            <ReviewRow label="Advance" value={fmtINR(advNum)} />
            <ReviewRow label="Remaining" value={fmtINR(remaining)} />
            {showMeasure && measurements.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Measurements (inch)</p>
                <div className="flex gap-3 flex-wrap">
                  {measurements.map((m) => (
                    <span key={m.label} className="text-xs"><span className="text-muted-foreground">{m.label}</span> <span className="font-bold tabular-nums">{m.value}″</span></span>
                  ))}
                </div>
              </div>
            )}

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

function AddArtistInline({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-2 rounded-full border border-dashed border-border text-[12px] font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition flex items-center justify-center gap-1.5"
      >
        <Plus className="size-3.5" /> Add artist
      </button>
    );
  }
  const submit = () => {
    if (!name.trim()) return toast.error("Artist name required");
    onAdd(name);
    setName(""); setOpen(false);
  };
  return (
    <div className="flex gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        placeholder="Artist name"
        className="flex-1 min-w-0 bg-secondary rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button type="button" onClick={submit} className="px-4 rounded-full saree-gradient text-primary-foreground text-xs font-semibold">Add</button>
      <button type="button" onClick={() => { setOpen(false); setName(""); }} className="px-3 rounded-full bg-secondary text-xs font-semibold">×</button>
    </div>
  );
}
