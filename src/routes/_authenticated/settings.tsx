import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, fmtINR, type ThemeName, fmtTime12 } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import {
  IndianRupee,
  Plus,
  X,
  Upload,
  Minus,
  LogOut,
  Cloud,
  Download,
  RotateCcw,
  Palette,
  Database,
  User,
  Trash2,
  RotateCw,
  Activity,
  Undo2,
  Redo2,
  Tag,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  Search,
  CreditCard,
  Lock,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/eyas-logo.png";
import { formatDistanceToNow } from "date-fns";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const APP_VERSION = "1.0.0";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Eyas Saree Drapist" }] }),
  component: SettingsPage,
});

type TabId = "pricing" | "headers" | "theme" | "data" | "account" | "help";
const TABS: { id: TabId; label: string; hint: string; icon: typeof Palette }[] = [
  { id: "pricing", label: "Pricing", hint: "Defaults & measures", icon: IndianRupee },
  { id: "theme", label: "Theme & Brand", hint: "Logo, name & colors", icon: Palette },
  { id: "headers", label: "Headers", hint: "Categories & modes", icon: Tag },
  { id: "data", label: "Data & Recovery", hint: "Backup, log & reset", icon: Database },
  { id: "account", label: "Account", hint: "Sign in & sync", icon: User },
  { id: "help", label: "Help", hint: "Docs & guide", icon: HelpCircle },
];

const THEMES: {
  id: ThemeName;
  label: string;
  bg: string;
  fg: string;
  card: string;
  primary: string;
  accent: string;
  border: string;
}[] = [
  {
    id: "royal",
    label: "Royal Violet",
    bg: "#f0eefa",
    fg: "#1c1340",
    card: "#ffffff",
    primary: "#5b3fc8",
    accent: "#cfc5f0",
    border: "#dcd5ee",
  },
  {
    id: "maroon",
    label: "Maroon Ivory",
    bg: "#fdf8ef",
    fg: "#3a1010",
    card: "#ffffff",
    primary: "#7a1f2a",
    accent: "#e8c878",
    border: "#e7dccb",
  },
  {
    id: "midnight",
    label: "Midnight",
    bg: "#1a1014",
    fg: "#f5ecd9",
    card: "#2a1c20",
    primary: "#c5483f",
    accent: "#5a3a35",
    border: "#3a2c30",
  },
  {
    id: "emerald",
    label: "Emerald",
    bg: "#eef7f1",
    fg: "#102a1c",
    card: "#ffffff",
    primary: "#1f6b4a",
    accent: "#bfe3cc",
    border: "#d4e7da",
  },
  {
    id: "rose",
    label: "Rose Pink",
    bg: "#fdeef3",
    fg: "#3a1024",
    card: "#ffffff",
    primary: "#c9457e",
    accent: "#f4c4d6",
    border: "#eed4dd",
  },
  {
    id: "sand",
    label: "Sand Desert",
    bg: "#f5ecd9",
    fg: "#3a2614",
    card: "#fdf6e8",
    primary: "#8a5a2a",
    accent: "#dcc299",
    border: "#dcc8a8",
  },
  {
    id: "charcoal",
    label: "Charcoal",
    bg: "#1c1c1c",
    fg: "#f5f5f5",
    card: "#2a2a2a",
    primary: "#d4a24e",
    accent: "#3a342a",
    border: "#3a3a3a",
  },
  {
    id: "gold",
    label: "Pure Gold",
    bg: "#fdf8e8",
    fg: "#3a2614",
    card: "#ffffff",
    primary: "#c89a3a",
    accent: "#f0d77a",
    border: "#ecdca2",
  },
  {
    id: "sunset",
    label: "Sunset Coral",
    bg: "#fef7f2",
    fg: "#3e1b10",
    card: "#ffffff",
    primary: "#c85a3a",
    accent: "#f4cca8",
    border: "#ebdcd0",
  },
  {
    id: "ocean",
    label: "Ocean Breeze",
    bg: "#f2f8fc",
    fg: "#102638",
    card: "#ffffff",
    primary: "#2c78a0",
    accent: "#a8daf4",
    border: "#d0e2eb",
  },
  {
    id: "forest",
    label: "Forest Moss",
    bg: "#f5f8f5",
    fg: "#1a2e1c",
    card: "#ffffff",
    primary: "#3c784e",
    accent: "#c8ecd0",
    border: "#d2e4d6",
  },
  {
    id: "vintage",
    label: "Vintage Plum",
    bg: "#fbf6fc",
    fg: "#301438",
    card: "#ffffff",
    primary: "#8c3c90",
    accent: "#eccef0",
    border: "#e4d2e8",
  },
];

