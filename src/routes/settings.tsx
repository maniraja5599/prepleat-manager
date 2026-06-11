import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, fmtINR, type Measurement, type ThemeName } from "@/lib/store";
import { useState } from "react";
import { IndianRupee, Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Saree Studio" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const customers = useStore((s) => s.customers);
  const bookings = useStore((s) => s.bookings);

  const [name, setName] = useState(settings.businessName);
  const [prepleat, setPrepleat] = useState(String(settings.prepleatPrice));
  const [drape, setDrape] = useState(String(settings.drapePrice));
  const [ms, setMs] = useState<Measurement[]>(settings.defaultMeasurements);

  const save = () => {
    update({
      businessName: name.trim() || "Saree Studio",
      prepleatPrice: Number(prepleat) || 0,
      drapePrice: Number(drape) || 0,
      defaultMeasurements: ms,
    });
    toast.success("Settings saved");
  };

  return (
    <AppShell title="Settings" subtitle="Defaults & preferences">
      <Section title="Business">
        <Field label="Business name">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </Field>
      </Section>

      <Section title="Default Pricing (per saree)">
        <Field label="PrePleat">
          <div className="relative w-32"><IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"/>
            <input type="number" value={prepleat} onChange={(e) => setPrepleat(e.target.value)} className="input pl-7 text-right tabular-nums" />
          </div>
        </Field>
        <Field label="Drape">
          <div className="relative w-32"><IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"/>
            <input type="number" value={drape} onChange={(e) => setDrape(e.target.value)} className="input pl-7 text-right tabular-nums" />
          </div>
        </Field>
      </Section>

      <Section title="Default Measurements">
        <p className="text-xs text-muted-foreground mb-3">Labels & default values (inches). Used as start values in new bookings.</p>
        <ul className="space-y-2">
          {ms.map((m, i) => (
            <li key={i} className="flex gap-2 items-center">
              <input
                value={m.label}
                onChange={(e) => setMs(ms.map((x, j) => i === j ? { ...x, label: e.target.value } : x))}
                placeholder="Label"
                className="input flex-1"
              />
              <input
                type="number"
                value={m.value}
                onChange={(e) => setMs(ms.map((x, j) => i === j ? { ...x, value: Number(e.target.value) || 0 } : x))}
                className="input w-20 text-right tabular-nums"
              />
              <span className="text-xs text-muted-foreground">″</span>
              <button onClick={() => setMs(ms.filter((_, j) => j !== i))} className="size-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        {ms.length < 6 && (
          <button onClick={() => setMs([...ms, { label: String.fromCharCode(65 + ms.length), value: 40 }])} className="mt-2 text-sm text-primary font-semibold flex items-center gap-1">
            <Plus className="size-4"/> Add measurement
          </button>
        )}
      </Section>

      <Section title="Theme">
        <p className="text-xs text-muted-foreground mb-3">Pick a colour palette for the app.</p>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => {
            const active = settings.theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { update({ theme: t.id }); toast.success(`${t.label} theme applied`); }}
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
        <Field label="Show payment due on calendar">
          <button
            onClick={() => update({ showPaymentOnCalendar: !settings.showPaymentOnCalendar })}
            className={`h-7 w-12 rounded-full transition relative ${settings.showPaymentOnCalendar ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 size-6 bg-white rounded-full shadow transition ${settings.showPaymentOnCalendar ? "left-5" : "left-0.5"}`} />
          </button>
        </Field>
      </Section>

      <button onClick={save} className="w-full saree-gradient text-primary-foreground py-3.5 rounded-2xl font-semibold mt-4 active:scale-[0.98] transition">
        Save Changes
      </button>

      <Section title="Data">
        <p className="text-xs text-muted-foreground">{customers.length} customers · {bookings.length} bookings · {fmtINR(bookings.reduce((s,b)=>s+b.totalAmount,0))} lifetime</p>
        <p className="text-[11px] text-muted-foreground mt-2">All data stored locally on this device.</p>
      </Section>

      <style>{`.input { background: var(--color-secondary); border-radius: 9999px; padding: 0.6rem 0.9rem; font-size: 0.875rem; outline: none; width: 100%; }
      .input:focus { box-shadow: 0 0 0 2px var(--color-primary); }`}</style>
    </AppShell>
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
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}
