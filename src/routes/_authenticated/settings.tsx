import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, fmtINR, type ThemeName, fmtTime12 } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import { IndianRupee, Plus, X, Upload, Minus, LogOut, Cloud, Download, RotateCcw, Palette, Database, User, Trash2, RotateCw, Activity, Undo2, Redo2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/eyas-logo.png.asset.json";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Eyas Saree Drapist" }] }),
  component: SettingsPage,
});

type TabId = "brand" | "pricing" | "theme" | "data" | "activity" | "account";
const TABS: { id: TabId; label: string; hint: string; icon: typeof Palette }[] = [
  { id: "brand",    label: "Brand",    hint: "Logo & name",          icon: Upload },
  { id: "pricing",  label: "Pricing",  hint: "Defaults & measures",  icon: IndianRupee },
  { id: "theme",    label: "Theme",    hint: "Colors & display",     icon: Palette },
  { id: "data",     label: "Data",     hint: "Export & recovery",    icon: Database },
  { id: "activity", label: "Activity", hint: "History · Undo / Redo",icon: Activity },
  { id: "account",  label: "Account",  hint: "Sign in & sync",       icon: User },
];

const THEMES: { id: ThemeName; label: string; bg: string; fg: string; card: string; primary: string; accent: string; border: string }[] = [
  { id: "maroon",   label: "Maroon Ivory", bg: "#fdf8ef", fg: "#3a1010", card: "#ffffff", primary: "#7a1f2a", accent: "#e8c878", border: "#e7dccb" },
  { id: "midnight", label: "Midnight",     bg: "#1a1014", fg: "#f5ecd9", card: "#2a1c20", primary: "#c5483f", accent: "#5a3a35", border: "#3a2c30" },
  { id: "emerald",  label: "Emerald",      bg: "#eef7f1", fg: "#102a1c", card: "#ffffff", primary: "#1f6b4a", accent: "#bfe3cc", border: "#d4e7da" },
  { id: "royal",    label: "Royal Violet", bg: "#f0eefa", fg: "#1c1340", card: "#ffffff", primary: "#5b3fc8", accent: "#cfc5f0", border: "#dcd5ee" },
  { id: "rose",     label: "Rose Pink",    bg: "#fdeef3", fg: "#3a1024", card: "#ffffff", primary: "#c9457e", accent: "#f4c4d6", border: "#eed4dd" },
  { id: "sand",     label: "Sand Desert",  bg: "#f5ecd9", fg: "#3a2614", card: "#fdf6e8", primary: "#8a5a2a", accent: "#dcc299", border: "#dcc8a8" },
  { id: "charcoal", label: "Charcoal Gold",bg: "#1c1c1c", fg: "#f5f5f5", card: "#2a2a2a", primary: "#d4a24e", accent: "#3a342a", border: "#3a3a3a" },
];