function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const customers = useStore((s) => s.customers);
  const bookings = useStore((s) => s.bookings);
  const trash = useStore((s) => s.trash);
  const restoreBooking = useStore((s) => s.restoreBooking);
  const resetApp = useStore((s) => s.resetApp);
  const fileRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<TabId>("pricing");
  const [presetDraft, setPresetDraft] = useState("");
  const [expCatDraft, setExpCatDraft] = useState("");
  const [incCatDraft, setIncCatDraft] = useState("");
  const [modeDraft, setModeDraft] = useState("");
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    null | "resetTheme" | "resetPricing" | "clearData"
  >(null);
  const [factoryOpen, setFactoryOpen] = useState(false);
  const [factoryTyped, setFactoryTyped] = useState("");
  const [helpQuery, setHelpQuery] = useState("");
  const [dataLocked, setDataLocked] = useState(true);

  useEffect(() => {
    setDataLocked(true);
  }, [tab]);

  // Swipe tab switching on mobile
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const TABS_ORDER: TabId[] = ["pricing", "theme", "headers", "data", "account", "help"];

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Only switch if it is a clear horizontal swipe
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      const idx = TABS_ORDER.indexOf(tab);
      if (dx < 0) {
        // Swipe left -> Next tab
        if (idx < TABS_ORDER.length - 1) {
          setTab(TABS_ORDER[idx + 1]);
          toast.info(`Tab: ${TABS.find((t) => t.id === TABS_ORDER[idx + 1])?.label}`, {
            duration: 800,
          });
        }
      } else {
        // Swipe right -> Prev tab
        if (idx > 0) {
          setTab(TABS_ORDER[idx - 1]);
          toast.info(`Tab: ${TABS.find((t) => t.id === TABS_ORDER[idx - 1])?.label}`, {
            duration: 800,
          });
        }
      }
    }
  };

  const onLogoPick = (file: File) => {
    if (file.size > 1_500_000) return toast.error("Logo must be under 1.5MB");
    const reader = new FileReader();
    reader.onload = () => {
      update({ logoDataUrl: String(reader.result) });
      toast.success("Logo updated", { duration: 1500 });
    };
    reader.readAsDataURL(file);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (
          !parsed ||
          (parsed.customers && !Array.isArray(parsed.customers)) ||
          (parsed.bookings && !Array.isArray(parsed.bookings)) ||
          (parsed.payments && !Array.isArray(parsed.payments))
        ) {
          toast.error("Invalid backup file format");
          return;
        }

        const ok = window.confirm(
          "Are you sure you want to import? This will overwrite your current local database data.",
        );
        if (!ok) return;

        // Perform import
        useStore.setState({
          customers: parsed.customers || [],
          bookings: parsed.bookings || [],
          payments: parsed.payments || [],
          settings: { ...useStore.getState().settings, ...(parsed.settings || {}) },
          trash: parsed.trash || [],
          activity: parsed.activity || [],
          tombstones: parsed.tombstones || [],
        });

        toast.success("Database imported successfully!");
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse backup file");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // clear input
  };

  return (
    <AppShell wide>
      {/* Sticky Header block (Title + Subtitle) */}
      <div className="sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-20 bg-background/95 backdrop-blur-md -mx-5 px-5 pt-3 pb-2.5 border-b border-border/40 mb-4">
        <h1 className="text-xl font-display font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">Changes save instantly</p>
      </div>

      <div className="grid gap-3 grid-cols-[64px_minmax(0,1fr)] sm:grid-cols-[200px_minmax(0,1fr)]">
        {/* Left rail — icon-only on mobile, full list on desktop */}
        <nav className="sticky top-[calc(env(safe-area-inset-top,0px)+7.75rem)] self-start z-30">
          <ul className="bg-card card-shadow rounded-2xl p-1.5 sm:p-2 space-y-1">
            {TABS.map((t) => {
              const active = tab === t.id;
              const Icon = t.icon;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => setTab(t.id)}
                    title={t.label}
                    className={`w-full flex items-center gap-2.5 px-1.5 sm:px-2.5 py-2 rounded-xl transition ${active ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-secondary text-foreground"}`}
                  >
                    <span
                      className={`size-9 rounded-xl flex items-center justify-center shrink-0 mx-auto sm:mx-0 ${active ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"}`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="hidden sm:block min-w-0 text-left">
                      <span className="block text-sm font-semibold leading-tight">{t.label}</span>
                      <span
                        className={`block text-[10px] leading-tight ${active ? "opacity-80" : "text-muted-foreground"}`}
                      >
                        {t.hint}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="sm:hidden mt-2 text-[10px] text-center font-semibold uppercase tracking-wider text-muted-foreground">
            {TABS.find((t) => t.id === tab)?.label}
          </p>
        </nav>

        <div className="min-w-0" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {tab === "pricing" && (
            <>
              <Section title="Pricing per saree">
                <p className="text-[11px] text-muted-foreground mb-4">
                  Direct client and artist rates. Tap +/- to step by ₹50.
                </p>
                <div className="space-y-5">
                  {/* PrePleat Section */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      PrePleat Rates
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Client Rate
                        </label>
                        <PriceStepper
                          value={settings.prepleatPrice}
                          onChange={(v) => update({ prepleatPrice: v })}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Artist Rate
                        </label>
                        <PriceStepper
                          value={settings.artistPrepleatPrice ?? settings.prepleatPrice}
                          onChange={(v) => update({ artistPrepleatPrice: v })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Drape Section */}
                  <div className="border-t border-border/40 pt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Drape Rates
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Client Rate
                        </label>
                        <PriceStepper
                          value={settings.drapePrice}
                          onChange={(v) => update({ drapePrice: v })}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Artist Rate
                        </label>
                        <PriceStepper
                          value={settings.artistDrapePrice ?? settings.drapePrice}
                          onChange={(v) => update({ artistDrapePrice: v })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Default Measurements">
                <p className="text-xs text-muted-foreground mb-3">
                  Labels (e.g. P, W, H) and default values in inches. Used as start values for new
                  bookings.
                </p>
                <ul className="space-y-2">
                  {settings.defaultMeasurements.map((m, i) => (
                    <li key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                      <input
                        value={m.label}
                        onChange={(e) =>
                          update({
                            defaultMeasurements: settings.defaultMeasurements.map((x, j) =>
                              i === j ? { ...x, label: e.target.value } : x,
                            ),
                          })
                        }
                        placeholder="Label"
                        className="input"
                      />
                      <div className="flex items-center gap-1 bg-secondary rounded-full px-1">
                        <button
                          onClick={() =>
                            update({
                              defaultMeasurements: settings.defaultMeasurements.map((x, j) =>
                                i === j ? { ...x, value: Math.max(10, x.value - 1) } : x,
                              ),
                            })
                          }
                          className="size-7 rounded-full text-base font-bold"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={m.value}
                          onChange={(e) =>
                            update({
                              defaultMeasurements: settings.defaultMeasurements.map((x, j) =>
                                i === j ? { ...x, value: Number(e.target.value) || 0 } : x,
                              ),
                            })
                          }
                          className="w-12 bg-transparent text-center tabular-nums text-sm focus:outline-none"
                        />
                        <button
                          onClick={() =>
                            update({
                              defaultMeasurements: settings.defaultMeasurements.map((x, j) =>
                                i === j ? { ...x, value: x.value + 1 } : x,
                              ),
                            })
                          }
                          className="size-7 rounded-full text-base font-bold"
                        >
                          +
                        </button>
                        <span className="text-[10px] text-muted-foreground pr-1">″</span>
                      </div>
                      <button
                        onClick={() =>
                          update({
                            defaultMeasurements: settings.defaultMeasurements.filter(
                              (_, j) => j !== i,
                            ),
                          })
                        }
                        className="size-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center"
                      >
                        <X className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                {settings.defaultMeasurements.length < 6 && (
                  <button
                    onClick={() =>
                      update({
                        defaultMeasurements: [
                          ...settings.defaultMeasurements,
                          { label: "X", value: 40 },
                        ],
                      })
                    }
                    className="mt-3 text-sm text-primary font-semibold flex items-center gap-1"
                  >
                    <Plus className="size-4" /> Add measurement
                  </button>
                )}
              </Section>

              <Section title="Website (for WhatsApp bills)">
                <input
                  disabled={dataLocked}
                  value={settings.websiteUrl ?? ""}
                  onChange={(e) => update({ websiteUrl: e.target.value })}
                  placeholder="https://eyasdrapist.shop/"
                  className="input"
                />
              </Section>

              <Section title="Calendar Amount Display">
                <p className="text-xs text-muted-foreground mb-3">
                  Configure how bookings amounts are displayed on the main dashboard calendar cells.
                </p>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Amount Display Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "none", label: "Hide" },
                        { id: "pending", label: "Pending Only" },
                        { id: "both", label: "Total & Pending" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        disabled={dataLocked}
                        onClick={() => update({ calendarAmountDisplay: opt.id })}
                        className={cn(
                          "py-2 px-3 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition cursor-pointer active:scale-95 text-center",
                          (settings.calendarAmountDisplay ?? "none") === opt.id
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary hover:bg-secondary/80 text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Section>
            </>
          )}

          {tab === "headers" && (
            <>
              <ChipListSection
                title="Quick Note Presets"
                hint="Tap chips appear under the Notes field when creating a booking."
                placeholder="Add preset (e.g. Engagement)"
                disabled={dataLocked}
                tone="primary"
                items={settings.occasionPresets ?? []}
                draft={presetDraft}
                setDraft={setPresetDraft}
                onAdd={(v) =>
                  update({
                    occasionPresets: Array.from(new Set([...(settings.occasionPresets ?? []), v])),
                  })
                }
                onRemove={(v) =>
                  update({
                    occasionPresets: (settings.occasionPresets ?? []).filter((x) => x !== v),
                  })
                }
              />

              <ChipListSection
                title="Income Categories"
                hint="Headers used when logging extra income (tips, sales, etc.) on the Payments page."
                placeholder="Add income header (e.g. Tips)"
                disabled={dataLocked}
                tone="success"
                items={settings.incomeCategories ?? []}
                draft={incCatDraft}
                setDraft={setIncCatDraft}
                onAdd={(v) =>
                  update({
                    incomeCategories: Array.from(
                      new Set([...(settings.incomeCategories ?? []), v]),
                    ),
                  })
                }
                onRemove={(v) =>
                  update({
                    incomeCategories: (settings.incomeCategories ?? []).filter((x) => x !== v),
                  })
                }
              />

              <ChipListSection
                title="Expense Categories"
                hint="Headers used when logging expenses on the Payments page."
                placeholder="Add expense header (e.g. Material)"
                disabled={dataLocked}
                tone="danger"
                items={settings.expenseCategories ?? []}
                draft={expCatDraft}
                setDraft={setExpCatDraft}
                onAdd={(v) =>
                  update({
                    expenseCategories: Array.from(
                      new Set([...(settings.expenseCategories ?? []), v]),
                    ),
                  })
                }
                onRemove={(v) =>
                  update({
                    expenseCategories: (settings.expenseCategories ?? []).filter((x) => x !== v),
                  })
                }
              />

              <ChipListSection
                title="Payment Modes"
                hint="Add your own payment modes (gpay, cash, card, upi, cheque, etc). Appears when logging income & expenses."
                placeholder="Add payment mode (e.g. UPI)"
                disabled={dataLocked}
                tone="primary"
                items={settings.paymentModes ?? []}
                draft={modeDraft}
                setDraft={setModeDraft}
                onAdd={(v) =>
                  update({
                    paymentModes: Array.from(
                      new Set([...(settings.paymentModes ?? []), v.toLowerCase()]),
                    ),
                  })
                }
                onRemove={(v) =>
                  update({
                    paymentModes: (settings.paymentModes ?? []).filter((x) => x !== v),
                    defaultPaymentMode:
                      settings.defaultPaymentMode === v ? "gpay" : settings.defaultPaymentMode,
                  })
                }
              />
              <Section title="Default Payment Mode">
                <p className="text-xs text-muted-foreground mb-2">
                  Pre-selected when adding a new payment.
                </p>
                <div className="flex flex-wrap gap-2">
                  {(settings.paymentModes ?? []).map((m) => {
                    const active = (settings.defaultPaymentMode ?? "gpay") === m;
                    return (
                      <button
                        key={m}
                        onClick={() => update({ defaultPaymentMode: m })}
                        className={`px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider ${active ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                      >
                        <CreditCard className="inline size-3 mr-1" />
                        {m}
                      </button>
                    );
                  })}
                </div>
              </Section>
            </>
          )}

          {tab === "theme" && (
            <>
              {/* Brand & Logo Section */}
              <Section title="Brand & Logo">
                <div className="flex items-center gap-4">
                  <img
                    src={settings.logoDataUrl || logoAsset}
                    alt="logo"
                    className="size-16 rounded-full object-cover scale-[1.18] ring-2 ring-primary/20"
                  />
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-secondary text-xs font-semibold hover:bg-secondary/80 transition"
                    >
                      <Upload className="size-3.5" /> Change logo
                    </button>
                    {settings.logoDataUrl && (
                      <button
                        onClick={() => {
                          update({ logoDataUrl: undefined });
                          toast.success("Logo reset", { duration: 1200 });
                        }}
                        className="text-[11px] text-muted-foreground underline self-start"
                      >
                        Use default
                      </button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => e.target.files?.[0] && onLogoPick(e.target.files[0])}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Business name
                  </label>
                  <input
                    value={settings.businessName}
                    onChange={(e) => update({ businessName: e.target.value })}
                    className="input mt-1.5"
                  />
                </div>
              </Section>

              {/* Predefined Palettes Section */}
              <Section title="Color Palettes">
                <p className="text-xs text-muted-foreground mb-3">
                  Tap a preset palette to apply instantly.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 animate-in fade-in duration-255">
                  {THEMES.map((t) => {
                    const active = settings.theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          update({ theme: t.id });
                          toast.success(`${t.label} applied`, { duration: 1200 });
                        }}
                        className={`rounded-2xl p-3 text-left border-2 transition hover:opacity-90 active:scale-95 ${active ? "border-primary shadow-sm" : "border-transparent"}`}
                        style={{ background: t.bg, color: t.fg }}
                      >
                        <div className="flex gap-1 mb-2">
                          <span className="size-4 rounded-full" style={{ background: t.primary }} />
                          <span className="size-4 rounded-full" style={{ background: t.accent }} />
                          <span
                            className="size-4 rounded-full border"
                            style={{ background: t.card, borderColor: t.border }}
                          />
                        </div>
                        <p className="text-sm font-semibold">{t.label}</p>
                        {active && (
                          <p className="text-[10px] opacity-70 uppercase tracking-wider mt-0.5 font-bold">
                            Active
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* Custom Theme Section */}
              <Section title="Custom Theme Builder">
                <div className="p-4 rounded-2xl border-2 border-dashed border-border bg-card/30">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-sm font-semibold">Build Your Own Theme</p>
                    {settings.theme === "custom" && (
                      <span className="text-[10px] uppercase tracking-wider text-primary font-bold bg-primary/10 px-2.5 py-0.5 rounded-full">
                        Active Custom Theme
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-4">
                    Pick a quick starting color combo, or customize each color below.
                  </p>

                  {/* Curated mood presets */}
                  <div className="mb-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      Curated Mood Presets
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        {
                          label: "Teal Mint",
                          primary: "#0f766e",
                          accent: "#2dd4bf",
                          background: "#f0fdfa",
                          card: "#ffffff",
                          foreground: "#115e59",
                        },
                        {
                          label: "Indigo",
                          primary: "#4338ca",
                          accent: "#a5b4fc",
                          background: "#eef2ff",
                          card: "#ffffff",
                          foreground: "#312e81",
                        },
                        {
                          label: "Coral Rose",
                          primary: "#e11d48",
                          accent: "#fda4af",
                          background: "#fff1f2",
                          card: "#ffffff",
                          foreground: "#881337",
                        },
                        {
                          label: "Ocean Sky",
                          primary: "#0369a1",
                          accent: "#38bdf8",
                          background: "#f0f9ff",
                          card: "#ffffff",
                          foreground: "#0c4a6e",
                        },
                        {
                          label: "Sage Forest",
                          primary: "#15803d",
                          accent: "#4ade80",
                          background: "#f0fdf4",
                          card: "#ffffff",
                          foreground: "#14532d",
                        },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => {
                            update({
                              theme: "custom",
                              customColors: {
                                primary: p.primary,
                                accent: p.accent,
                                background: p.background,
                                card: p.card,
                                foreground: p.foreground,
                              },
                              customPrimary: p.primary,
                            });
                            toast.success(`${p.label} preset loaded`, { duration: 1200 });
                          }}
                          className="px-2.5 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-[11px] font-semibold transition active:scale-95 flex items-center gap-1.5 cursor-pointer border border-transparent"
                        >
                          <span
                            className="size-2.5 rounded-full"
                            style={{ background: p.primary }}
                          />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Preview Card */}
                  {(() => {
                    const activeThemeObj = THEMES.find((t) => t.id === settings.theme) || THEMES[0];
                    const customColorsState = {
                      primary:
                        settings.customColors?.primary ||
                        settings.customPrimary ||
                        activeThemeObj.primary,
                      accent: settings.customColors?.accent || activeThemeObj.accent,
                      background: settings.customColors?.background || activeThemeObj.bg,
                      card: settings.customColors?.card || activeThemeObj.card,
                      foreground: settings.customColors?.foreground || activeThemeObj.fg,
                    };
                    return (
                      <>
                        <div className="mb-4 p-3.5 rounded-xl border border-border bg-secondary/30">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">
                            Live Theme Preview
                          </span>
                          <div
                            className="rounded-xl p-3 border border-border shadow-sm transition duration-200"
                            style={{
                              background: customColorsState.background,
                              color: customColorsState.foreground,
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="size-3.5 rounded-full"
                                  style={{ background: customColorsState.primary }}
                                />
                                <span className="text-xs font-bold font-display">
                                  Business Header
                                </span>
                              </div>
                              <span
                                className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                                style={{
                                  background: customColorsState.accent,
                                  color: customColorsState.foreground,
                                }}
                              >
                                Active Tab
                              </span>
                            </div>
                            <div
                              className="rounded-lg p-2.5 border border-border/80 shadow-xs"
                              style={{
                                background: customColorsState.card,
                                color: customColorsState.foreground,
                              }}
                            >
                              <p className="text-xs font-bold">Mock Saree Booking Card</p>
                              <p className="text-[9px] opacity-75">
                                Delivery: Mon, Jun 15 · 10:00 AM
                              </p>
                              <div className="flex justify-between items-center mt-2 pt-1 border-t border-border/30">
                                <span
                                  className="text-[10px] font-semibold"
                                  style={{ color: customColorsState.primary }}
                                >
                                  ₹1,200 due
                                </span>
                                <button
                                  type="button"
                                  className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider text-white border-0"
                                  style={{ background: customColorsState.primary }}
                                >
                                  Action Button
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Color pickers grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-4">
                          {[
                            {
                              key: "primary" as const,
                              label: "Brand Primary",
                              desc: "Buttons & highlights",
                            },
                            {
                              key: "accent" as const,
                              label: "Accent Tone",
                              desc: "Pills & borders",
                            },
                            {
                              key: "background" as const,
                              label: "App Backdrop",
                              desc: "Page background",
                            },
                            {
                              key: "card" as const,
                              label: "Cards & Sheets",
                              desc: "Component background",
                            },
                            {
                              key: "foreground" as const,
                              label: "Text & Icons",
                              desc: "Main copy color",
                            },
                          ].map((c) => {
                            const currentVal = customColorsState[c.key];
                            return (
                              <div
                                key={c.key}
                                className="flex flex-col justify-between gap-1.5 p-2.5 rounded-xl bg-card border border-border shadow-xs hover:border-primary/50 transition"
                              >
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-tight">
                                  {c.label}
                                </span>
                                <div className="flex items-center gap-1.5 my-1.5">
                                  <div className="relative size-8 rounded-full border border-border/80 overflow-hidden shadow-xs cursor-pointer">
                                    <input
                                      type="color"
                                      value={currentVal}
                                      onChange={(e) => {
                                        const nextColors = {
                                          ...customColorsState,
                                          [c.key]: e.target.value,
                                        };
                                        update({
                                          theme: "custom",
                                          customColors: nextColors,
                                          customPrimary: nextColors.primary,
                                        });
                                      }}
                                      className="absolute inset-0 size-full border-0 cursor-pointer p-0 opacity-0 z-10"
                                    />
                                    <div
                                      className="absolute inset-0 rounded-full border"
                                      style={{ backgroundColor: currentVal }}
                                    />
                                  </div>
                                  <span className="text-[9px] font-mono uppercase text-muted-foreground">
                                    {currentVal}
                                  </span>
                                </div>
                                <span className="text-[9px] text-muted-foreground/85 leading-tight">
                                  {c.desc}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}

                  {settings.theme === "custom" && (
                    <button
                      onClick={() => {
                        update({
                          customColors: undefined,
                          customPrimary: undefined,
                          theme: "royal",
                        });
                        toast.success("Custom theme reset to default", { duration: 1200 });
                      }}
                      className="mt-4 text-[11px] text-muted-foreground font-semibold hover:text-foreground underline cursor-pointer"
                    >
                      Reset to Royal Violet
                    </button>
                  )}
                </div>
              </Section>

              <Section title="Calendar Dot Colors">
                <p className="text-xs text-muted-foreground mb-4">
                  Customize the color of the small booking dots shown on the calendar cells.
                </p>

                {/* Interactive Day Cell Preview */}
                <div className="mb-4 p-3.5 rounded-xl border border-border bg-secondary/30">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">
                    Day Dot Preview
                  </span>
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-card border border-border shadow-xs flex flex-col items-center justify-between p-2">
                      <span className="text-xs font-bold text-muted-foreground">15</span>
                      <div className="flex gap-1 justify-center">
                        <span
                          className="size-2 rounded-full shadow-xs"
                          style={{ background: settings.prepleatDotColor ?? "#ffa029" }}
                          title="PrePleat"
                        />
                        <span
                          className="size-2 rounded-full shadow-xs"
                          style={{ background: settings.directDrapeDotColor ?? "#10b981" }}
                          title="Direct Drape"
                        />
                        <span
                          className="size-2 rounded-full shadow-xs"
                          style={{ background: settings.artistDotColor ?? "#d4af37" }}
                          title="Artist"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pickers Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {[
                    {
                      key: "prepleatDotColor" as const,
                      label: "PrePleat Dot",
                      def: "#ffa029",
                      desc: "PrePleat bookings color",
                    },
                    {
                      key: "directDrapeDotColor" as const,
                      label: "Direct Drape Dot",
                      def: "#10b981",
                      desc: "Direct drape bookings color",
                    },
                    {
                      key: "artistDotColor" as const,
                      label: "Artist Dot",
                      def: "#d4af37",
                      desc: "Artist bookings color",
                    },
                  ].map((item) => {
                    const val = settings[item.key] || item.def;
                    return (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition"
                      >
                        <div className="relative size-9 rounded-full border border-border/85 overflow-hidden shadow-xs cursor-pointer">
                          <input
                            type="color"
                            value={val}
                            onChange={(e) => update({ [item.key]: e.target.value })}
                            className="absolute inset-0 size-full border-0 cursor-pointer p-0 opacity-0 z-10"
                          />
                          <div
                            className="absolute inset-0 rounded-full border"
                            style={{ backgroundColor: val }}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-foreground leading-tight">
                            {item.label}
                          </span>
                          <span className="block text-[9px] text-muted-foreground font-mono uppercase mt-0.5">
                            {val}
                          </span>
                          <span className="block text-[9px] text-muted-foreground/80 mt-0.5 leading-none">
                            {item.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>

              <Section title="Pop-up Notification Preview">
                <p className="text-xs text-muted-foreground mb-3">
                  Test how notifications look and animate in the center of the screen matching your
                  active theme.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => toast.success("Success! Booking saved successfully.")}
                    className="px-3 py-1.5 rounded-full bg-success/10 hover:bg-success/15 border border-success/20 text-success text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                  >
                    <span className="size-2 rounded-full bg-success" /> Success Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.warning("Warning! Low measurement value detected.")}
                    className="px-3 py-1.5 rounded-full bg-warning/10 hover:bg-warning/15 border border-warning/20 text-warning text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                  >
                    <span className="size-2 rounded-full bg-warning" /> Warning Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.error("Error! Failed to authenticate session.")}
                    className="px-3 py-1.5 rounded-full bg-destructive/10 hover:bg-destructive/15 border border-destructive/20 text-destructive text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                  >
                    <span className="size-2 rounded-full bg-destructive" /> Error Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.info("Info! Backup file generated successfully.")}
                    className="px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15 border border-primary/20 text-primary text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                  >
                    <span className="size-2 rounded-full bg-primary" /> Info Preview
                  </button>
                </div>
              </Section>
            </>
          )}

          {tab === "data" && (
            <>
              <Section title="Data Overview">
                <p className="text-xs text-muted-foreground">
                  {customers.length} customers · {bookings.length} bookings ·{" "}
                  {fmtINR(bookings.reduce((s, b) => s + b.totalAmount, 0))} lifetime
                </p>
                <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Cloud className="size-3" /> Auto-syncs to your account.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={() => {
                      const data = {
                        exportedAt: new Date().toISOString(),
                        customers,
                        bookings,
                        payments: useStore.getState().payments,
                        settings,
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], {
                        type: "application/json",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `eyas-backup-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Backup downloaded", { duration: 1500 });
                    }}
                    className="px-3 py-2 rounded-full bg-secondary text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-secondary/80"
                  >
                    <Download className="size-3.5" /> Export JSON
                  </button>
                  <button
                    onClick={() => importFileRef.current?.click()}
                    className="px-3 py-2 rounded-full bg-secondary text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-secondary/80"
                  >
                    <Upload className="size-3.5" /> Import JSON
                  </button>
                  <button
                    onClick={() => {
                      const rows = [
                        [
                          "Date",
                          "Time",
                          "Customer",
                          "Phone",
                          "Service",
                          "Sarees",
                          "Total",
                          "Paid",
                          "Due",
                          "Status",
                        ],
                      ];
                      for (const b of bookings) {
                        const c = customers.find((x) => x.id === b.customerId);
                        rows.push([
                          b.deliveryDate.slice(0, 10),
                          b.deliveryTime,
                          c?.name ?? "",
                          c?.phone ?? "",
                          b.service,
                          String(b.sareeCount),
                          String(b.totalAmount),
                          String(b.advancePaid),
                          String(Math.max(0, b.totalAmount - b.advancePaid)),
                          b.status,
                        ]);
                      }
                      const csv = rows
                        .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
                        .join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `eyas-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("CSV exported", { duration: 1500 });
                    }}
                    className="col-span-2 px-3 py-2 rounded-full bg-secondary text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-secondary/80"
                  >
                    <Download className="size-3.5" /> Export CSV
                  </button>
                </div>
                <input
                  type="file"
                  ref={importFileRef}
                  onChange={handleImportJSON}
                  accept=".json"
                  className="hidden"
                />
              </Section>

              {/* Recovery Accordion */}
              <Accordion type="single" collapsible className="w-full mb-3">
                <AccordionItem
                  value="activity-log"
                  className="border border-border bg-card rounded-2xl px-4 py-1 mb-2.5 card-shadow"
                >
                  <AccordionTrigger className="hover:no-underline py-3.5 cursor-pointer">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <Activity className="size-4 text-primary" /> Activity Log & Undo / Redo
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        Undo last edit or revert specific changes
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <ActivityBlock />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="recently-deleted"
                  className="border border-border bg-card rounded-2xl px-4 py-1 card-shadow"
                >
                  <AccordionTrigger className="hover:no-underline py-3.5 cursor-pointer">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <Trash2 className="size-4 text-primary" /> Recently Deleted Bin (
                        {trash.length})
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        Restore bookings deleted in the last 7 days
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    {trash.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 text-center">
                        No deleted bookings in recycle bin.
                      </p>
                    ) : (
                      <ul className="space-y-2 mt-2">
                        {trash.map((t) => {
                          const c = customers.find((x) => x.id === t.booking.customerId);
                          return (
                            <li
                              key={t.booking.id}
                              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-secondary/50"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate">
                                  {c?.name ?? "Unknown"} · {t.booking.service}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {t.booking.deliveryDate.slice(0, 10)} ·{" "}
                                  {fmtTime12(t.booking.deliveryTime)} ·{" "}
                                  {fmtINR(t.booking.totalAmount)}
                                </p>
                              </div>
                              <button
                                onClick={() => setRestoreId(t.booking.id)}
                                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition"
                              >
                                <RotateCw className="size-3" /> Restore
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Section title="Reset & Danger Zone">
                {dataLocked ? (
                  <div className="flex flex-col items-center justify-center py-6 bg-destructive/5 border border-dashed border-destructive/20 rounded-2xl text-center">
                    <div className="size-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
                      <Lock className="size-4.5" />
                    </div>
                    <p className="text-xs font-bold text-foreground mb-0.5">Danger Zone Locked</p>
                    <p className="text-[10px] text-muted-foreground max-w-xs mb-3 px-4">
                      Contains sensitive actions that can reset pricing, styles, or permanently
                      delete data.
                    </p>
                    <button
                      onClick={() => {
                        setDataLocked(false);
                        toast.success("Danger zone unlocked", { duration: 1500 });
                      }}
                      className="px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition"
                    >
                      <Unlock className="size-3.5" /> Unlock Actions
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between bg-destructive/10 px-3.5 py-2.5 rounded-xl border border-destructive/25 mb-1">
                      <span className="text-[10px] font-bold text-destructive flex items-center gap-1.5 uppercase tracking-wider">
                        <Unlock className="size-3.5" /> Danger zone unlocked
                      </span>
                      <button
                        onClick={() => {
                          setDataLocked(true);
                          toast.info("Danger zone locked", { duration: 1000 });
                        }}
                        className="text-[10px] font-bold text-muted-foreground underline cursor-pointer"
                      >
                        Lock again
                      </button>
                    </div>
                    <button
                      onClick={() => setConfirmAction("resetTheme")}
                      className="w-full px-3 py-2 rounded-full bg-secondary text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-secondary/80"
                    >
                      <RotateCcw className="size-3.5" /> Reset theme
                    </button>
                    <button
                      onClick={() => setConfirmAction("resetPricing")}
                      className="w-full px-3 py-2 rounded-full bg-secondary text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-secondary/80"
                    >
                      <RotateCcw className="size-3.5" /> Reset pricing & measurements
                    </button>
                    <button
                      onClick={() => setConfirmAction("clearData")}
                      className="w-full px-3 py-2 rounded-full bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-destructive/15"
                    >
                      <Trash2 className="size-3.5" /> Clear all data
                    </button>
                    <button
                      onClick={() => {
                        setFactoryTyped("");
                        setFactoryOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-destructive/90"
                    >
                      <AlertTriangle className="size-3.5" /> Factory reset (like new)
                    </button>
                    <p className="text-[11px] text-muted-foreground text-center mt-1">
                      Clear-all-data supports Undo for ~8 seconds. Factory reset is permanent.
                    </p>
                  </div>
                )}
              </Section>
            </>
          )}

          {tab === "account" && (
            <Section title="Account">
              <AccountBlock />
            </Section>
          )}

          {tab === "help" && <HelpBlock query={helpQuery} setQuery={setHelpQuery} />}
        </div>
        <p className="mt-6 text-center text-[11px] text-muted-foreground/70 tabular-nums">
          App version v{APP_VERSION}
        </p>
      </div>

      <style>{`.input { background: var(--color-secondary); border-radius: 9999px; padding: 0.6rem 0.9rem; font-size: 0.875rem; outline: none; width: 100%; color: var(--color-foreground); }
      .input:focus { box-shadow: 0 0 0 2px var(--color-primary); }`}</style>

      <ConfirmDialog
        open={!!restoreId}
        onOpenChange={(v) => !v && setRestoreId(null)}
        title="Restore this booking?"
        description="It will be moved back to the active bookings list with its payments."
        confirmLabel="Restore"
        onConfirm={() => {
          if (restoreId) {
            restoreBooking(restoreId);
            toast.success("Booking restored");
          }
          setRestoreId(null);
        }}
      />

      <ConfirmDialog
        open={confirmAction === "resetTheme"}
        onOpenChange={(v) => !v && setConfirmAction(null)}
        title="Reset theme to default?"
        description="Switches back to Royal Violet and clears custom colours."
        confirmLabel="Reset"
        onConfirm={() => {
          update({ theme: "royal", customPrimary: undefined, customColors: undefined });
          toast.success("Theme reset");
          setConfirmAction(null);
        }}
      />

      <ConfirmDialog
        open={confirmAction === "resetPricing"}
        onOpenChange={(v) => !v && setConfirmAction(null)}
        title="Reset pricing & measurements?"
        description="Restores default prices (₹350 / ₹800) and default Pallu/Waist/Hip measurements."
        confirmLabel="Reset"
        onConfirm={() => {
          update({
            prepleatPrice: 350,
            drapePrice: 800,
            defaultMeasurements: [
              { label: "Pallu", value: 40 },
              { label: "Waist", value: 32 },
              { label: "Hip", value: 38 },
            ],
            defaultPaymentMode: "gpay",
          });
          toast.success("Defaults restored");
          setConfirmAction(null);
        }}
      />

      <ConfirmDialog
        open={confirmAction === "clearData"}
        onOpenChange={(v) => !v && setConfirmAction(null)}
        title="Delete all bookings, customers & payments?"
        description="Your settings, theme and categories are kept. You can Undo from the toast for ~8 seconds."
        confirmLabel="Delete all"
        tone="danger"
        onConfirm={() => {
          const snap = {
            bookings: useStore.getState().bookings,
            customers: useStore.getState().customers,
            payments: useStore.getState().payments,
            trash: useStore.getState().trash,
            expenses: useStore.getState().expenses,
            extraIncomes: useStore.getState().extraIncomes,
            activity: useStore.getState().activity,
            redoStack: useStore.getState().redoStack,
          };
          useStore.setState({
            bookings: [],
            customers: [],
            payments: [],
            trash: [],
            expenses: [],
            extraIncomes: [],
            activity: [],
            redoStack: [],
          });
          toast.success("All data cleared", {
            duration: 8000,
            action: {
              label: "Undo",
              onClick: () => {
                useStore.setState(snap);
                toast.success("Data restored", { duration: 1500 });
              },
            },
          });
          setConfirmAction(null);
        }}
      />

      <FactoryResetDialog
        open={factoryOpen}
        typed={factoryTyped}
        setTyped={setFactoryTyped}
        onOpenChange={(v) => {
          setFactoryOpen(v);
          if (!v) setFactoryTyped("");
        }}
        onConfirm={() => {
          resetApp();
          toast.success("App reset to defaults");
          setFactoryOpen(false);
          setFactoryTyped("");
        }}
      />
    </AppShell>
  );
}

function AccountBlock() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [isGuest, setIsGuest] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      setIsGuest(!!data.user?.is_anonymous);
    });
  }, []);
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">
          {isGuest ? "Guest account" : email || "Signed in"}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {isGuest
            ? "Sign in with Google to keep your data safe across devices."
            : "Your data syncs to the cloud."}
        </p>
      </div>
      <button
        onClick={signOut}
        className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-full bg-secondary text-sm font-medium"
      >
        <LogOut className="size-3.5" /> Sign out
      </button>
    </div>
  );
}

function PriceStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1 bg-secondary rounded-full px-1 w-full max-w-[150px]">
      <button
        onClick={() => onChange(Math.max(0, value - 50))}
        className="size-7 rounded-full flex items-center justify-center"
      >
        <Minus className="size-3" />
      </button>
      <div className="relative flex-1 min-w-0">
        <IndianRupee className="absolute left-1.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-transparent pl-5 pr-1 py-1.5 text-sm text-right tabular-nums focus:outline-none"
        />
      </div>
      <button
        onClick={() => onChange(value + 50)}
        className="size-7 rounded-full flex items-center justify-center"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}

function FactoryResetDialog({
  open,
  onOpenChange,
  typed,
  setTyped,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  typed: string;
  setTyped: (v: string) => void;
  onConfirm: () => void;
}) {
  const ok = typed.trim().toUpperCase() === "RESET";
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl max-w-sm">
        <AlertDialogHeader>
          <div className="mx-auto sm:mx-0 size-11 rounded-full flex items-center justify-center bg-destructive/15 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <AlertDialogTitle>Factory reset the entire app?</AlertDialogTitle>
          <AlertDialogDescription>
            This wipes ALL bookings, customers, payments, expenses, settings, theme, categories,
            activity log and the recycle bin. The app will be like newly installed. This cannot be
            undone.
            <br />
            <br />
            Type <span className="font-bold text-destructive">RESET</span> to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Type RESET"
          className="w-full bg-secondary rounded-full px-4 py-2.5 text-sm tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-destructive/40"
        />
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!ok}
            onClick={() => ok && onConfirm()}
            className={`rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40 disabled:pointer-events-none`}
          >
            Reset everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const HELP_DOCS: { title: string; body: string }[] = [
  {
    title: "Creating a booking",
    body: "Tap the + button on the bottom nav. Pick service (PrePleat or Drape), saree count, delivery date & time. For direct clients enter name + mobile. For artist-via-booking, client name and number are optional. Advance paid auto-creates a payment entry.",
  },
  {
    title: "Bill numbers",
    body: "Every booking gets an auto bill number like EYAS-YYYYMM-NNNN. Used on the PDF bill and visible in the bookings list.",
  },
  {
    title: "PDF bill download",
    body: "Open any booking → tap Bill / Download PDF. Includes logo, bill no, customer, delivery info, items, totals, payment history and a PAID/DUE stamp.",
  },
  {
    title: "Payments — income & expenses",
    body: "Payments page has three tabs: Income, Expenses, Summary. Add expenses or extra income with the floating + button. Each entry has Category, Mode, Date, Note. Modes and headers come from Settings → Headers.",
  },
  {
    title: "Headers / Categories",
    body: "Settings → Headers lets you add custom Income headers, Expense headers, Quick note presets and Payment Modes. Add by typing + Enter; remove with the × on each chip.",
  },
  {
    title: "Payment modes",
    body: "Add as many modes as you like (gpay, cash, card, upi, cheque…). Pick the default in Settings → Headers → Default Payment Mode. Used on income/expense add sheets.",
  },
  {
    title: "Theme & brand",
    body: "Settings → Theme: pick from 8 palettes or Build-your-own. Settings → Brand: upload your logo (under 1.5MB) and change the business name. The logo shows on bills, app icon when installed, and the home screen.",
  },
  {
    title: "Pricing defaults",
    body: "Settings → Pricing: set default per-saree price for Direct Client and Artist for both PrePleat and Drape. New bookings start with these and can be edited per booking.",
  },
  {
    title: "Default measurements",
    body: "Settings → Pricing → Default Measurements: set P, W, H (or any labels) and starting inches. Used when creating new bookings.",
  },
  {
    title: "Bulk select & delete",
    body: "On Bookings and Customers pages, tap Select in the header. Tick rows or use Select All, then Delete N. Deleted bookings go to the 7-day recycle bin.",
  },
  {
    title: "Recycle bin / restore",
    body: "Settings → Data → Recently Deleted: shows bookings deleted in the last 7 days. Tap Restore to bring back the booking with its payments.",
  },
  {
    title: "Activity log & Undo",
    body: "Settings → Activity: last 50 actions. Use Undo last edit / Redo, or tap the revert icon on any edit/cancel entry to restore that exact change. Search by name or detail.",
  },
  {
    title: "Backup — export JSON / CSV",
    body: "Settings → Data → Export JSON (full backup) or Export CSV (bookings only). Keep monthly backups on your phone.",
  },
  {
    title: "Clear all data (with Undo)",
    body: "Settings → Data → Clear all data: removes bookings, customers, payments, expenses & extra income. Settings and theme are kept. You can Undo from the toast for 8 seconds.",
  },
  {
    title: "Factory reset",
    body: "Settings → Data → Factory reset wipes EVERYTHING — like a fresh install. You must type RESET to confirm. Cannot be undone — export a backup first.",
  },
  {
    title: "Cloud sync & sign in",
    body: "Settings → Account: sign in with Google to sync data across devices. Guest accounts keep data on this device only.",
  },
  {
    title: "Install as app",
    body: "Open the published site in Chrome or Safari → Menu → Install / Add to Home Screen. Uses your business logo as the app icon.",
  },
];

function HelpBlock({ query, setQuery }: { query: string; setQuery: (v: string) => void }) {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? HELP_DOCS.filter((d) => d.title.toLowerCase().includes(q) || d.body.toLowerCase().includes(q))
    : HELP_DOCS;

  const handleStartTour = () => {
    window.dispatchEvent(new Event("trigger-app-tour"));
  };

  return (
    <div className="space-y-4">
      <Section title="Interactive Guide">
        <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <Sparkles className="size-4 text-primary animate-pulse shrink-0" />
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-foreground">Shortcuts Tour</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                Interactive onboarding guide
              </p>
            </div>
          </div>
          <button
            onClick={handleStartTour}
            className="shrink-0 px-3 py-1.5 rounded-lg saree-gradient text-primary-foreground text-[10px] font-extrabold uppercase tracking-wider active:scale-95 transition cursor-pointer shadow-sm shadow-primary/20"
          >
            Start Tour
          </button>
        </div>
      </Section>

      <Section title="Quick Shortcuts & Gestures">
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-xs leading-relaxed">
            <span className="text-base select-none shrink-0">📅</span>
            <div>
              <p className="font-semibold text-foreground">Calendar Double-Tap / Double-Click</p>
              <p className="text-muted-foreground">
                Double-tap any date on the calendar grid to quickly open the booking page for that
                date.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-xs leading-relaxed border-t border-border/40 pt-2.5">
            <span className="text-base select-none shrink-0">👁️</span>
            <div>
              <p className="font-semibold text-foreground">Calendar Long-Press (Peek)</p>
              <p className="text-muted-foreground">
                Long-press (hold) any date on the calendar grid to peek at bookings for that day
                without leaving the page.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-xs leading-relaxed border-t border-border/40 pt-2.5">
            <span className="text-base select-none shrink-0">↔️</span>
            <div>
              <p className="font-semibold text-foreground">Calendar Swipe Gestures</p>
              <p className="text-muted-foreground">
                Swipe left or right on the calendar grid to change months, or swipe left/right on
                the day's booking list to switch days.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-xs leading-relaxed border-t border-border/40 pt-2.5">
            <span className="text-base select-none shrink-0">⚡</span>
            <div>
              <p className="font-semibold text-foreground">Bottom Nav Calendar Double-Click</p>
              <p className="text-muted-foreground">
                Double-click or double-tap the **Calendar** icon in the bottom navbar to navigate
                straight to the **Bookings** list.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-xs leading-relaxed border-t border-border/40 pt-2.5">
            <span className="text-base select-none shrink-0">🖐️</span>
            <div>
              <p className="font-semibold text-foreground">Settings Tab Swiping</p>
              <p className="text-muted-foreground">
                Swipe left or right on any Settings tab view to easily cycle between different
                configuration tabs on mobile.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-xs leading-relaxed border-t border-border/40 pt-2.5">
            <span className="text-base select-none shrink-0">↩️</span>
            <div>
              <p className="font-semibold text-foreground">Activity Log Quick Revert</p>
              <p className="text-muted-foreground">
                Click the revert button on any activity log entry (under Settings → Data) to
                instantly undo/restore that edit or cancellation.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section title={`Documentation (${filtered.length}${q ? ` / ${HELP_DOCS.length}` : ""})`}>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs (e.g. backup, theme, modes)…"
            className="w-full bg-secondary rounded-full pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-full bg-card/80 flex items-center justify-center"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No matching topics. Try another keyword.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((d) => (
              <li key={d.title} className="rounded-xl bg-secondary/50 p-3">
                <p className="text-sm font-semibold mb-1">{d.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{d.body}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-[10px] text-muted-foreground/70 text-center">
          Need more help? Contact your developer.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ChipListSection({
  title,
  hint,
  placeholder,
  tone,
  items,
  draft,
  setDraft,
  onAdd,
  onRemove,
  disabled,
}: {
  title: string;
  hint: string;
  placeholder: string;
  tone: "primary" | "success" | "danger";
  items: string[];
  draft: string;
  setDraft: (v: string) => void;
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  disabled?: boolean;
}) {
  const toneClasses = {
    success: "bg-success/10 border border-success/30 text-success shadow-sm",
    danger: "bg-destructive/10 border border-destructive/30 text-destructive shadow-sm",
    primary: "bg-primary/10 border border-primary/30 text-primary shadow-sm",
  }[tone];
  const submit = () => {
    const v = draft.trim();
    if (!v || items.includes(v)) {
      setDraft("");
      return;
    }
    onAdd(v);
    setDraft("");
  };
  return (
    <Section title={title}>
      <p className="text-xs text-muted-foreground mb-2">{hint}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {items.map((p) => (
          <span
            key={p}
            className={cn(
              "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 hover:scale-[1.02]",
              toneClasses,
            )}
          >
            {p}
            <button
              disabled={disabled}
              onClick={() => !disabled && onRemove(p)}
              className={cn(
                "opacity-70 hover:opacity-100 p-0.5 rounded-full hover:bg-foreground/10 transition-all shrink-0 cursor-pointer ml-1",
                disabled && "pointer-events-none opacity-30",
              )}
              aria-label={`Remove ${p}`}
            >
              <X className="size-2.5" />
            </button>
          </span>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground italic">None yet.</p>}
      </div>
      <div className="flex gap-2">
        <input
          disabled={disabled}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !disabled) submit();
          }}
          placeholder={placeholder}
          className="input flex-1"
        />
        <button
          disabled={disabled}
          onClick={submit}
          className={cn(
            "px-4 rounded-full saree-gradient text-primary-foreground text-sm font-semibold",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          Add
        </button>
      </div>
    </Section>
  );
}

function ActivityBlock() {
  const activity = useStore((s) => s.activity);
  const redoStack = useStore((s) => s.redoStack);
  const undoLast = useStore((s) => s.undoLastEdit);
  const redoLast = useStore((s) => s.redoLastEdit);
  const undoEntry = useStore((s) => s.undoActivityEntry);
  const clearActivity = useStore((s) => s.clearActivity);
  const customers = useStore((s) => s.customers);
  const bookings = useStore((s) => s.bookings);
  const [query, setQuery] = useState("");

  const canUndo = activity.some((e) => e.kind === "update" && e.prev && e.next);
  const canRedo = redoStack.length > 0;

  const nameFor = (bid?: string) => {
    if (!bid) return "";
    const b = bookings.find((x) => x.id === bid);
    const c = customers.find((x) => x.id === b?.customerId);
    return c?.name ?? "—";
  };

  const kindStyle: Record<string, string> = {
    create: "bg-success/15 text-success",
    update: "bg-primary/15 text-primary",
    delete: "bg-destructive/15 text-destructive",
    restore: "bg-secondary text-foreground",
    cancel: "bg-destructive/15 text-destructive",
    "payment-add": "bg-success/15 text-success",
    "payment-delete": "bg-destructive/15 text-destructive",
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? activity.filter((e) => {
        const name = nameFor(e.bookingId).toLowerCase();
        return (
          e.kind.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          name.includes(q)
        );
      })
    : activity;

  return (
    <>
      <Section title="Undo / Redo edits">
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={!canUndo}
            onClick={() => {
              const ok = undoLast();
              if (ok) toast.success("Edit undone");
              else toast.error("Nothing to undo");
            }}
            className="px-3 py-2 rounded-full bg-secondary text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Undo2 className="size-3.5" /> Undo last edit
          </button>
          <button
            disabled={!canRedo}
            onClick={() => {
              const ok = redoLast();
              if (ok) toast.success("Edit redone");
              else toast.error("Nothing to redo");
            }}
            className="px-3 py-2 rounded-full bg-secondary text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Redo2 className="size-3.5" /> Redo
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Tap the revert icon on any edit/cancel entry below to restore that specific change.
        </p>
      </Section>

      <Section title={`Activity log (${filtered.length}${q ? ` / ${activity.length}` : ""})`}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, action or detail…"
          className="input w-full mb-2"
        />
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {q ? "No matching activity." : "No activity yet."}
          </p>
        ) : (
          <>
            <ul className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
              {filtered.map((e) => {
                const revertable = !!(
                  e.prev &&
                  e.bookingId &&
                  (e.kind === "update" || e.kind === "cancel")
                );
                return (
                  <li key={e.id} className="flex items-start gap-2 p-2 rounded-xl bg-secondary/40">
                    <span
                      className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${kindStyle[e.kind] ?? "bg-secondary"}`}
                    >
                      {e.kind}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{nameFor(e.bookingId) || "—"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{e.summary}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                      {formatDistanceToNow(new Date(e.ts), { addSuffix: false })}
                    </span>
                    {revertable && (
                      <button
                        title="Revert this change"
                        onClick={() => {
                          const ok = undoEntry(e.id);
                          if (ok) toast.success("Change reverted");
                          else toast.error("Cannot revert");
                        }}
                        className="shrink-0 size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20"
                      >
                        <Undo2 className="size-3" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <button
              onClick={() => {
                clearActivity();
                toast.success("Activity cleared");
              }}
              className="mt-3 w-full px-3 py-2 rounded-full bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Trash2 className="size-3.5" /> Clear activity log
            </button>
          </>
        )}
      </Section>
    </>
  );
}
