import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, fmtINR, type Measurement, type ThemeName } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import { IndianRupee, Plus, X, Upload, Minus, LogOut, Cloud } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/eyas-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Eyas Saree Drapist" }] }),
  component: SettingsPage,
});

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
  const fileRef = useRef<HTMLInputElement>(null);

  const onLogoPick = (file: File) => {
    if (file.size > 1_500_000) return toast.error("Logo must be under 1.5MB");
    const reader = new FileReader();
    reader.onload = () => {
      update({ logoDataUrl: String(reader.result) });
      toast.success("Logo updated");
    };
    reader.readAsDataURL(file);
  };

  return (
    <AppShell title="Settings" subtitle="Changes save instantly">
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
                onClick={() => { update({ logoDataUrl: undefined }); toast.success("Logo reset"); }}
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

      <Section title="Theme">
        <p className="text-xs text-muted-foreground mb-3">Tap a palette to apply instantly.</p>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => {
            const active = settings.theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { update({ theme: t.id }); toast.success(`${t.label} applied`); }}
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

      <Section title="Data">
        <p className="text-xs text-muted-foreground">
          {customers.length} customers · {bookings.length} bookings · {fmtINR(bookings.reduce((s,b)=>s+b.totalAmount,0))} lifetime
        </p>
        <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1"><Cloud className="size-3" /> Auto-syncs to your account.</p>
      </Section>

      <Section title="Account">
        <AccountBlock />
      </Section>

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