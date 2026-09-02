import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  useStore,
  lastPriceFor,
  fmtINR,
  fmtTime12,
  bookingsOnDate,
  type ServiceType,
  type ServiceItem,
  type Measurement,
  formatAppDate,
  formatShortBillNumber,
} from "@/lib/store";
import { useState, useMemo, useEffect, useRef } from "react";
import { cn, cleanPhoneForWhatsApp } from "@/lib/utils";
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
  Car,
  MessageCircle,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Receipt,
} from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { ScrollNumber } from "@/components/ScrollNumber";
import { HorizontalPicker } from "@/components/HorizontalPicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { MapPicker } from "@/components/MapPicker";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TimePicker12 } from "@/components/TimePicker12";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

  const getServiceDefaultPrice = (srv: string) => {
    if (bookingSource === "artist") {
      return srv === "prepleat"
        ? (settings.artistPrepleatPrice ?? settings.prepleatPrice)
        : (settings.artistDrapePrice ?? settings.drapePrice);
    }
    return srv === "prepleat" ? settings.prepleatPrice : settings.drapePrice;
  };

    const lastPrice = customerId ? lastPriceFor(customerId, "prepleat", bookings) : undefined;
  const lastArtistPrice = artistId
    ? bookings.find((b) => b.artistId === artistId)?.pricePerSaree
    : undefined;
  const quotedLastPrice = bookingSource === "artist" ? lastArtistPrice : lastPrice;
  const defaultPrice = getServiceDefaultPrice(service);
  const [servicesList, setServicesList] = useState<ServiceItem[]>([
    {
      id: "srv_1",
      service: "prepleat",
      serviceName: "Pre-Pleat",
      sareeCount: 1,
      pricePerSaree: defaultPrice,
      notes: "",
    },
  ]);

  const [sareeCount, setSareeCount] = useState(1);
  const [pricePerSaree, setPricePerSaree] = useState<number>(defaultPrice);
  const [priceTouched, setPriceTouched] = useState(false);
  const effPrice = priceTouched ? pricePerSaree : defaultPrice;
  
  const [manualTotal, setManualTotal] = useState<number | null>(null);
  const [extraCharges, setExtraCharges] = useState<string>("");
  const extraNum = Number(extraCharges) || 0;
  const [extraChargesNote, setExtraChargesNote] = useState<string>("Travel");
  const [showExtraCharges, setShowExtraCharges] = useState(false);
  const [sendWhatsAppOnSave, setSendWhatsAppOnSave] = useState(true);

  // Synchronized multi-service totals
  const totalSareesCount = useMemo(() => {
    return servicesList.reduce((sum, item) => sum + (Number(item.sareeCount) || 1), 0);
  }, [servicesList]);

  const calculatedBaseSubtotal = useMemo(() => {
    return servicesList.reduce(
      (sum, item) => sum + (Number(item.sareeCount) || 1) * (Number(item.pricePerSaree) || 0),
      0
    );
  }, [servicesList]);

  const sareeSubtotal = manualTotal !== null ? manualTotal : calculatedBaseSubtotal;
  const total = sareeSubtotal + extraNum;

  const today = format(new Date(), "yyyy-MM-dd");
  const [deliveryDate, setDeliveryDate] = useState(presetDate || today);
  const [deliveryTime, setDeliveryTime] = useState(roundUpToQuarter());
  const [hasSpecificTime, setHasSpecificTime] = useState(false);
  // Popover open state for tap-once calendar / clock pickers (works on iOS & Android).
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const timeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (presetDate) setDeliveryDate(presetDate);
  }, [presetDate]);

  const [hasAdvance, setHasAdvance] = useState(false);
  const [advance, setAdvance] = useState("");
  const advNum = Number(advance) || 0;
  const remaining = Math.max(0, total - advNum);

  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [showAddTagInput, setShowAddTagInput] = useState(false);
  const [showMeasure, setShowMeasure] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>(settings.defaultMeasurements);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [showMiniBillBreakdown, setShowMiniBillBreakdown] = useState(false);
  const [isEditingMeasure, setIsEditingMeasure] = useState(true);
  const [hasExistingMeasurements, setHasExistingMeasurements] = useState(false);
  const [showNewCustConfirm, setShowNewCustConfirm] = useState(false);

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

  // Restore Draft if user navigates back from another page
  const hasRestoredDraft = useRef(false);
  const isSavedRef = useRef(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const addServiceRow = () => {
    const nextService = servicesList.some((s) => s.service === "prepleat") ? "drape" : "prepleat";
    const nextPrice = getServiceDefaultPrice(nextService);
    setServicesList((prev) => [
      ...prev,
      {
        id: "srv_" + Math.random().toString(36).slice(2, 8),
        service: nextService,
        serviceName: nextService === "prepleat" ? "Pre-Pleat" : "Draping",
        sareeCount: 1,
        pricePerSaree: nextPrice,
        notes: "",
      },
    ]);
  };

  const updateServiceRow = (id: string, patch: Partial<ServiceItem>) => {
    setServicesList((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...patch };
        if (patch.service && patch.service !== item.service) {
          if (patch.service === "prepleat") {
            updated.serviceName = "Pre-Pleat";
            updated.pricePerSaree = getServiceDefaultPrice("prepleat");
          } else if (patch.service === "drape") {
            updated.serviceName = "Draping";
            updated.pricePerSaree = getServiceDefaultPrice("drape");
          } else if (patch.service === "custom" && !item.serviceName) {
            updated.serviceName = "Custom Service";
          }
        }
        return updated;
      })
    );
  };

  const removeServiceRow = (id: string) => {
    if (servicesList.length <= 1) return;
    setServicesList((prev) => prev.filter((item) => item.id !== id));
  };
  const [createdBookingPreview, setCreatedBookingPreview] = useState<{
    bookingId: string;
    customerName: string;
    phone?: string;
    phoneWA?: string;
    waText: string;
    billNo: string;
    dateStr: string;
    timeStr: string;
    sareeCount: number;
    netTotal: number;
    paid: number;
    dueBal: number;
  } | null>(null);

  useEffect(() => {
    if (hasRestoredDraft.current) return;
    hasRestoredDraft.current = true;
    try {
      const saved = sessionStorage.getItem("eyas_new_booking_draft");
      if (saved && !presetCustomerId && !presetArtistId) {
        const draft = JSON.parse(saved);
        if (draft.newName) setNewName(draft.newName);
        if (draft.newPhone) setNewPhone(draft.newPhone);
        if (draft.newAddress) setNewAddress(draft.newAddress);
        if (draft.newLocationUrl) setNewLocationUrl(draft.newLocationUrl);
        if (draft.customerId) setCustomerId(draft.customerId);
        if (draft.service) setService(draft.service);
        if (draft.sareeCount) setSareeCount(draft.sareeCount);
        if (draft.deliveryDate && !presetDate) setDeliveryDate(draft.deliveryDate);
        if (draft.deliveryTime) setDeliveryTime(draft.deliveryTime);
        if (draft.notes) setNotes(draft.notes);
        if (draft.advance) setAdvance(draft.advance);
        if (draft.extraCharges) {
          setExtraCharges(draft.extraCharges);
          setShowExtraCharges(true);
        }
        if (draft.extraChargesNote) setExtraChargesNote(draft.extraChargesNote);
        if (draft.priceTouched && draft.pricePerSaree) {
          setPricePerSaree(draft.pricePerSaree);
          setPriceTouched(true);
        }
        if (draft.bookingSource) setBookingSource(draft.bookingSource);
        if (draft.artistId) setArtistId(draft.artistId);
        if (draft.measurements) {
          setMeasurements(draft.measurements);
          setShowMeasure(true);
        }
        setDraftRestored(true);
      }
    } catch (e) {}
  }, [presetCustomerId, presetArtistId, presetDate]);

  // Auto-save draft on every change
  useEffect(() => {
    if (isSavedRef.current) return;
    if (newName.trim() || newPhone.trim() || customerId || notes.trim() || sareeCount > 1 || advance.trim() || newAddress.trim()) {
      const draft = {
        newName,
        newPhone,
        newAddress,
        newLocationUrl,
        customerId,
        service,
        sareeCount,
        pricePerSaree,
        priceTouched,
        extraCharges,
        extraChargesNote,
        deliveryDate,
        deliveryTime,
        advance,
        notes,
        bookingSource,
        artistId,
        measurements: showMeasure ? measurements : undefined,
      };
      sessionStorage.setItem("eyas_new_booking_draft", JSON.stringify(draft));
    }
  }, [
    newName,
    newPhone,
    newAddress,
    newLocationUrl,
    customerId,
    service,
    sareeCount,
    pricePerSaree,
    priceTouched,
    extraCharges,
    extraChargesNote,
    deliveryDate,
    deliveryTime,
    advance,
    notes,
    bookingSource,
    artistId,
    measurements,
    showMeasure,
  ]);

  const clearDraft = () => {
    sessionStorage.removeItem("eyas_new_booking_draft");
    setNewName("");
    setNewPhone("");
    setNewAddress("");
    setNewLocationUrl("");
    setCustomerId("");
    setSareeCount(1);
    setNotes("");
    setAdvance("");
    setExtraCharges("");
    setShowExtraCharges(false);
    setPriceTouched(false);
    setDraftRestored(false);
    toast.success("Draft cleared");
  };

  // Keep measurements in sync if settings change (e.g. user updates default labels live)
  useEffect(() => {
    if (!draftRestored) {
      setMeasurements(settings.defaultMeasurements);
    }
  }, [settings.defaultMeasurements, draftRestored]);

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
    setNewPhone(c.phone ? c.phone.replace(/^\+91/, "") : "");
    setIsEditingPhone(false);
    setNewAddress(c.address || "");
    setNewLocationUrl(c.locationUrl || "");
    setNameFocus(false);

    if (c.measurements && c.measurements.length > 0) {
      setMeasurements(c.measurements);
      setShowMeasure(true);
      setHasExistingMeasurements(true);
      setIsEditingMeasure(false);
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
          setHasExistingMeasurements(true);
          setIsEditingMeasure(false);
        } else {
          setMeasurements(settings.defaultMeasurements);
          setShowMeasure(false);
          setHasExistingMeasurements(false);
          setIsEditingMeasure(true);
        }
      } else {
        setMeasurements(settings.defaultMeasurements);
        setShowMeasure(false);
        setHasExistingMeasurements(false);
        setIsEditingMeasure(true);
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

  // Note: Background clipboard polling removed to prevent iOS Safari "Paste" callout on tap

  const handlePasteClick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = sanitizeIndianPhone(text);
      if (cleaned) {
        setNewPhone(cleaned);
        toast.success(`Pasted: ${cleaned}`);
      } else {
        toast.error("No valid phone number found in clipboard");
      }
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
    setDateOpen(false);
    setShowMapPicker(false);
    setIsEditingPhone(false);
    setReviewOpen(true);
  };

  const confirmSave = () => {
    let cid = customerId;
    const formattedPhone = newPhone.trim()
      ? newPhone.replace(/\D/g, "").length === 10
        ? "+91" + newPhone.trim()
        : newPhone.trim()
      : "";

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
            phone: formattedPhone,
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
      if (newName.trim() && newName !== selectedCust.name) updates.name = newName.trim();
      if (formattedPhone && formattedPhone !== selectedCust.phone) updates.phone = formattedPhone;
      if (newAddress.trim() !== (selectedCust.address || "")) updates.address = newAddress.trim();
      if (newLocationUrl.trim() !== (selectedCust.locationUrl || "")) updates.locationUrl = newLocationUrl.trim();
      if (Object.keys(updates).length > 0) updateCustomer(cid, updates);
    }
    if (!cid) return toast.error("Customer required");

    const finalNotes = [...selectedTags, notes.trim()].filter(Boolean).join(" · ");

    const primarySrv = servicesList[0]?.service === "drape" ? "drape" : "prepleat";
    const b = addBooking({
      customerId: cid,
      artistId: artistId || undefined,
      service: primarySrv,
      sareeCount: totalSareesCount,
      pricePerSaree: Math.round(sareeSubtotal / (totalSareesCount || 1)),
      totalAmount: sareeSubtotal,
      items: servicesList,
      extraCharges: extraNum > 0 ? extraNum : undefined,
      extraChargesNote: extraNum > 0 ? (extraChargesNote.trim() || "Travel") : undefined,
      advancePaid: hasAdvance ? advNum : 0,
      deliveryDate: new Date(deliveryDate + "T12:00:00").toISOString(),
      deliveryTime: hasSpecificTime ? deliveryTime : "",
      notes: finalNotes || undefined,
      measurements: showMeasure ? measurements : undefined,
    });
    isSavedRef.current = true;
    sessionStorage.removeItem("eyas_new_booking_draft");
    try {
      localStorage.setItem("eyas_has_made_first_entry", "true");
    } catch {}
    toast.success("Booking created successfully! 🎉");

    // If WhatsApp confirmation toggle is ON
    if (sendWhatsAppOnSave) {
      const allCustomers = useStore.getState().customers;
      const custObj = allCustomers.find((x) => x.id === cid);
      const custName = custObj?.name || newName.trim() || "Customer";
      const phoneRaw = custObj?.phone || formattedPhone;
      const phoneWA = cleanPhoneForWhatsApp(phoneRaw);

      if (phoneWA) {
        const dateStr = formatAppDate(b.deliveryDate);
        const timeStr = hasSpecificTime ? fmtTime12(b.deliveryTime) : "Anytime";
        const billNo = formatShortBillNumber(b.billNumber, b.id);
        const netTotal = total;
        const paid = hasAdvance ? advNum : 0;
        const dueBal = Math.max(0, netTotal - paid);

        const extraLine = extraNum > 0 ? `• *Extra/Travel*: ${fmtINR(extraNum)} (${extraChargesNote.trim() || "Travel"})` : "";
        const noteLine = finalNotes ? `• *Note*: ${finalNotes}` : "";

        const msgLines = [
          `🥻 *EYAS SAREE DRAPIST* 🥻`,
          ``,
          `Hi *${custName}* 🙏`,
          `Your saree has been safely *collected* for *${service === "prepleat" ? "Pre-Pleating" : "Saree Draping"}*! 🥻`,
          ``,
          `📋 *BOOKING DETAILS*`,
          `• *Bill No*: ${billNo}`,
          `• *Sarees*: ${sareeCount} saree${sareeCount > 1 ? "s" : ""} × ${fmtINR(effPrice)}`,
          `• *Delivery*: ${dateStr} · ${timeStr}`,
          extraLine,
          noteLine,
          ``,
          `💳 *PAYMENT SUMMARY*`,
          `• *Total Bill*: ${fmtINR(netTotal)}`,
          `• *Advance Paid*: ${fmtINR(paid)}`,
          dueBal > 0 ? `• *Balance Due*: *${fmtINR(dueBal)}*` : `• *Status*: ✅ *Paid in Full* ✅`,
          ``,
          `🙏 *${settings.businessName || "Saree Studio"}*`,
        ].filter((l) => l !== "");

        const waText = encodeURIComponent(msgLines.join("\n"));
        setCreatedBookingPreview({
          bookingId: b.id,
          customerName: custName,
          phone: phoneRaw,
          phoneWA,
          waText,
          billNo,
          dateStr,
          timeStr,
          sareeCount,
          netTotal,
          paid,
          dueBal,
        });
        return;
      }
    }

    navigate({ to: "/bookings/$id", params: { id: b.id } });
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between pt-4 pb-3">
        <button
          onClick={() => navigate({ to: "/" })}
          className="size-10 rounded-full bg-secondary flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-lg font-display font-semibold">New Booking</h1>
        {draftRestored ? (
          <button
            type="button"
            onClick={clearDraft}
            className="text-[11px] font-bold text-destructive hover:underline px-2 py-1 rounded-lg bg-destructive/10 cursor-pointer"
            title="Discard saved draft"
          >
            Clear Draft
          </button>
        ) : (
          <div className="size-10" />
        )}
      </div>

      {draftRestored && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs text-foreground animate-in fade-in">
          <span className="font-semibold">📝 Restored unsaved booking draft</span>
          <button
            type="button"
            onClick={clearDraft}
            className="text-[10px] font-bold text-destructive hover:underline cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

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
                            "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition",
                            artistId === a.id
                              ? "saree-gradient text-white font-bold ring-2 ring-primary/40 shadow-xs"
                              : "bg-secondary hover:bg-secondary/80",
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

            {/* Prominent Highlighted Selected Artist Card */}
            {artistId && (() => {
              const selectedArt = artists.find((a) => a.id === artistId);
              if (!selectedArt) return null;
              return (
                <div className="mt-2.5 p-3 rounded-2xl saree-gradient text-white shadow-xs flex items-center justify-between gap-2 border border-white/20 animate-in fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <Palette className="size-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9.5px] uppercase font-extrabold tracking-wider text-white/80">
                        Selected Artist
                      </p>
                      <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                        <span>{selectedArt.name}</span>
                        <CheckCircle className="size-3.5 text-emerald-300 shrink-0" />
                      </h4>
                      {selectedArt.phone && (
                        <p className="text-[11px] text-white/80 font-mono">{selectedArt.phone}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setArtistId("");
                      setPriceTouched(false);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition active:scale-95 shrink-0"
                  >
                    Change
                  </button>
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
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold text-base text-foreground tracking-tight truncate flex items-center gap-1.5">
                    <User className="size-4 text-primary shrink-0" />
                    <span>{selectedCust.name}</span>
                  </h3>
                  {quotedLastPrice && (
                    <p className="text-[11px] text-gold font-semibold mt-0.5">
                      💡 Previous order: {fmtINR(quotedLastPrice)} / saree
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setCustomerId("");
                    setNewPhone("");
                    setNewAddress("");
                    setNewLocationUrl("");
                    setMeasurements(settings.defaultMeasurements);
                    setShowMeasure(false);
                    setHasExistingMeasurements(false);
                    setIsEditingMeasure(true);
                    setIsEditingPhone(false);
                    setIsEditingAddress(false);
                  }}
                  className="text-xs text-primary font-semibold shrink-0 hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Mobile Number Section */}
              <div>
                {selectedCust.phone ? (
                  !isEditingPhone ? (
                    <div className="flex items-center justify-between bg-secondary/50 px-3 py-2 rounded-xl border border-border/10">
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-semibold tabular-nums">{selectedCust.phone}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewPhone(selectedCust.phone.replace(/^\+91/, ""));
                          setIsEditingPhone(true);
                        }}
                        className="text-[11px] text-primary font-bold px-2 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 transition active:scale-95 cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                        +91
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="tel-national"
                        autoCorrect="off"
                        spellCheck={false}
                        maxLength={10}
                        value={newPhone}
                        onChange={(e) => setNewPhone(sanitizeIndianPhone(e.target.value))}
                        placeholder="Mobile number"
                        className="w-full bg-secondary rounded-2xl pl-[4.5rem] pr-16 py-2.5 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary select-text"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingPhone(false);
                          setNewPhone(selectedCust.phone.replace(/^\+91/, ""));
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )
                ) : (
                  <div>
                    {!isEditingPhone ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingPhone(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/80 hover:bg-secondary text-foreground text-xs font-bold rounded-xl transition active:scale-95 cursor-pointer border border-border/30"
                      >
                        <Plus className="size-3.5 text-primary" />
                        <span>Add Mobile Number</span>
                      </button>
                    ) : (
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                          +91
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="tel-national"
                          autoCorrect="off"
                          spellCheck={false}
                          maxLength={10}
                          value={newPhone}
                          onChange={(e) => setNewPhone(sanitizeIndianPhone(e.target.value))}
                          placeholder="Mobile number"
                          className="w-full bg-secondary rounded-2xl pl-[4.5rem] pr-16 py-2.5 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary select-text"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPhone(false);
                            setNewPhone("");
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Address & Google Maps Location Section */}
              <div>
                {selectedCust.address ? (
                  !isEditingAddress ? (
                    <div className="flex items-start justify-between bg-secondary/50 px-3 py-2.5 rounded-xl border border-border/10">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground whitespace-pre-wrap">
                            {selectedCust.address}
                          </p>
                          {selectedCust.locationUrl && (
                            <a
                              href={selectedCust.locationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-1 font-semibold"
                            >
                              <Map className="size-3" /> View on Google Maps
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewAddress(selectedCust.address || "");
                          setNewLocationUrl(selectedCust.locationUrl || "");
                          setIsEditingAddress(true);
                        }}
                        className="text-[11px] text-primary font-bold px-2 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 transition active:scale-95 shrink-0 ml-2 cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 bg-secondary/30 p-3 rounded-2xl border border-border/30 animate-in fade-in">
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <textarea
                          value={newAddress}
                          onChange={(e) => setNewAddress(e.target.value)}
                          rows={2}
                          placeholder="Delivery address"
                          className="w-full bg-background rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none border border-border/40"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          value={newLocationUrl}
                          onChange={(e) => setNewLocationUrl(e.target.value)}
                          placeholder="Paste Google Maps URL"
                          className="flex-1 bg-background rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary border border-border/40"
                        />
                        <button
                          type="button"
                          onClick={() => setShowMapPicker(true)}
                          className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition flex items-center gap-1 text-xs font-bold"
                          title="Pick Location on Map"
                        >
                          <Map className="size-4" />
                          <span className="hidden sm:inline">Pick Map</span>
                        </button>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsEditingAddress(false)}
                          className="text-xs text-primary font-bold px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div>
                    {!isEditingAddress ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/80 hover:bg-secondary text-foreground text-xs font-bold rounded-xl transition active:scale-95 cursor-pointer border border-border/30"
                      >
                        <Plus className="size-3.5 text-primary" />
                        <MapPin className="size-3.5 text-muted-foreground" />
                        <span>Add Address & Map Location</span>
                      </button>
                    ) : (
                      <div className="space-y-2 bg-secondary/30 p-3 rounded-2xl border border-border/30 animate-in fade-in">
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                          <textarea
                            value={newAddress}
                            onChange={(e) => setNewAddress(e.target.value)}
                            rows={2}
                            autoFocus
                            placeholder="Delivery address"
                            className="w-full bg-background rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none border border-border/40"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            value={newLocationUrl}
                            onChange={(e) => setNewLocationUrl(e.target.value)}
                            placeholder="Paste Google Maps URL"
                            className="flex-1 bg-background rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary border border-border/40"
                          />
                          <button
                            type="button"
                            onClick={() => setShowMapPicker(true)}
                            className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition flex items-center gap-1 text-xs font-bold"
                            title="Pick Location on Map"
                          >
                            <Map className="size-4" />
                            <span className="hidden sm:inline">Pick Map</span>
                          </button>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingAddress(false);
                              setNewAddress("");
                              setNewLocationUrl("");
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingAddress(false)}
                            className="text-xs text-primary font-bold px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                  <ul className="absolute z-30 left-0 right-0 mt-1 bg-popover border border-border rounded-2xl shadow-lg overflow-hidden max-h-56 overflow-y-auto select-none">
                    {nameSuggestions.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            pickCustomer(c);
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            pickCustomer(c);
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-secondary active:bg-secondary cursor-pointer select-none touch-manipulation"
                        >
                          <p className="text-sm font-medium select-none pointer-events-none">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground select-none pointer-events-none">{c.phone}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {showExisting && !newName.trim() && existingList.length > 0 && (
                  <ul className="absolute z-30 left-0 right-0 mt-1 bg-popover border border-border rounded-2xl shadow-lg overflow-hidden max-h-64 overflow-y-auto select-none">
                    {existingList.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            pickCustomer(c);
                            setShowExisting(false);
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            pickCustomer(c);
                            setShowExisting(false);
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-secondary active:bg-secondary cursor-pointer select-none touch-manipulation"
                        >
                          <p className="text-sm font-medium select-none pointer-events-none">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground select-none pointer-events-none">{c.phone}</p>
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
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(sanitizeIndianPhone(e.target.value))}
                      placeholder="10-digit mobile"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="tel-national"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={10}
                      className="flex-1 min-w-0 bg-transparent pl-3 pr-16 py-2.5 text-sm tabular-nums focus:outline-none select-text"
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

      {/* Services & Line Items Section */}
      <section className="bg-card card-shadow rounded-2xl p-4 mb-3 space-y-3.5 border border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Services & Saree Items ({servicesList.length})
            </h2>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold">
            Total: {totalSareesCount} {totalSareesCount === 1 ? "Saree" : "Sarees"}
          </span>
        </div>

        <div className="space-y-3">
          {servicesList.map((item, idx) => {
            const itemSubtotal = (Number(item.sareeCount) || 1) * (Number(item.pricePerSaree) || 0);

            return (
              <div
                key={item.id}
                className="bg-secondary/40 border border-border/40 rounded-2xl p-3 space-y-2.5 transition relative"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Service #{idx + 1}
                  </span>
                  {servicesList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeServiceRow(item.id)}
                      className="size-6 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center text-xs transition cursor-pointer"
                      title="Remove this service"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Service Type Selection */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { key: "prepleat", label: "Pre-Pleat", icon: "🥻" },
                    { key: "drape", label: "Draping", icon: "✨" },
                    { key: "custom", label: "Custom", icon: "📦" },
                  ].map((srv) => {
                    const active = item.service === srv.key;
                    return (
                      <button
                        key={srv.key}
                        type="button"
                        onClick={() => updateServiceRow(item.id, { service: srv.key as any })}
                        className={cn(
                          "py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer",
                          active
                            ? "saree-gradient text-white shadow-xs"
                            : "bg-card hover:bg-card/80 text-foreground/80 border border-border/30",
                        )}
                      >
                        <span>{srv.icon}</span>
                        <span>{srv.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Draping Sub-Type Selector */}
                {item.service === "drape" && (
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-card rounded-xl border border-border/30 animate-in fade-in">
                    <button
                      type="button"
                      onClick={() => updateServiceRow(item.id, { serviceName: "Spot Drape" })}
                      className={cn(
                        "py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center",
                        (item.serviceName || "Spot Drape") === "Spot Drape"
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      ✨ Spot Drape (Direct)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateServiceRow(item.id, { serviceName: "Pre-Pleat + Drape" })}
                      className={cn(
                        "py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center",
                        item.serviceName === "Pre-Pleat + Drape"
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      🥻 Pre-Pleat + Drape
                    </button>
                  </div>
                )}

                {/* Custom Service Name Input (if custom) */}
                {item.service === "custom" && (
                  <input
                    type="text"
                    value={item.serviceName || ""}
                    onChange={(e) => updateServiceRow(item.id, { serviceName: e.target.value })}
                    placeholder="Custom service name (e.g. Box Fold & Ironing)"
                    className="w-full bg-card rounded-xl px-3 py-1.5 text-xs font-medium border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}

                {/* Saree Count and Price per Saree */}
                <div className="grid grid-cols-2 gap-2.5 items-center">
                  {/* Saree Counter */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Sarees
                    </span>
                    <div className="flex items-center justify-between bg-card rounded-xl p-1 px-2 h-9 border border-border/30">
                      <button
                        type="button"
                        onClick={() =>
                          updateServiceRow(item.id, {
                            sareeCount: Math.max(1, (item.sareeCount || 1) - 1),
                          })
                        }
                        className="size-6.5 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center font-bold text-sm active:scale-90 transition cursor-pointer"
                      >
                        −
                      </button>
                      <span className="text-xs font-bold tabular-nums">{item.sareeCount || 1}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateServiceRow(item.id, {
                            sareeCount: (item.sareeCount || 1) + 1,
                          })
                        }
                        className="size-6.5 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center font-bold text-sm active:scale-90 transition cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Price Per Saree */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Rate / Saree (₹)
                    </span>
                    <div className="flex items-center justify-between bg-card rounded-xl p-1 px-1.5 h-9 border border-border/30">
                      <button
                        type="button"
                        onClick={() =>
                          updateServiceRow(item.id, {
                            pricePerSaree: Math.max(0, (item.pricePerSaree || 0) - 50),
                          })
                        }
                        className="size-6.5 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center font-bold text-xs active:scale-90 transition cursor-pointer"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={item.pricePerSaree}
                        onChange={(e) =>
                          updateServiceRow(item.id, {
                            pricePerSaree: Number(e.target.value) || 0,
                          })
                        }
                        className="w-14 bg-transparent text-center text-xs font-bold tabular-nums focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateServiceRow(item.id, {
                            pricePerSaree: (item.pricePerSaree || 0) + 50,
                          })
                        }
                        className="size-6.5 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center font-bold text-xs active:scale-90 transition cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Service Note Input */}
                <div className="pt-1">
                  <input
                    type="text"
                    value={item.notes || ""}
                    onChange={(e) => updateServiceRow(item.id, { notes: e.target.value })}
                    placeholder="Service note (e.g. Box packing with pins, morning Muhurtham)"
                    className="w-full bg-card/80 border border-border/30 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/70"
                  />
                </div>

                {/* Subtotal line */}
                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-0.5 border-t border-border/20">
                  <span>Subtotal:</span>
                  <span className="font-bold text-foreground font-mono">
                    {item.sareeCount || 1} × {fmtINR(item.pricePerSaree || 0)} = {fmtINR(itemSubtotal)}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Add another service button */}
          <button
            type="button"
            onClick={addServiceRow}
            className="w-full py-2.5 rounded-2xl bg-primary/10 hover:bg-primary/15 text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border border-primary/20 active:scale-95"
          >
            <Plus className="size-3.5" />
            <span>+ Add Another Service (e.g. Draping, Box Folding)</span>
          </button>
        </div>

        {/* Extra / Travel Charges toggle & inputs */}
        {!showExtraCharges && extraNum === 0 ? (
          <div className="pt-2.5 border-t border-border/40 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setShowExtraCharges(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer active:scale-95"
            >
              <Car className="size-3.5" /> + Add Travel / Extra Charge (optional)
            </button>
          </div>
        ) : (
          <div className="pt-3 border-t border-border/40 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground/90">
                <Car className="size-3.5 text-primary" />
                Extra / Travel Charge
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowExtraCharges(false);
                  setExtraCharges("");
                }}
                className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-full bg-secondary/80 hover:bg-secondary cursor-pointer"
              >
                Remove
              </button>
            </div>

            {/* Note selector / chips */}
            <div className="flex flex-wrap gap-1.5">
              {["Travel", "Delivery", "Urgent", "Other"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setExtraChargesNote(tag)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer border",
                    extraChargesNote === tag
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80",
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Amount input & presets */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="number"
                  value={extraCharges}
                  onChange={(e) => setExtraCharges(e.target.value)}
                  placeholder="0 (Travel / Extra)"
                  className="w-full bg-secondary rounded-xl pl-7 pr-3 py-2 text-xs font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-1">
                {[100, 150, 200].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setExtraCharges(String(amt))}
                    className="px-2 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-[10px] font-bold cursor-pointer active:scale-95 transition"
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-border/50 bg-primary/5 dark:bg-primary/10 rounded-2xl p-3.5 border border-primary/20 flex justify-between items-center">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
              Grand Total Amount
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {totalSareesCount} {totalSareesCount > 1 ? "sarees" : "saree"} · {servicesList.length} {servicesList.length > 1 ? "services" : "service"} {extraNum > 0 ? `+ ₹${extraNum} ${extraChargesNote || "extra"}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMiniBillBreakdown(true)}
              className="size-9 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-2xs"
              title="View Itemized Mini Bill Summary"
            >
              <Receipt className="size-4.5" />
            </button>
            <div className="text-right">
              <span className="text-xl font-display font-black text-primary tabular-nums">
                {fmtINR(total)}
              </span>
              {hasAdvance && advNum > 0 && (
                <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                  Due: {fmtINR(remaining)}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Delivery */}
      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Delivery Date & Time
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
            let start = addDays(base, -7);
            let end = addDays(base, 82);
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

        {/* Optional Specific Delivery Time Toggle & 12hr TimePicker */}
        {!hasSpecificTime ? (
          <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Clock className="size-3.5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-foreground block">Specific Delivery Time?</span>
                <span className="text-[10px] text-muted-foreground">Default: Anytime on delivery date</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setHasSpecificTime(true)}
              className="px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <Plus className="size-3 stroke-[2.5]" />
              <span>Add Time</span>
            </button>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-border/30 animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Clock className="size-3.5 text-primary" />
                <span>Delivery Time: <span className="text-primary font-mono">{fmtTime12(deliveryTime)}</span></span>
              </div>
              <button
                type="button"
                onClick={() => setHasSpecificTime(false)}
                className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-full bg-secondary cursor-pointer"
              >
                Remove (Anytime)
              </button>
            </div>
            
            <div className="p-3 bg-secondary/30 rounded-2xl border border-border/40">
              <TimePicker12
                value={deliveryTime}
                onChange={(t) => setDeliveryTime(t)}
              />
            </div>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground mt-2 text-center tabular-nums">
          {formatAppDate(deliveryDate)} {hasSpecificTime ? `· ${fmtTime12(deliveryTime)}` : "· Anytime"}
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
        {!hasAdvance && advNum === 0 ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <IndianRupee className="size-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block">Advance Payment (Optional)</span>
                <span className="text-[10px] text-muted-foreground">Record token payment if received</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setHasAdvance(true)}
              className="px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <Plus className="size-3 stroke-[2.5]" />
              <span>Add Advance</span>
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in">
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Advance Payment
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setHasAdvance(false);
                    setAdvance("");
                  }}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-full bg-secondary cursor-pointer"
                >
                  Remove
                </button>
              </div>
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
                className="w-full bg-secondary rounded-full pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold"
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
              <div className="mt-2.5 p-2.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-bold flex items-center gap-1.5 animate-in shake duration-200">
                <AlertCircle className="size-4 shrink-0" />
                <span>⚠️ Advance amount ({fmtINR(advNum)}) cannot exceed total bill ({fmtINR(total)})!</span>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span>📐</span>Measurements
            {showMeasure && hasExistingMeasurements && (
              <button
                type="button"
                onClick={() => setIsEditingMeasure(!isEditingMeasure)}
                className="ml-2 text-[10px] font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 transition active:scale-95"
              >
                {isEditingMeasure ? "Done" : "Edit"}
              </button>
            )}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={showMeasure}
            onClick={() => {
              const next = !showMeasure;
              setShowMeasure(next);
              if (next && hasExistingMeasurements) {
                setIsEditingMeasure(false);
              } else {
                setIsEditingMeasure(true);
              }
            }}
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
            {!isEditingMeasure ? (
              <div className="grid grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-border/40">
                {measurements.map((m, i) => (
                  <div key={i} className="bg-secondary/40 rounded-xl p-2.5 text-center border border-border/10">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate">
                      {m.label}
                    </p>
                    <p className="text-base font-extrabold text-foreground mt-1 tabular-nums">
                      {m.value}
                      <span className="text-[10px] font-normal text-muted-foreground ml-0.5">in</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
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
                  <div className="flex items-center justify-between mt-1 border-t border-border/40 pt-2.5 px-1">
                    <button
                      type="button"
                      onClick={() => setShowAddField(true)}
                      className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer active:scale-95"
                    >
                      + Add Custom Field
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMeasurements(settings.defaultMeasurements.map((m) => ({ label: m.label, value: m.value ?? 30 })));
                        toast.success("Measurements reset to defaults 📐");
                      }}
                      className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 bg-secondary hover:bg-secondary/80 px-2.5 py-1 rounded-lg transition active:scale-95 cursor-pointer"
                      title="Reset fields to default settings"
                    >
                      <RotateCcw className="size-3" />
                      <span>Reset Defaults</span>
                    </button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center mt-3">
                  Scroll inside each picker · all in inches
                </p>
              </>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">
            Turn on to record body measurements for this customer.
          </p>
        )}
      </section>

      <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Notes & Occasions
          </p>
          {!showAddTagInput && (
            <button
              type="button"
              onClick={() => setShowAddTagInput(true)}
              className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
            >
              + Add Custom Tag
            </button>
          )}
        </div>

        {/* Selected Tags in place with X removal */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5 animate-in fade-in">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-xs"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
                  className="hover:opacity-80 cursor-pointer ml-0.5"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Preset Suggestions to click and add */}
        {(settings.occasionPresets ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {(settings.occasionPresets ?? []).map((preset) => {
              const isSelected = selectedTags.includes(preset);
              if (isSelected) return null;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSelectedTags([...selectedTags, preset])}
                  className="px-2.5 py-1 rounded-full bg-secondary text-[11px] font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition active:scale-95 cursor-pointer"
                >
                  + {preset}
                </button>
              );
            })}
          </div>
        )}

        {/* Inline Add Custom Tag Form */}
        {showAddTagInput && (
          <div className="flex items-center gap-1.5 mb-2.5 bg-secondary/60 p-1.5 rounded-2xl border border-border/40 animate-in fade-in">
            <input
              type="text"
              placeholder="Tag name (e.g. Engagement, Reception)..."
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              className="flex-1 bg-transparent px-2.5 py-1 text-xs focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (customTagInput.trim()) {
                    setSelectedTags([...selectedTags, customTagInput.trim()]);
                    setCustomTagInput("");
                    setShowAddTagInput(false);
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (customTagInput.trim()) {
                  setSelectedTags([...selectedTags, customTagInput.trim()]);
                  setCustomTagInput("");
                  setShowAddTagInput(false);
                }
              }}
              className="px-2.5 py-1 rounded-xl bg-primary text-primary-foreground text-[10px] font-bold cursor-pointer"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddTagInput(false);
                setCustomTagInput("");
              }}
              className="px-2 py-1 rounded-xl bg-secondary text-muted-foreground text-[10px] font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional remarks (e.g. Box folding, pin securely)..."
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
          className="fixed inset-0 z-[20000] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setReviewOpen(false)}
        >
          <div
            className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl overflow-hidden border border-border/40 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Gradient Card */}
            <div className="saree-gradient -mx-5 -mt-5 px-5 py-4 text-primary-foreground mb-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wider opacity-90 font-black flex items-center gap-1">
                  <Sparkles className="size-3" /> Quick Review
                </span>
                <span className="text-[9px] uppercase tracking-wider font-bold bg-white/20 px-2.5 py-0.5 rounded-full border border-white/10">
                  {bookingSource === "artist" ? "Artist Booking" : "Direct Client"}
                </span>
              </div>
              <h4 className="text-xl font-display font-extrabold truncate mt-2 leading-tight">
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

            {/* Order Details Grid */}
            <div className="bg-secondary/40 rounded-2xl p-3.5 border border-border/30 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Service:</span>
                <span className="font-bold text-foreground uppercase tracking-wider text-[10px] px-2 py-0.5 bg-secondary rounded-lg border border-border/20">
                  {service === "prepleat" ? "PrePleat Service" : "Saree Draping"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Sarees:</span>
                <span className="font-bold text-foreground">
                  {sareeCount} {sareeCount === 1 ? "Saree" : "Sarees"} × {fmtINR(effPrice)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Delivery:</span>
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-primary shrink-0" />
                  {formatAppDate(deliveryDate)} · {fmtTime12(deliveryTime)}
                </span>
              </div>
              {artistId && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Artist:</span>
                  <span className="font-bold text-foreground">
                    {artists.find((a) => a.id === artistId)?.name ?? ""}
                  </span>
                </div>
              )}
              <div className="border-t border-border/30 pt-2 flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Total Bill:</span>
                <span className="text-base font-extrabold text-foreground">{fmtINR(total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Advance Paid:</span>
                <span className="font-bold text-success">
                  {advNum > 0 ? fmtINR(advNum) : "₹0 (No Advance)"}
                </span>
              </div>
              <div className="border-t border-border/30 pt-2 flex justify-between items-center font-bold">
                <span>Remaining Due:</span>
                <span className={cn("text-base font-extrabold", remaining > 0 ? "text-destructive" : "text-success")}>
                  {remaining > 0 ? fmtINR(remaining) : "₹0 (Fully Paid)"}
                </span>
              </div>
            </div>

            {/* Measurements Section */}
            {showMeasure && measurements.length > 0 && (
              <div className="mt-3 bg-secondary/30 rounded-2xl p-3 border border-border/20">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">
                  Measurements (Inches)
                </p>
                <div className="flex gap-2 flex-wrap">
                  {measurements.map((m) => (
                    <span key={m.label} className="text-xs px-2.5 py-1 rounded-xl bg-card border border-border/40 flex items-center gap-1.5">
                      <span className="text-muted-foreground">{m.label}:</span>
                      <strong className="font-bold tabular-nums text-foreground">{m.value}″</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* WhatsApp Confirmation Toggle */}
            {service === "prepleat" && (
              <div className="mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageCircle className="size-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight truncate">Send Saree Collected on WhatsApp</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Send confirmation & bill details to customer</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSendWhatsAppOnSave(!sendWhatsAppOnSave)}
                  className={cn(
                    "w-10 h-5.5 rounded-full relative transition-colors duration-200 cursor-pointer shrink-0",
                    sendWhatsAppOnSave ? "bg-emerald-600" : "bg-muted-foreground/30"
                  )}
                  title={sendWhatsAppOnSave ? "WhatsApp confirmation ON" : "WhatsApp confirmation OFF"}
                >
                  <div
                    className={cn(
                      "size-4 rounded-full bg-white transition-transform duration-200 absolute top-0.75 left-0.75 shadow-sm",
                      sendWhatsAppOnSave && "translate-x-4.5"
                    )}
                  />
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                className="py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer border border-border/40"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setReviewOpen(false);
                  if (!customerId) {
                    setShowNewCustConfirm(true);
                  } else {
                    confirmSave();
                  }
                }}
                className="py-3 rounded-xl saree-gradient text-white text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 shadow-md shadow-primary/25 cursor-pointer"
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={showNewCustConfirm}
        onOpenChange={setShowNewCustConfirm}
        title="Create New Customer?"
        description={`This will create a new customer record for "${newName.trim() || "Walk-in"}". Do you want to proceed?`}
        confirmLabel="Yes, Create & Save"
        cancelLabel="No, Cancel"
        onConfirm={() => {
          setShowNewCustConfirm(false);
          confirmSave();
        }}
      />
      <MapPicker
        open={showMapPicker}
        onOpenChange={setShowMapPicker}
        onConfirm={(url) => setNewLocationUrl(url)}
      />

      {/* Booking Created & WhatsApp Preview Modal */}
      {createdBookingPreview && (
        <div
          className="fixed inset-0 z-[20000] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => {
            const bid = createdBookingPreview.bookingId;
            setCreatedBookingPreview(null);
            navigate({ to: "/bookings/$id", params: { id: bid } });
          }}
        >
          <div
            className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 border border-border/40 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-1 pt-1">
              <div className="size-12 rounded-full bg-success/15 text-success mx-auto flex items-center justify-center">
                <CheckCircle className="size-6" />
              </div>
              <h3 className="font-display font-bold text-base text-foreground">
                Booking Saved Successfully! 🎉
              </h3>
              <p className="text-xs text-muted-foreground">
                Order #{createdBookingPreview.billNo} registered for {createdBookingPreview.customerName}
              </p>
            </div>

            {/* Quick Bill Summary */}
            <div className="bg-secondary/40 rounded-2xl p-3.5 border border-border/30 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Customer:</span>
                <span className="font-bold text-foreground">{createdBookingPreview.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Delivery:</span>
                <span className="font-bold text-foreground">{createdBookingPreview.dateStr} · {createdBookingPreview.timeStr}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Total Bill:</span>
                <span className="font-bold text-foreground">{fmtINR(createdBookingPreview.netTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Advance Paid:</span>
                <span className="font-bold text-success">{fmtINR(createdBookingPreview.paid)}</span>
              </div>
              <div className="border-t border-border/30 pt-1.5 flex justify-between items-center font-bold">
                <span>Balance:</span>
                <span className={createdBookingPreview.dueBal === 0 ? "text-success" : "text-destructive"}>
                  {createdBookingPreview.dueBal === 0 ? "Paid in Full ✅" : `Due: ${fmtINR(createdBookingPreview.dueBal)}`}
                </span>
              </div>
            </div>

            {/* WhatsApp Message Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <MessageCircle className="size-3 text-emerald-500" /> WhatsApp Message Preview
                </span>
                {createdBookingPreview.phone && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {createdBookingPreview.phone}
                  </span>
                )}
              </div>
              <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-3 text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                {decodeURIComponent(createdBookingPreview.waText)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/30">
              <button
                type="button"
                onClick={() => {
                  const bid = createdBookingPreview.bookingId;
                  setCreatedBookingPreview(null);
                  navigate({ to: "/bookings/$id", params: { id: bid } });
                }}
                className="py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase tracking-wider active:scale-95 transition cursor-pointer"
              >
                View Details
              </button>

              <a
                href={`https://wa.me/${createdBookingPreview.phoneWA}?text=${createdBookingPreview.waText}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  const bid = createdBookingPreview.bookingId;
                  setCreatedBookingPreview(null);
                  navigate({ to: "/bookings/$id", params: { id: bid } });
                }}
                className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider active:scale-95 transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="size-4" />
                <span>Send WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Mini Bill Breakdown Dialog */}
      <Dialog open={showMiniBillBreakdown} onOpenChange={setShowMiniBillBreakdown}>
        <DialogContent className="max-w-md p-4 sm:p-5 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Receipt className="size-4 text-primary" /> Itemized Bill Breakdown
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="border border-border/40 rounded-2xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-secondary/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="text-left p-2.5">Service</th>
                    <th className="text-center p-2.5">Qty</th>
                    <th className="text-right p-2.5">Rate</th>
                    <th className="text-right p-2.5">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {servicesList.map((it, idx) => {
                    const lineTot = (Number(it.sareeCount) || 1) * (Number(it.pricePerSaree) || 0);
                    return (
                      <tr key={it.id || idx} className="hover:bg-secondary/20">
                        <td className="p-2.5">
                          <p className="font-bold text-foreground">
                            {it.serviceName || (it.service === "prepleat" ? "Pre-Pleat" : "Draping")}
                          </p>
                          {it.notes && (
                            <p className="text-[10px] text-muted-foreground italic mt-0.5">
                              Note: {it.notes}
                            </p>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-semibold">{it.sareeCount || 1}</td>
                        <td className="p-2.5 text-right font-mono">{fmtINR(it.pricePerSaree || 0)}</td>
                        <td className="p-2.5 text-right font-mono font-bold">{fmtINR(lineTot)}</td>
                      </tr>
                    );
                  })}
                  {extraNum > 0 && (
                    <tr className="bg-secondary/10">
                      <td colSpan={3} className="p-2.5 text-muted-foreground font-semibold">
                        + Extra / {extraChargesNote || "Travel"} Charge
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-primary">
                        +{fmtINR(extraNum)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="bg-secondary/30 p-3 rounded-2xl space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-foreground text-sm border-b border-border/30 pb-1.5">
                <span>Grand Total:</span>
                <span className="font-mono text-primary font-black">{fmtINR(total)}</span>
              </div>
              {hasAdvance && advNum > 0 ? (
                <>
                  <div className="flex justify-between text-muted-foreground pt-1">
                    <span>Advance Received:</span>
                    <span className="font-mono font-bold text-emerald-600">{fmtINR(advNum)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-rose-600 dark:text-rose-400 pt-0.5">
                    <span>Balance Due:</span>
                    <span className="font-mono font-black">{fmtINR(remaining)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-muted-foreground pt-1">
                  <span>Payment Status:</span>
                  <span className="font-bold text-amber-600">Full Payment Pending</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowMiniBillBreakdown(false)}
              className="w-full py-2.5 rounded-xl saree-gradient text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
            >
              Close Summary
            </button>
          </div>
        </DialogContent>
      </Dialog>
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
