import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, totalDue, fmtINR, type CustomerKind, type Measurement } from "@/lib/store";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  Phone,
  Plus,
  SlidersHorizontal,
  Users,
  IndianRupee,
  AlertCircle,
  CheckSquare,
  Trash2,
  X as XIcon,
  X,
  Filter,
  ArrowUpDown,
  TrendingUp,
  CalendarPlus,
  Map,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollNumber } from "@/components/ScrollNumber";
import { MapPicker } from "@/components/MapPicker";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/customers/")({
  head: () => ({ meta: [{ title: "Customers — Saree Studio" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const customers = useStore((s) => s.customers);
  const bookings = useStore((s) => s.bookings);
  const addCustomer = useStore((s) => s.addCustomer);
  const deleteCustomer = useStore((s) => s.deleteCustomer);
  const restoreCustomer = useStore((s) => s.restoreCustomer);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<CustomerKind>("client");
  const [showAdd, setShowAdd] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"due" | "name" | "orders">("orders");
  const [showTopOnly, setShowTopOnly] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [showMapPicker, setShowMapPicker] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const settings = useStore((s) => s.settings);
  const [showMeasure, setShowMeasure] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");

  useEffect(() => {
    if (settings?.defaultMeasurements) {
      setMeasurements(
        settings.defaultMeasurements.map((m) => ({ label: m.label, value: m.value ?? 30 })),
      );
    }
  }, [settings?.defaultMeasurements]);

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

  // States and interval for vertical scrolling stats ticker in header
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % 2);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const activeFiltersCount =
    (dueOnly ? 1 : 0) + (sortBy !== "orders" ? 1 : 0) + (showTopOnly ? 1 : 0);
  const balanceSummary = dueOnly ? "Only Outstanding Balance" : "All Accounts";
  const getSortLabel = (s: typeof sortBy) =>
    s === "due" ? "Balance Due" : s === "orders" ? "Orders Count" : "Alphabetical";
  const sortSummary = `Sorted by ${getSortLabel(sortBy)}`;

  const list = useMemo(() => {
    const ql = q.toLowerCase().trim();
    let res = customers
      .filter((c) => (c.kind ?? "client") === tab)
      .map((c) => {
        const cb = bookings.filter((b) =>
          tab === "artist" ? b.artistId === c.id : b.customerId === c.id,
        );
        const due = cb.reduce((s, b) => s + totalDue(b), 0);
        const collected = cb.reduce((s, b) => s + (b.totalAmount - totalDue(b)), 0);
        return { ...c, count: cb.length, due, collected };
      })
      .filter(
        (c) =>
          !ql ||
          c.name.toLowerCase().includes(ql) ||
          c.phone.includes(ql) ||
          (c.address ?? "").toLowerCase().includes(ql) ||
          (c.reference ?? "").toLowerCase().includes(ql),
      )
      .filter((c) => !dueOnly || c.due > 0);

    if (showTopOnly) {
      res = res.filter((c) => c.collected > 0).sort((a, b) => b.collected - a.collected);
    } else {
      res = res.sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "orders") return b.count - a.count || a.name.localeCompare(b.name);
        return b.due - a.due || a.name.localeCompare(b.name);
      });
    }

    return res;
  }, [customers, bookings, q, tab, dueOnly, sortBy, showTopOnly]);

  const clientCount = customers.filter((c) => (c.kind ?? "client") === "client").length;
  const artistCount = customers.filter((c) => c.kind === "artist").length;

  const visibleSummary = useMemo(() => {
    const totalDueAll = list.reduce((s, c) => s + c.due, 0);
    const totalOrders = list.reduce((s, c) => s + c.count, 0);
    const withDue = list.filter((c) => c.due > 0).length;
    const totalCollectedAll = list.reduce((s, c) => s + c.collected, 0);
    return { count: list.length, totalDueAll, totalOrders, withDue, totalCollectedAll };
  }, [list]);

  const tickerItems = useMemo(() => {
    return [
      { label: "Collected", value: visibleSummary.totalCollectedAll, color: "text-success" },
      {
        label: "Outstanding",
        value: visibleSummary.totalDueAll,
        color: visibleSummary.totalDueAll > 0 ? "text-destructive" : "text-muted-foreground",
      },
    ];
  }, [visibleSummary]);

  return (
    <AppShell showFloatingSearch={true}>
      {/* Sticky Header block (Title + Ticker + Tab Bar + Action Buttons + Search Box) */}
      <div className="sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-20 bg-background/95 backdrop-blur-md -mx-5 px-5 pt-3 pb-3 border-b border-border/40 mb-3 space-y-3">
        <div className="flex items-center justify-between gap-4 h-9">
          <div>
            <h1 className="text-xl font-display font-semibold tracking-tight text-foreground">
              Customers
            </h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {clientCount} clients · {artistCount} artists
            </p>
          </div>

          {/* Scrolling Stats Ticker */}
          <div className="h-7 overflow-hidden relative min-w-[110px]">
            <div
              className="transition-transform duration-500 ease-in-out"
              style={{ transform: `translateY(-${tickerIndex * 28}px)` }}
            >
              {tickerItems.map((item, idx) => (
                <div key={idx} className="h-7 flex flex-col items-end justify-center">
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-extrabold leading-none">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-extrabold tabular-nums mt-0.5 leading-none",
                      item.color,
                    )}
                  >
                    {fmtINR(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Buttons (Clients / Artists) */}
        <div className="grid grid-cols-2 gap-1 bg-secondary/60 p-1 rounded-full">
          <button
            onClick={() => {
              setTab("client");
              setSelected(new Set());
              setSelectMode(false);
              setShowTopOnly(false);
            }}
            className={cn(
              "py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 active:scale-95",
              tab === "client"
                ? "bg-card text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>Clients</span>
            <span
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-full font-bold tabular-nums",
                tab === "client"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border border-border",
              )}
            >
              {clientCount}
            </span>
          </button>
          <button
            onClick={() => {
              setTab("artist");
              setSelected(new Set());
              setSelectMode(false);
              setShowTopOnly(false);
            }}
            className={cn(
              "py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 active:scale-95",
              tab === "artist"
                ? "bg-card text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>Artists</span>
            <span
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-full font-bold tabular-nums",
                tab === "artist"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border border-border",
              )}
            >
              {artistCount}
            </span>
          </button>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex gap-1.5 items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {list.length} {tab === "client" ? "clients" : "artists"} matched
          </span>

          <div className="flex gap-1.5">
            <button
              onClick={() => setShowTopOnly((v) => !v)}
              className={cn(
                "rounded-full px-3 py-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider transition cursor-pointer",
                showTopOnly
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground",
              )}
            >
              <TrendingUp className="size-3.5" /> Top
            </button>

            <button
              onClick={() => setShowAdd((v) => !v)}
              className={cn(
                "rounded-full px-3 py-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider transition cursor-pointer",
                showAdd
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground",
              )}
            >
              <Plus className="size-3.5" /> Add
            </button>

            <button
              onClick={() => {
                setSelectMode((v) => !v);
                setSelected(new Set());
              }}
              className={cn(
                "rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider transition cursor-pointer",
                selectMode
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground",
              )}
            >
              <CheckSquare className="size-3.5" /> {selectMode ? "Done" : "Select"}
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => {
                // Scroll to top so sticky header stays visible when keyboard opens
                setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
              }}
              placeholder={`Search ${tab === "client" ? "clients" : "artists"}...`}
              className="w-full bg-card border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "shrink-0 size-11 rounded-full flex items-center justify-center relative transition border cursor-pointer border-border",
                  activeFiltersCount > 0
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground",
                )}
                aria-label="Filter customers"
              >
                <SlidersHorizontal className="size-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-[10px] text-white font-bold flex items-center justify-center ring-2 ring-background">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 pb-8"
            >
              <SheetHeader className="mb-3 border-b border-border/40 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="size-4.5 text-primary" />
                    <SheetTitle className="text-base font-semibold font-display">
                      Filter & Sort {tab === "client" ? "Clients" : "Artists"}
                    </SheetTitle>
                  </div>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={() => {
                        setDueOnly(false);
                        setSortBy("orders");
                        setShowTopOnly(false);
                        toast.success("Filters cleared", { duration: 1200 });
                      }}
                      className="text-xs font-semibold text-destructive flex items-center gap-1 active:scale-95 transition bg-destructive/10 px-2.5 py-1 rounded-full cursor-pointer"
                    >
                      <XIcon className="size-3" /> Clear all
                    </button>
                  )}
                </div>
              </SheetHeader>

              <Accordion type="multiple" defaultValue={["due-status"]} className="w-full">
                {/* Category 1: Outstanding Balance */}
                <AccordionItem value="due-status" className="border-b border-border/40 py-1">
                  <AccordionTrigger className="hover:no-underline py-3 cursor-pointer">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <AlertCircle className="size-4 text-primary" /> Accounts & Balance
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        {balanceSummary}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-3 flex items-center justify-between">
                    <div className="pr-4">
                      <label className="text-xs font-semibold text-foreground">
                        Only Show Outstanding Balances
                      </label>
                      <p className="text-[10px] text-muted-foreground">
                        Show only {tab === "client" ? "clients" : "artists"} with payments due.
                      </p>
                    </div>
                    <button
                      onClick={() => setDueOnly((v) => !v)}
                      className={cn(
                        "h-7 w-12 rounded-full transition relative shrink-0 cursor-pointer",
                        dueOnly ? "bg-primary" : "bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 size-6 bg-white rounded-full shadow transition",
                          dueOnly ? "left-5.5" : "left-0.5",
                        )}
                      />
                    </button>
                  </AccordionContent>
                </AccordionItem>

                {/* Category 2: Sorting */}
                <AccordionItem value="sorting" className="border-b-0 py-1">
                  <AccordionTrigger className="hover:no-underline py-3 cursor-pointer">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <ArrowUpDown className="size-4 text-primary" /> Sort Preference
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        {sortSummary}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-2">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "due" as const, label: "Balance Due", icon: AlertCircle },
                        { id: "orders" as const, label: "Orders Count", icon: TrendingUp },
                        { id: "name" as const, label: "Alphabetical", icon: Users },
                      ].map((sOpt) => {
                        const active = sortBy === sOpt.id;
                        const Icon = sOpt.icon;
                        return (
                          <button
                            key={sOpt.id}
                            onClick={() => setSortBy(sOpt.id)}
                            className={cn(
                              "flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-[11px] font-semibold text-center transition active:scale-95 cursor-pointer border leading-tight h-16",
                              active
                                ? "bg-primary border-primary text-primary-foreground shadow-sm"
                                : "bg-secondary/60 border-transparent text-muted-foreground hover:bg-secondary/80",
                            )}
                          >
                            <Icon
                              className={cn(
                                "size-4 mb-1",
                                active ? "text-primary-foreground" : "text-muted-foreground/80",
                              )}
                            />
                            <span>{sOpt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Removed duplicate tabs */}

      {showAdd && (
        <div className="bg-card card-shadow rounded-2xl p-3 mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`${tab === "client" ? "Client" : "Artist"} name`}
              className="bg-secondary rounded-full px-3 py-2 text-sm focus:outline-none"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              inputMode="tel"
              className="bg-secondary rounded-full px-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            placeholder="Address (optional)"
            className="w-full bg-secondary rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
          />
          <div className="flex items-center gap-2">
            <input
              value={locationUrl}
              onChange={(e) => setLocationUrl(e.target.value)}
              placeholder="Paste Maps URL"
              className="flex-1 bg-secondary rounded-full px-3 py-2 text-sm focus:outline-none"
            />
            <button type="button" onClick={() => setShowMapPicker(true)} className="p-2 bg-secondary text-primary rounded-full hover:bg-secondary/80">
              <Map className="size-4" />
            </button>
          </div>
          {tab === "client" && (
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
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => {
              if (!name.trim() || !phone.trim()) return;
              addCustomer({
                kind: tab,
                name: name.trim(),
                phone: phone.trim(),
                address: address.trim() || undefined,
                locationUrl: locationUrl.trim() || undefined,
                measurements: tab === "client" && showMeasure ? measurements : undefined,
              });
              setName("");
              setPhone("");
              setAddress("");
              setLocationUrl("");
              setShowMeasure(false);
              if (settings?.defaultMeasurements) {
                setMeasurements(
                  settings.defaultMeasurements.map((m) => ({
                    label: m.label,
                    value: m.value ?? 30,
                  })),
                );
              }
              setShowAddField(false);
              setNewFieldName("");
              setShowAdd(false);
            }}
            className="w-full px-3 py-2 rounded-full saree-gradient text-primary-foreground text-sm font-semibold"
          >
            Add {tab}
          </button>
        </div>
      )}

      {selectMode && (
        <div className="bg-card card-shadow rounded-2xl p-2 mb-3 flex items-center gap-2">
          <button
            onClick={() => {
              if (selected.size === list.length) setSelected(new Set());
              else setSelected(new Set(list.map((c) => c.id)));
            }}
            className="px-3 py-1.5 rounded-full bg-secondary text-xs font-semibold"
          >
            {selected.size === list.length && list.length > 0 ? "Clear all" : "Select all"}
          </button>
          <span className="text-xs text-muted-foreground flex-1">{selected.size} selected</span>
          <button
            disabled={selected.size === 0}
            onClick={() => setConfirmOpen(true)}
            className="px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
          >
            <Trash2 className="size-3.5" /> Delete {selected.size || ""}
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <div className="bg-card card-shadow rounded-2xl p-8 text-center text-sm text-muted-foreground">
          No {tab}s yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => {
            const isSelected = selected.has(c.id);
            const inner = (
              <div className="flex items-center justify-between gap-2">
                {selectMode && (
                  <input
                    type="checkbox"
                    readOnly
                    checked={isSelected}
                    className="size-5 accent-primary shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="size-3" />
                    <a
                      href={`tel:${c.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline hover:text-primary transition inline-flex items-center gap-0.5 cursor-pointer font-medium"
                    >
                      {c.phone}
                    </a>
                  </p>
                  {c.address && (
                    <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5">
                      {c.address}
                    </p>
                  )}
                  {c.reference && (
                    <p className="text-[10px] text-primary/80 truncate mt-0.5">
                      ref: {c.reference}
                    </p>
                  )}
                  {c.measurements && c.measurements.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-border/10">
                      {c.measurements.map((m, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground font-semibold"
                        >
                          {m.label}: <span className="text-foreground font-bold">{m.value}"</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {c.count} order{c.count !== 1 && "s"}
                  </p>
                  {c.collected > 0 && (
                    <p className="text-xs text-success font-semibold">
                      {fmtINR(c.collected)} collected
                    </p>
                  )}
                  {c.due > 0 && (
                    <p className="text-xs text-destructive font-semibold">{fmtINR(c.due)} due</p>
                  )}
                </div>
              </div>
            );
            const cls = cn(
              "block bg-card card-shadow rounded-2xl p-4 active:scale-[0.99] transition w-full text-left",
              isSelected && "ring-2 ring-primary",
            );
            return (
              <li key={c.id}>
                {selectMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(c.id)) next.delete(c.id);
                        else next.add(c.id);
                        return next;
                      });
                    }}
                    className={cls}
                  >
                    {inner}
                  </button>
                ) : (
                  <SwipeableCard id={c.id} kind={c.kind ?? "client"} cls={cls}>
                    {inner}
                  </SwipeableCard>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${selected.size} ${tab}${selected.size > 1 ? "s" : ""}?`}
        description="This also deletes their bookings and payments. This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          const n = selected.size;
          const ids = Array.from(selected);
          ids.forEach((id) => deleteCustomer(id));
          setSelected(new Set());
          setSelectMode(false);
          setConfirmOpen(false);
          toast.success(`${n} ${tab}${n > 1 ? "s" : ""} deleted`, {
            action: {
              label: "Undo",
              onClick: () => {
                ids.forEach((id) => restoreCustomer(id));
                toast.success("Customers restored");
              },
            },
            duration: 6000,
          });
        }}
        confirmText="Yes, delete it"
        cancelText="Cancel"
      />
      <MapPicker
        open={showMapPicker}
        onOpenChange={setShowMapPicker}
        onConfirm={(url) => setLocationUrl(url)}
      />
    </AppShell>
  );
}

// Swipeable card — swipe left to reveal Book button
function SwipeableCard({
  id,
  kind,
  cls,
  children,
}: {
  id: string;
  kind: "client" | "artist";
  cls: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const dirLocked = useRef<"h" | "v" | null>(null);
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const revealedRef = useRef(false);
  const offsetRef = useRef(0);
  const activeSwipe = useRef(false);
  const THRESHOLD = 55;
  const BOOK_WIDTH = 62;
  const GAP = 6;

  useEffect(() => {
    revealedRef.current = revealed;
  }, [revealed]);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  // Non-passive touchmove: lets us call preventDefault to stop scroll during horizontal swipe
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: TouchEvent) => {
      if (startX.current === null || startY.current === null) return;
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;
      if (!dirLocked.current) {
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          dirLocked.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        }
        return;
      }
      if (dirLocked.current === "v") return;
      e.preventDefault();
      activeSwipe.current = true;
      if (dx < 0) {
        setOffset(Math.max(dx, -(BOOK_WIDTH + GAP + 6)));
      } else if (revealedRef.current) {
        setOffset(Math.min(0, -(BOOK_WIDTH + GAP) + dx));
      }
    };
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    dirLocked.current = null;
    activeSwipe.current = false;
  };

  const onTouchEnd = () => {
    if (dirLocked.current === "h") {
      if (offsetRef.current < -THRESHOLD) {
        setRevealed(true);
        setOffset(-(BOOK_WIDTH + GAP));
      } else {
        setRevealed(false);
        setOffset(0);
      }
    }
    startX.current = null;
    startY.current = null;
    dirLocked.current = null;
  };

  const handleBook = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const search = kind === "client" ? { customerId: id } : { artistId: id };
    navigate({ to: "/new", search });
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", overflow: "hidden", borderRadius: "1rem" }}
    >
      {/* Book button behind the card, with GAP spacing */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: BOOK_WIDTH + GAP,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={handleBook}
          style={{ width: BOOK_WIDTH, height: "calc(100% - 8px)" }}
          className="saree-gradient rounded-2xl flex flex-col items-center justify-center gap-0.5 text-white cursor-pointer active:brightness-90"
        >
          <CalendarPlus className="size-4" />
          <span className="text-[9px] font-bold uppercase tracking-wide leading-none">Book</span>
        </button>
      </div>

      {/* Card slides left on swipe */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: activeSwipe.current ? "none" : "transform 0.22s cubic-bezier(.4,0,.2,1)",
          willChange: "transform",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => {
          if (revealed) {
            setRevealed(false);
            setOffset(0);
          }
        }}
      >
        <Link to="/customers/$id" params={{ id }} className={cls}>
          {children}
        </Link>
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger" | "muted";
}) {
  const toneClass = {
    default: "bg-card text-foreground",
    success: "bg-success/10 text-success",
    danger: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <div
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 flex items-baseline gap-1.5 card-shadow",
        toneClass,
      )}
    >
      <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
      <span className="text-xs font-bold tabular-nums">{value}</span>
    </div>
  );
}
