import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  useStore,
  lastPriceFor,
  fmtINR,
  fmtTime12,
  bookingsOnDate,
  type ServiceType,
  type Measurement,
  formatAppDate,
} from "@/lib/store";
import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  IndianRupee,
  User,
  MapPin,
  Plus,
  Minus,
  AlertTriangle,
  Palette,
  CalendarDays,
  Clock,
  Users,
  Search,
  X,
  Phone,
  Clipboard,
  Map,
} from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { ScrollNumber } from "@/components/ScrollNumber";
import { HorizontalPicker } from "@/components/HorizontalPicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { MapPicker } from "@/components/MapPicker";

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
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    date?: string;
    customerId?: string;
    artistId?: string;
  } => ({
    date: typeof s.date === "string" ? s.date : undefined,
    customerId: typeof s.customerId === "string" ? s.customerId : undefined,
    artistId: typeof s.artistId === "string" ? s.artistId : undefined,
  }),
  head: () => ({ meta: [{ title: "New Booking — Eyas Saree Drapist" }] }),
  component: NewBooking,
});

function NewBooking() {
  const navigate = useNavigate();
  const {
    date: presetDate,
    customerId: presetCustomerId,
    artistId: presetArtistId,
  } = Route.useSearch();
  const settings = useStore((s) => s.settings);
  const allCustomers = useStore((s) => s.customers);
  const customers = useMemo(
    () => allCustomers.filter((c) => (c.kind ?? "client") === "client"),
    [allCustomers],
  );
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
  const [newLocationUrl, setNewLocationUrl] = useState("");
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [nameFocus, setNameFocus] = useState(false);
  const [showExisting, setShowExisting] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  const [sareeCount, setSareeCount] = useState(1);
  const defaultPrice =
    bookingSource === "artist"
      ? service === "prepleat"
        ? (settings.artistPrepleatPrice ?? settings.prepleatPrice)
        : (settings.artistDrapePrice ?? settings.drapePrice)
      : service === "prepleat"
        ? settings.prepleatPrice
        : settings.drapePrice;
  const lastPrice = customerId ? lastPriceFor(customerId, service, bookings) : undefined;
  const lastArtistPrice = artistId
    ? bookings.find((b) => b.artistId === artistId && b.service === service)?.pricePerSaree
    : undefined;
  const quotedLastPrice = bookingSource === "artist" ? lastArtistPrice : lastPrice;
  const [pricePerSaree, setPricePerSaree] = useState<number>(defaultPrice);
  const [priceTouched, setPriceTouched] = useState(false);
  const effPrice = priceTouched ? pricePerSaree : (quotedLastPrice ?? defaultPrice);
  
  const [manualTotal, setManualTotal] = useState<number | null>(null);
  const total = manualTotal !== null ? manualTotal : sareeCount * effPrice;

  const today = format(new Date(), "yyyy-MM-dd");
  const [deliveryDate, setDeliveryDate] = useState(presetDate || today);
  const [deliveryTime, setDeliveryTime] = useState(roundUpToQuarter());
  // Popover open state for tap-once calendar / clock pickers (works on iOS & Android).
  const [dateOpen, setDateOpen] = useState(false);
  const timeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (presetDate) setDeliveryDate(presetDate);
  }, [presetDate]);

  const [advance, setAdvance] = useState("");
  const advNum = Number(advance) || 0;
  const remaining = Math.max(0, total - advNum);

  const [notes, setNotes] = useState("");
  const [showMeasure, setShowMeasure] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>(settings.defaultMeasurements);

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

  // Keep measurements in sync if settings change (e.g. user updates default labels live)
  useEffect(() => {
    setMeasurements(settings.defaultMeasurements);
  }, [settings.defaultMeasurements]);

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

  const pickCustomer = (c: (typeof customers)[number]) => {
    setCustomerId(c.id);
    setNewName("");
    setNewPhone("");
    setNewAddress("");
    setNewLocationUrl("");
    setNameFocus(false);

    if (c.measurements && c.measurements.length > 0) {
      setMeasurements(c.measurements);
      setShowMeasure(true);
    } else {
      // Auto-load measurements from their last booking if available
      const custBookings = bookings.filter((b) => b.customerId === c.id);
      if (custBookings.length > 0) {
        const lastBooking = [...custBookings].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        )[0];
        if (lastBooking.measurements && lastBooking.measurements.length > 0) {
          setMeasurements(lastBooking.measurements);
          setShowMeasure(true);
        } else {
          setMeasurements(settings.defaultMeasurements);
          setShowMeasure(false);
        }
      } else {
        setMeasurements(settings.defaultMeasurements);
        setShowMeasure(false);
      }
    }
  };

  // Pre-load customer if search param customerId is provided
  useEffect(() => {
    if (presetCustomerId && customers.length > 0) {
      const cust = customers.find((c) => c.id === presetCustomerId);
      if (cust) {
        pickCustomer(cust);
      }
    }
  }, [presetCustomerId, customers]);

  // Pre-load artist if search param artistId is provided
  useEffect(() => {
    if (presetArtistId && artists.length > 0) {
      const art = artists.find((a) => a.id === presetArtistId);
      if (art) {
        setBookingSource("artist");
        setArtistId(art.id);
      }
    }
  }, [presetArtistId, artists]);

  const handlePasteClick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setNewPhone(sanitizeIndianPhone(text));
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Could not read clipboard. Please paste manually.");
    }
  };

  const [reviewOpen, setReviewOpen] = useState(false);

  const openReview = () => {
    if (bookingSource === "artist" && !artistId) return toast.error("Select or add an artist");
    // Customer name/mobile only mandatory for direct bookings. For artist-via bookings they are optional.
    if (bookingSource === "direct" && !customerId) {
      if (!newName.trim()) return toast.error("Customer name required");
      if (newPhone.trim() && !isValidIndianMobile(newPhone))
        return toast.error("Enter a valid 10-digit Indian mobile");
    }
    if (
      bookingSource === "artist" &&
      showCustomerForArtist &&
      !customerId &&
      newPhone.trim() &&
      !isValidIndianMobile(newPhone)
    ) {
      return toast.error("Enter a valid 10-digit Indian mobile");
    }
    if (!sareeCount || sareeCount < 1) return toast.error("Saree count required");
    if (!deliveryDate || !deliveryTime) return toast.error("Delivery date & time required");
    if (advNum > total) return toast.error("Advance cannot exceed total");
    setReviewOpen(true);
  };

  const confirmSave = () => {
    let cid = customerId;

    if (!cid) {
      const hasNameOrPhone = newName.trim() || newPhone.trim();
      if (hasNameOrPhone) {
        // Dedupe: if a client already exists with the same 10-digit phone, reuse them.
        const phoneDigits = newPhone.replace(/\D/g, "");
        const existingByPhone =
          phoneDigits.length === 10
            ? customers.find((c) => c.phone.replace(/\D/g, "").endsWith(phoneDigits))
            : undefined;
        const nameKey = newName.trim().toLowerCase();
        const existingByName =
          !existingByPhone && nameKey
            ? customers.find((c) => c.name.trim().toLowerCase() === nameKey)
            : undefined;
        const existing = existingByPhone ?? existingByName;
        if (existing) {
          cid = existing.id;
          const updates: Partial<typeof existing> = {};
          if (newAddress.trim() && !existing.address) updates.address = newAddress.trim();
          if (newLocationUrl.trim() && !existing.locationUrl) updates.locationUrl = newLocationUrl.trim();
          if (Object.keys(updates).length > 0) updateCustomer(existing.id, updates);
        } else {
          const c = addCustomer({
            kind: "client",
            name: newName.trim() || "Walk-in",
            phone: phoneDigits.length === 10 ? "+91" + newPhone : newPhone.trim(),
            address: newAddress.trim() || undefined,
            locationUrl: newLocationUrl.trim() || undefined,
          });
          cid = c.id;
        }
      } else if (bookingSource === "artist" && artistId) {
        // No customer captured — record the booking under the artist.
        cid = artistId;
      }
    } else if (selectedCust) {
      const updates: Partial<typeof selectedCust> = {};
      const newPhoneVal = newPhone.length === 10 ? "+91" + newPhone : newPhone.trim();
      if (newName.trim() && newName !== selectedCust.name) updates.name = newName.trim();
      if (newPhoneVal && newPhoneVal !== selectedCust.phone) updates.phone = newPhoneVal;
      if (newAddress.trim() !== (selectedCust.address || "")) updates.address = newAddress.trim();
      if (newLocationUrl.trim() !== (selectedCust.locationUrl || "")) updates.locationUrl = newLocationUrl.trim();
      if (Object.keys(updates).length > 0) updateCustomer(cid, updates);
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
      deliveryDate: new Date(deliveryDate + "T12:00:00").toISOString(),
      deliveryTime,
      notes: notes.trim() || undefined,
      measurements: showMeasure ? measurements : undefined,
    });
    if (advNum > 0) {
      useStore.getState().addPayment({
        bookingId: b.id,
        customerId: cid,
        amount: advNum,
        date: new Date().toISOString(),
        note: "Advance",
      });
    }
    toast.success("Booking created");
    navigate({ to: "/bookings/$id", params: { id: b.id } });
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between pt-4 pb-3">
        <button
          onClick={() => navigate({ to: "/" })}
          className="size-10 rounded-full bg-secondary flex items-center justify-center"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-lg font-display font-semibold">New Booking</h1>
        <div className="size-10" />
      </div>

      {/* Booking source — always decide this first because pricing differs. */}
      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Booking for
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { id: "direct" as const, label: "Direct Client", icon: User },
            { id: "artist" as const, label: "Via Artist", icon: Palette },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setBookingSource(id);
                setPriceTouched(false);
                if (id === "direct") setArtistId("");
              }}
              className={cn(
                "rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-150 active:scale-95 border border-border/40",
                bookingSource === id
                  ? "saree-gradient text-primary-foreground border-transparent shadow-sm shadow-primary/20"
                  : "bg-secondary/40 text-foreground hover:bg-secondary/60",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
        {bookingSource === "artist" && (
          <div className="mt-3 pt-3 border-t border-border">
            {artists.length > 0 &&
              (() => {
                const compact = artists.length > 5;
                const ql = artistSearch.toLowerCase().trim();
                const visible = compact
                  ? showArtistSearch
                    ? artists.filter((a) => !ql || a.name.toLowerCase().includes(ql)).slice(0, 12)
                    : artists.slice(0, 4)
                  : artists;
                const selected = artists.find((a) => a.id === artistId);
                const selectedHidden = selected && !visible.some((a) => a.id === selected.id);
                return (
                  <div className="mb-2">
                    <div className="flex gap-2 items-center overflow-x-auto no-scrollbar -mx-1 px-1">
                      {selectedHidden && (
                        <button
                          type="button"
                          onClick={() => {
                            setArtistId(selected!.id);
                            setPriceTouched(false);
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-primary text-primary-foreground"
                        >
                          {selected!.name}
                        </button>
                      )}
                      {visible.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setArtistId(a.id);
                            setPriceTouched(false);
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0",
                            artistId === a.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary",
                          )}
                        >
                          {a.name}
                        </button>
                      ))}
                      {compact && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowArtistSearch((v) => !v);
                            if (showArtistSearch) setArtistSearch("");
                          }}
                          aria-label="Search artists"
                          className={cn(
                            "size-7 shrink-0 rounded-full flex items-center justify-center",
                            showArtistSearch
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground",
                          )}
                        >
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
                          <button
                            type="button"
                            onClick={() => setArtistSearch("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 size-5 rounded-full bg-background/60 flex items-center justify-center"
                          >
                            <X className="size-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            <AddArtistInline
              onAdd={(name) => {
                const c = addCustomer({ kind: "artist", name: name.trim(), phone: "" });
                setArtistId(c.id);
                setPriceTouched(false);
                toast.success(`Artist “${c.name}” added`);
              }}
            />
          </div>
        )}
      </section>

      {/* Service toggle */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {(["prepleat", "drape"] as ServiceType[]).map((s) => {
          const active = service === s;
          const price =
            bookingSource === "artist"
              ? s === "prepleat"
                ? (settings.artistPrepleatPrice ?? settings.prepleatPrice)
                : (settings.artistDrapePrice ?? settings.drapePrice)
              : s === "prepleat"
                ? settings.prepleatPrice
                : settings.drapePrice;
          return (
            <button
              key={s}
              type="button"
              onClick={() => {
                setService(s);
                setPriceTouched(false);
                setPricePerSaree(price);
              }}
              className={cn(
                "py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-150 flex items-center justify-center gap-1.5 active:scale-95 card-shadow border border-border/40",
                active
                  ? "saree-gradient text-primary-foreground border-transparent shadow-sm shadow-primary/20"
                  : "bg-card text-foreground hover:bg-secondary/20",
              )}
            >
              {active && <Check className="size-3.5 stroke-[3]" />}
              <span>
                {s === "prepleat" ? "PrePleat" : "Drape"} · ₹{price}
              </span>
            </button>
          );
        })}
      </div>

      {/* Customer — hidden by default when booking via artist (often unknown). */}
      {bookingSource === "artist" && !showCustomerForArtist && !selectedCust ? (
        <button
          type="button"
          onClick={() => setShowCustomerForArtist(true)}
          className="w-full mb-3 py-2.5 rounded-2xl bg-card card-shadow text-xs font-semibold text-muted-foreground hover:text-primary flex items-center justify-center gap-1.5"
        >
          <Plus className="size-3.5" /> Add customer details{" "}
          <span className="font-normal">(optional)</span>
        </button>
      ) : (
        <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Customer
              {bookingSource === "artist" ? (
                <span className="ml-1 text-[10px] normal-case font-normal text-muted-foreground">
                  (optional)
                </span>
              ) : (
                !selectedCust && (
                  <span className="ml-2 text-[10px] normal-case font-normal text-muted-foreground/80">
                    (Mobile & Address are optional)
                  </span>
                )
              )}
            </p>
            <div className="flex items-center gap-1.5">
              {!selectedCust && (
                <button
                  type="button"
                  onClick={() => setShowExisting((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-primary"
                >
                  <Users className="size-3" /> Existing
                </button>
              )}
              {bookingSource === "artist" && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerForArtist(false);
                    setCustomerId("");
                    setNewName("");
                    setNewPhone("");
                    setNewAddress("");
                    setMeasurements(settings.defaultMeasurements);
                    setShowMeasure(false);
                  }}
                  className="text-[10px] text-muted-foreground px-2 py-1"
                >
                  Hide
                </button>
              )}
            </div>
          </div>
          {customerId && selectedCust ? (
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{selectedCust.name}</p>
                  <div className="mt-3">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                        +91
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={newPhone}
                        onChange={(e) => setNewPhone(sanitizeIndianPhone(e.target.value))}
                        placeholder="Mobile number"
                        className="w-full bg-secondary rounded-2xl pl-[4.5rem] pr-3 py-3 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  {quotedLastPrice && (
                    <p className="text-xs text-gold mt-2">
                      Last {service}: {fmtINR(quotedLastPrice)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setCustomerId("");
                    setMeasurements(settings.defaultMeasurements);
                    setShowMeasure(false);
                  }}
                  className="text-xs text-primary font-semibold shrink-0"
                >
                  Change
                </button>
              </div>
              <div className="space-y-2 mt-4">
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <textarea
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    rows={2}
                    placeholder="Add/Edit address"
                    className="w-full bg-secondary rounded-2xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={newLocationUrl}
                    onChange={(e) => setNewLocationUrl(e.target.value)}
                    placeholder="Paste Maps URL"
                    className="flex-1 bg-secondary rounded-2xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button type="button" onClick={() => setShowMapPicker(true)} className="p-2 bg-secondary text-primary rounded-full hover:bg-secondary/80">
                    <Map className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onFocus={() => {
                    setNameFocus(true);
                    if (showExisting) setShowExisting(true);
                  }}
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
                          onMouseDown={(e) => {
                            e.preventDefault();
                            pickCustomer(c);
                          }}
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
                          onMouseDown={(e) => {
                            e.preventDefault();
                            pickCustomer(c);
                            setShowExisting(false);
                          }}
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
              {showPhone && (
                <div>
                  <div className="relative flex items-stretch bg-secondary rounded-full overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                    <span className="px-3 flex items-center text-sm font-semibold text-muted-foreground border-r border-border bg-background/40">
                      +91
                    </span>
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
                      className="flex-1 min-w-0 bg-transparent pl-3 pr-16 py-2.5 text-sm tabular-nums focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handlePasteClick}
                      className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                      title="Paste from clipboard"
                    >
                      <Clipboard className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPhone(false);
                        setNewPhone("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm font-bold p-1"
                      aria-label="Remove mobile number"
                    >
                      ×
                    </button>
                  </div>
                  {newPhone.length > 0 && !isValidIndianMobile(newPhone) && (
                    <p className="text-[11px] text-destructive mt-1 ml-3">
                      Enter a valid 10-digit number (starting 6–9)
                    </p>
                  )}
                  {phoneSuggestions.length > 0 && !customerId && (
                    <ul className="relative z-30 mt-1 bg-popover border border-border rounded-2xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                      {phoneSuggestions.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              pickCustomer(c);
                            }}
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
              )}
              {showAddress && (
                <div className="space-y-2">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <textarea
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      rows={2}
                      autoFocus
                      placeholder="Address"
                      className="w-full bg-secondary rounded-2xl pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddress(false);
                        setNewAddress("");
                        setNewLocationUrl("");
                      }}
                      className="absolute right-3 top-2.5 text-muted-foreground"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={newLocationUrl}
                      onChange={(e) => setNewLocationUrl(e.target.value)}
                      placeholder="Paste Maps URL"
                      className="flex-1 bg-secondary rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button type="button" onClick={() => setShowMapPicker(true)} className="p-2 bg-secondary text-primary rounded-full hover:bg-secondary/80">
                      <Map className="size-4" />
                    </button>
                  </div>
                </div>
              )}
              {(!showPhone || !showAddress) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {!showPhone && (
                    <button
                      type="button"
                      onClick={() => setShowPhone(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-150"
                    >
                      <Phone className="size-3.5" /> Add Mobile
                    </button>
                  )}
                  {!showAddress && (
                    <button
                      type="button"
                      onClick={() => setShowAddress(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-150"
                    >
                      <MapPin className="size-3.5" /> Add Address
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Order */}
      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Order
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Saree count</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSareeCount(Math.max(1, sareeCount - 1))}
              className="size-8 rounded-full bg-secondary flex items-center justify-center font-bold text-lg hover:bg-secondary/80 active:scale-90 transition-all duration-150"
            >
              −
            </button>
            <span className="w-8 text-center text-lg font-bold tabular-nums">{sareeCount}</span>
            <button
              type="button"
              onClick={() => setSareeCount(sareeCount + 1)}
              className="size-8 rounded-full bg-secondary flex items-center justify-center font-bold text-lg hover:bg-secondary/80 active:scale-90 transition-all duration-150"
            >
              +
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 mt-3.5">
          <span className="text-sm font-medium">Price / saree</span>
          <div className="flex items-center gap-1 bg-secondary rounded-full px-1 py-0.5">
            <button
              type="button"
              onClick={() => {
                setPriceTouched(true);
                setPricePerSaree(Math.max(0, effPrice - 50));
              }}
              className="size-7 rounded-full flex items-center justify-center hover:bg-background/40 active:scale-90 transition-all duration-150"
            >
              <Minus className="size-3.5" />
            </button>
            <div className="relative w-20">
              <IndianRupee className="absolute left-1 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <input
                type="number"
                value={priceTouched ? pricePerSaree : effPrice}
                onChange={(e) => {
                  setPriceTouched(true);
                  setPricePerSaree(Number(e.target.value) || 0);
                }}
                className="w-full bg-transparent pl-5 pr-1 py-1 text-sm text-right font-semibold tabular-nums focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setPriceTouched(true);
                setPricePerSaree(effPrice + 50);
              }}
              className="size-7 rounded-full flex items-center justify-center hover:bg-background/40 active:scale-90 transition-all duration-150"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>
        {quotedLastPrice && (
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Last charged</span>
            <span className="font-semibold text-gold">{fmtINR(quotedLastPrice)} / saree</span>
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Amount</span>
          <div className="relative w-28">
            <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-primary" />
            <input
              type="number"
              value={manualTotal !== null ? manualTotal : (sareeCount * effPrice)}
              onChange={(e) => setManualTotal(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-secondary rounded-xl pl-7 pr-3 py-2 text-xl font-display font-bold text-primary text-right focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </section>

      {/* Delivery */}
      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Delivery
        </p>
        <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          <CalendarDays className="size-3.5 text-primary/70" />
          <span>Date · swipe ← → or tap 📅</span>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Open calendar"
                className="ml-1 size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-95"
              >
                <CalendarDays className="size-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={parseISO(deliveryDate)}
                onSelect={(d) => {
                  if (d) {
                    setDeliveryDate(format(d, "yyyy-MM-dd"));
                    setDateOpen(false);
                  }
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        <HorizontalPicker
          itemWidth={72}
          value={deliveryDate}
          onChange={setDeliveryDate}
          onDoubleTap={() => setDateOpen(true)}
          items={(() => {
            const base = new Date();
            base.setHours(0, 0, 0, 0);
            // Default window: 7 days before today → 82 days after.
            let start = addDays(base, -7);
            let end = addDays(base, 82);
            // Ensure the currently selected date is inside the strip so the
            // picker can centre on it (otherwise it would snap to today).
            const picked = parseISO(deliveryDate);
            if (picked < start) start = addDays(picked, -3);
            if (picked > end) end = addDays(picked, 30);
            const span = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
            return Array.from({ length: span }, (_, i) => {
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
            <span>Time · 15-min · tap 🕒</span>
            <button
              type="button"
              aria-label="Open time picker"
              onClick={() => {
                const el = timeInputRef.current;
                if (!el) return;
                // Native picker — if user cancels, nothing else is shown.
                // showPicker() works on modern Chrome/Safari/Firefox.
                try {
                  if (typeof el.showPicker === "function") el.showPicker();
                  else {
                    el.focus();
                    el.click();
                  }
                } catch {
                  el.focus();
                  el.click();
                }
              }}
              className="ml-1 size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-95"
            >
              <Clock className="size-3.5" />
            </button>
            <input
              ref={timeInputRef}
              type="time"
              step={900}
              value={deliveryTime}
              onChange={(e) => {
                if (e.target.value) setDeliveryTime(e.target.value);
              }}
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only pointer-events-none"
              style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
            />
          </div>

          <HorizontalPicker
            itemWidth={86}
            value={deliveryTime}
            onChange={setDeliveryTime}
            onDoubleTap={() => timeInputRef.current?.showPicker?.()}
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
          {formatAppDate(deliveryDate)} · {fmtTime12(deliveryTime)}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-1 text-center">
          Tip · tap the 📅 / 🕒 icon for a full picker
        </p>
        {(() => {
          const same = bookingsOnDate(new Date(deliveryDate + "T12:00:00").toISOString(), bookings);
          if (same.length === 0) return null;
          const totalSarees = same.reduce((s, b) => s + b.sareeCount, 0);
          return (
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-gold/10 px-3 py-2 text-[11px]">
              <AlertTriangle className="size-3.5 text-gold shrink-0 mt-0.5" />
              <span className="text-foreground/80">
                <span className="font-semibold text-gold">
                  {same.length} booking{same.length > 1 ? "s" : ""}
                </span>{" "}
                already on this date · {totalSarees} saree{totalSarees > 1 ? "s" : ""}. Sure?
              </span>
            </div>
          );
        })()}
      </section>

      {/* Advance */}
      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Advance
          </p>
          <p className="text-xs text-muted-foreground">
            Remaining <span className="font-semibold text-foreground">{fmtINR(remaining)}</span>
          </p>
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
        <div className="grid grid-cols-4 gap-2.5 mt-2.5">
          {[
            { label: "Clear", v: 0 },
            { label: "50%", v: Math.round(total / 2) },
            { label: "Full", v: total },
            { label: "+₹100", v: advNum + 100 },
          ].map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={() => setAdvance(String(b.v))}
              className="py-2 rounded-xl bg-secondary/50 border border-border/20 text-xs font-bold transition-all duration-150 active:scale-95 hover:bg-secondary"
            >
              {b.label}
            </button>
          ))}
        </div>
        {advNum > total && (
          <p className="text-xs text-destructive mt-2">Cannot exceed total {fmtINR(total)}</p>
        )}
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
              <div className="flex items-center gap-1.5 justify-center mt-1 border-t border-border/40 pt-3 max-w-[280px] mx-auto">
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
              <div className="flex items-center justify-center mt-1 border-t border-border/40 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddField(true)}
                  className="text-[11px] font-semibold text-primary flex items-center gap-1 hover:underline cursor-pointer active:scale-95"
                >
                  + Add Custom Field
                </button>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center mt-3">
              Scroll inside each picker · all in inches
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">
            Turn on to record body measurements for this customer.
          </p>
        )}
      </section>

      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Notes
        </p>
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
              >
                + {preset}
              </button>
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
        type="button"
        onClick={openReview}
        className="w-full saree-gradient text-primary-foreground py-3 rounded-xl font-bold uppercase tracking-wider text-xs mt-3.5 flex items-center justify-center gap-2 active:scale-98 transition shadow-md shadow-primary/25"
      >
        <Check className="size-4 stroke-[3]" /> Review & Save
      </button>

      {reviewOpen && (
        <div
          className="fixed inset-0 z-[20000] bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => setReviewOpen(false)}
        >
          <div
            className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="saree-gradient -mx-5 -mt-5 px-5 py-4 text-primary-foreground mb-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wider opacity-90 font-black">
                  Quick Review
                </span>
                <span className="text-[9px] uppercase tracking-wider opacity-90 font-black bg-white/20 px-2 py-0.5 rounded-full">
                  {bookingSource === "artist" ? "Artist" : "Direct"}
                </span>
              </div>
              <h4 className="text-lg font-display font-extrabold truncate mt-1.5 leading-tight">
                {bookingSource === "artist"
                  ? (artists.find((a) => a.id === artistId)?.name ?? "Artist")
                  : selectedCust?.name || newName || "Walk-in Customer"}
              </h4>
              {bookingSource === "artist" && (selectedCust?.name || newName) && (
                <p className="text-xs opacity-90 mt-0.5 truncate">
                  Client: <span className="font-bold">{selectedCust?.name || newName}</span>
                </p>
              )}
            </div>
            <ReviewRow label="Service" value={service === "prepleat" ? "PrePleat" : "Drape"} />
            <ReviewRow label="Customer" value={selectedCust?.name || newName} />
            <ReviewRow label="Sarees" value={`${sareeCount} × ${fmtINR(effPrice)}`} />
            <ReviewRow
              label="Delivery"
              value={`${formatAppDate(deliveryDate)} · ${fmtTime12(deliveryTime)}`}
            />
            {artistId && (
              <ReviewRow
                label="Artist"
                value={artists.find((a) => a.id === artistId)?.name ?? ""}
              />
            )}
            <ReviewRow label="Total" value={fmtINR(total)} bold />
            <ReviewRow label="Advance" value={fmtINR(advNum)} />
            <ReviewRow label="Remaining" value={fmtINR(remaining)} />
            {showMeasure && measurements.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Measurements (inch)
                </p>
                <div className="flex gap-3 flex-wrap">
                  {measurements.map((m) => (
                    <span key={m.label} className="text-xs">
                      <span className="text-muted-foreground">{m.label}</span>{" "}
                      <span className="font-bold tabular-nums">{m.value}″</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                className="py-2.5 rounded-xl bg-secondary text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-95"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setReviewOpen(false);
                  confirmSave();
                }}
                className="py-2.5 rounded-xl saree-gradient text-primary-foreground text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 shadow-sm shadow-primary/20"
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
      <MapPicker
        open={showMapPicker}
        onOpenChange={setShowMapPicker}
        onConfirm={(url) => setNewLocationUrl(url)}
      />
    </AppShell>
  );
}

function ReviewRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm tabular-nums", bold && "font-bold text-primary text-base")}>
        {value}
      </span>
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
    setName("");
    setOpen(false);
  };
  return (
    <div className="flex gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Artist name"
        className="flex-1 min-w-0 bg-secondary rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        type="button"
        onClick={submit}
        className="px-4 rounded-full saree-gradient text-primary-foreground text-xs font-semibold"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setName("");
        }}
        className="px-3 rounded-full bg-secondary text-xs font-semibold"
      >
        ×
      </button>
    </div>
  );
}