function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const customers = useStore((s) => s.customers);
  const bookings = useStore((s) => s.bookings);
  const trash = useStore((s) => s.trash);
  const restoreBooking = useStore((s) => s.restoreBooking);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<TabId>("brand");

  const onLogoPick = (file: File) => {
    if (file.size > 1_500_000) return toast.error("Logo must be under 1.5MB");
    const reader = new FileReader();
    reader.onload = () => {
      update({ logoDataUrl: String(reader.result) });
      toast.success("Logo updated", { duration: 1500 });
    };
    reader.readAsDataURL(file);
  };

  return (
    <AppShell wide title="Settings" subtitle="Changes save instantly">
      <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
        {/* Left rail */}
        <nav className="sm:sticky sm:top-2 self-start">
          {/* Mobile: horizontal scroll pills */}
          <div className="flex sm:hidden gap-1 overflow-x-auto no-scrollbar bg-secondary rounded-full p-1">
            {TABS.map((t) => {
              const active = tab === t.id;
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${active ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
                  <Icon className="size-3.5" /> {t.label}
                </button>
              );
            })}
          </div>
          {/* Desktop/tablet: vertical compact list */}
          <ul className="hidden sm:block bg-card card-shadow rounded-2xl p-2 space-y-0.5">
            {TABS.map((t) => {
              const active = tab === t.id;
              const Icon = t.icon;
              return (
                <li key={t.id}>
                  <button onClick={() => setTab(t.id)}
                    className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition ${active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                    <span className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-primary-foreground/15" : "bg-secondary"}`}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-tight">{t.label}</span>
                      <span className={`block text-[10px] leading-tight ${active ? "opacity-80" : "text-muted-foreground"}`}>{t.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0">


      {tab === "brand" && (
        <Section title="Brand">
          <div className="flex items-center gap-3">
            <img
              src={settings.logoDataUrl || logoAsset.url}
              alt="logo"
              className="size-16 rounded-2xl object-cover ring-2 ring-primary/20"
            />
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-secondary text-xs font-semibold"
              >
                <Upload className="size-3.5" /> Change logo
              </button>
              {settings.logoDataUrl && (
                <button
                  onClick={() => { update({ logoDataUrl: undefined }); toast.success("Logo reset", { duration: 1200 }); }}
                  className="text-[11px] text-muted-foreground underline self-start"
                >Use default</button>
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
          <div className="mt-3">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Business name</label>
            <input
              value={settings.businessName}
              onChange={(e) => update({ businessName: e.target.value })}
              className="input mt-1"
            />
          </div>
        </Section>
      )}

      {tab === "pricing" && (
        <>
          <Section title="Default Pricing (per saree)">
            <PriceRow label="PrePleat" value={settings.prepleatPrice} onChange={(v) => update({ prepleatPrice: v })} />
            <PriceRow label="Drape"    value={settings.drapePrice}    onChange={(v) => update({ drapePrice: v })} />
            <p className="text-[11px] text-muted-foreground mt-2">Tap +/- to step by ₹50.</p>
          </Section>

          <Section title="Default Measurements">
            <p className="text-xs text-muted-foreground mb-3">
              Labels (e.g. P, W, H) and default values in inches. Used as start values for new bookings.
            </p>
            <ul className="space-y-2">
              {settings.defaultMeasurements.map((m, i) => (
                <li key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                  <input
                    value={m.label}
                    onChange={(e) => update({
                      defaultMeasurements: settings.defaultMeasurements.map((x, j) => i === j ? { ...x, label: e.target.value } : x),
                    })}
                    placeholder="Label"
                    className="input"
                  />
                  <div className="flex items-center gap-1 bg-secondary rounded-full px-1">
                    <button
                      onClick={() => update({
                        defaultMeasurements: settings.defaultMeasurements.map((x, j) => i === j ? { ...x, value: Math.max(10, x.value - 1) } : x),
                      })}
                      className="size-7 rounded-full text-base font-bold"
                    >−</button>
                    <input
                      type="number"
                      value={m.value}
                      onChange={(e) => update({
                        defaultMeasurements: settings.defaultMeasurements.map((x, j) => i === j ? { ...x, value: Number(e.target.value) || 0 } : x),
                      })}
                      className="w-12 bg-transparent text-center tabular-nums text-sm focus:outline-none"
                    />
                    <button
                      onClick={() => update({
                        defaultMeasurements: settings.defaultMeasurements.map((x, j) => i === j ? { ...x, value: x.value + 1 } : x),
                      })}
                      className="size-7 rounded-full text-base font-bold"
                    >+</button>
                    <span className="text-[10px] text-muted-foreground pr-1">″</span>
                  </div>
                  <button
                    onClick={() => update({
                      defaultMeasurements: settings.defaultMeasurements.filter((_, j) => j !== i),
                    })}
                    className="size-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center"
                  ><X className="size-4" /></button>
                </li>
              ))}
            </ul>
            {settings.defaultMeasurements.length < 6 && (
              <button
                onClick={() => update({
                  defaultMeasurements: [...settings.defaultMeasurements, { label: "X", value: 40 }],
                })}
                className="mt-3 text-sm text-primary font-semibold flex items-center gap-1"
              ><Plus className="size-4" /> Add measurement</button>
            )}
          </Section>

          <Section title="Payments">
            <p className="text-xs text-muted-foreground mb-2">Default mode when adding a payment.</p>
            <div className="grid grid-cols-3 gap-2">
              {(["gpay","cash","other"] as const).map((m) => {
                const active = (settings.defaultPaymentMode ?? "gpay") === m;
                return (
                  <button key={m} onClick={() => update({ defaultPaymentMode: m })}
                    className={`py-2 rounded-full text-xs font-semibold uppercase tracking-wider ${active ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{m}</button>
                );
              })}
            </div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground mt-3 block">Website (for WhatsApp bills)</label>
            <input value={settings.websiteUrl ?? ""} onChange={(e) => update({ websiteUrl: e.target.value })} placeholder="https://eyasdrapist.shop/" className="input mt-1" />
          </Section>
        </>
      )}

      {tab === "theme" && (
        <>
          <Section title="Theme">
            <p className="text-xs text-muted-foreground mb-3">Tap a palette to apply instantly.</p>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => {
                const active = settings.theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { update({ theme: t.id }); toast.success(`${t.label} applied`, { duration: 1200 }); }}
                    className={`rounded-2xl p-3 text-left border-2 transition ${active ? "border-primary" : "border-transparent"}`}
                    style={{ background: t.bg, color: t.fg }}
                  >
                    <div className="flex gap-1 mb-2">
                      <span className="size-4 rounded-full" style={{ background: t.primary }} />
                      <span className="size-4 rounded-full" style={{ background: t.accent }} />
                      <span className="size-4 rounded-full border" style={{ background: t.card, borderColor: t.border }} />
                    </div>
                    <p className="text-sm font-semibold">{t.label}</p>
                    {active && <p className="text-[10px] opacity-70 uppercase tracking-wider mt-0.5">Active</p>}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 p-3 rounded-2xl border-2 border-dashed border-border">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Custom primary</p>
                  <p className="text-[11px] text-muted-foreground">Pick any shade — applied live.</p>
                </div>
                <input
                  type="color"
                  value={settings.customPrimary || "#7a1f2a"}
                  onChange={(e) => update({ theme: "custom", customPrimary: e.target.value })}
                  className="size-10 rounded-full border-0 cursor-pointer bg-transparent"
                />
              </div>
              {settings.theme === "custom" && (
                <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mt-2">Custom theme active</p>
              )}
            </div>
          </Section>

          <Section title="Display">
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm">Show payment due on calendar</span>
              <button
                onClick={() => update({ showPaymentOnCalendar: !settings.showPaymentOnCalendar })}
                className={`h-7 w-12 rounded-full transition relative ${settings.showPaymentOnCalendar ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 size-6 bg-white rounded-full shadow transition ${settings.showPaymentOnCalendar ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          </Section>
        </>
      )}

      {tab === "data" && (
        <>
          <Section title="Data">
            <p className="text-xs text-muted-foreground">
              {customers.length} customers · {bookings.length} bookings · {fmtINR(bookings.reduce((s,b)=>s+b.totalAmount,0))} lifetime
            </p>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1"><Cloud className="size-3" /> Auto-syncs to your account.</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={() => {
                  const data = { exportedAt: new Date().toISOString(), customers, bookings, payments: useStore.getState().payments, settings };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url;
                  a.download = `eyas-backup-${new Date().toISOString().slice(0,10)}.json`;
                  a.click(); URL.revokeObjectURL(url);
                  toast.success("Backup downloaded", { duration: 1500 });
                }}
                className="px-3 py-2 rounded-full bg-secondary text-xs font-semibold flex items-center justify-center gap-1.5"
              ><Download className="size-3.5" /> Export JSON</button>
              <button
                onClick={() => {
                  const rows = [["Date","Time","Customer","Phone","Service","Sarees","Total","Paid","Due","Status"]];
                  for (const b of bookings) {
                    const c = customers.find((x) => x.id === b.customerId);
                    rows.push([b.deliveryDate.slice(0,10), b.deliveryTime, c?.name ?? "", c?.phone ?? "", b.service, String(b.sareeCount), String(b.totalAmount), String(b.advancePaid), String(Math.max(0,b.totalAmount-b.advancePaid)), b.status]);
                  }
                  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url;
                  a.download = `eyas-bookings-${new Date().toISOString().slice(0,10)}.csv`;
                  a.click(); URL.revokeObjectURL(url);
                  toast.success("CSV exported", { duration: 1500 });
                }}
                className="px-3 py-2 rounded-full bg-secondary text-xs font-semibold flex items-center justify-center gap-1.5"
              ><Download className="size-3.5" /> Export CSV</button>
            </div>
          </Section>

          <Section title="Recently Deleted (7-day)">
            {trash.length === 0 ? (
              <p className="text-xs text-muted-foreground">No deleted bookings.</p>
            ) : (
              <ul className="space-y-2">
                {trash.map((t) => {
                  const c = customers.find((x) => x.id === t.booking.customerId);
                  return (
                    <li key={t.booking.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-secondary/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c?.name ?? "Unknown"} · {t.booking.service}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {t.booking.deliveryDate.slice(0,10)} · {fmtTime12(t.booking.deliveryTime)} · {fmtINR(t.booking.totalAmount)}
                        </p>
                      </div>
                      <button
                        onClick={() => { restoreBooking(t.booking.id); toast.success("Booking restored", { duration: 1500 }); }}
                        className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
                      ><RotateCw className="size-3" /> Restore</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title="Reset & Danger Zone">
            <div className="space-y-2">
              <button
                onClick={() => {
                  update({ theme: "maroon", customPrimary: undefined });
                  toast.success("Theme reset", { duration: 1200 });
                }}
                className="w-full px-3 py-2 rounded-full bg-secondary text-xs font-semibold flex items-center justify-center gap-1.5"
              ><RotateCcw className="size-3.5" /> Reset theme</button>
              <button
                onClick={() => {
                  update({
                    prepleatPrice: 350, drapePrice: 800,
                    defaultMeasurements: [{ label: "P", value: 40 }, { label: "W", value: 32 }, { label: "H", value: 38 }],
                    defaultPaymentMode: "gpay",
                  });
                  toast.success("Defaults restored", { duration: 1500 });
                }}
                className="w-full px-3 py-2 rounded-full bg-secondary text-xs font-semibold flex items-center justify-center gap-1.5"
              ><RotateCcw className="size-3.5" /> Reset pricing & measurements</button>
              <button
                onClick={() => {
                  if (!confirm("Delete ALL local bookings, customers and payments? This cannot be undone.")) return;
                  useStore.setState({ bookings: [], customers: [], payments: [], trash: [] });
                  toast.success("All data cleared", { duration: 1500 });
                }}
                className="w-full px-3 py-2 rounded-full bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center gap-1.5"
              ><Trash2 className="size-3.5" /> Clear all data</button>
            </div>
          </Section>
        </>
      )}

      {tab === "account" && (
        <Section title="Account">
          <AccountBlock />
        </Section>
      )}


      <style>{`.input { background: var(--color-secondary); border-radius: 9999px; padding: 0.6rem 0.9rem; font-size: 0.875rem; outline: none; width: 100%; color: var(--color-foreground); }
      .input:focus { box-shadow: 0 0 0 2px var(--color-primary); }`}</style>
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
        <p className="text-sm font-medium truncate">{isGuest ? "Guest account" : email || "Signed in"}</p>
        <p className="text-[11px] text-muted-foreground">{isGuest ? "Sign in with Google to keep your data safe across devices." : "Your data syncs to the cloud."}</p>
      </div>
      <button onClick={signOut} className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-full bg-secondary text-sm font-medium">
        <LogOut className="size-3.5" /> Sign out
      </button>
    </div>
  );
}

function PriceRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1 bg-secondary rounded-full px-1">
        <button onClick={() => onChange(Math.max(0, value - 50))} className="size-8 rounded-full flex items-center justify-center"><Minus className="size-3.5" /></button>
        <div className="relative w-24">
          <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            className="w-full bg-transparent pl-6 pr-1 py-2 text-sm text-right tabular-nums focus:outline-none"
          />
        </div>
        <button onClick={() => onChange(value + 50)} className="size-8 rounded-full flex items-center justify-center"><Plus className="size-3.5" /></button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card card-shadow rounded-2xl p-4 mb-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</h2>
      {children}
    </section>
  );
}