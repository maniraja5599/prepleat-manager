import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, totalDue, fmtINR, type CustomerKind } from "@/lib/store";
import { useState, useMemo } from "react";
import { Search, Phone, Plus, SlidersHorizontal, Users, IndianRupee, AlertCircle, CheckSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/customers/")({
  head: () => ({ meta: [{ title: "Customers — Saree Studio" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const customers = useStore((s) => s.customers);
  const bookings = useStore((s) => s.bookings);
  const addCustomer = useStore((s) => s.addCustomer);
  const deleteCustomer = useStore((s) => s.deleteCustomer);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<CustomerKind>("client");
  const [showAdd, setShowAdd] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"due" | "name" | "orders">("due");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const list = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return customers
      .filter((c) => (c.kind ?? "client") === tab)
      .map((c) => {
        const cb = bookings.filter((b) => (tab === "artist" ? b.artistId === c.id : b.customerId === c.id));
        const due = cb.reduce((s, b) => s + totalDue(b), 0);
        return { ...c, count: cb.length, due };
      })
      .filter((c) => !ql || c.name.toLowerCase().includes(ql) || c.phone.includes(ql) || (c.address ?? "").toLowerCase().includes(ql) || (c.reference ?? "").toLowerCase().includes(ql))
      .filter((c) => !dueOnly || c.due > 0)
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "orders") return b.count - a.count || a.name.localeCompare(b.name);
        return b.due - a.due || a.name.localeCompare(b.name);
      });
  }, [customers, bookings, q, tab, dueOnly, sortBy]);

  const clientCount = customers.filter((c) => (c.kind ?? "client") === "client").length;
  const artistCount = customers.filter((c) => c.kind === "artist").length;

  const visibleSummary = useMemo(() => {
    const totalDueAll = list.reduce((s, c) => s + c.due, 0);
    const totalOrders = list.reduce((s, c) => s + c.count, 0);
    const withDue = list.filter((c) => c.due > 0).length;
    return { count: list.length, totalDueAll, totalOrders, withDue };
  }, [list]);

  return (
    <AppShell
      title={tab === "client" ? "Clients" : "Artists"}
      subtitle={`${tab === "client" ? clientCount : artistCount} ${tab === "client" ? "clients" : "artists"}`}
      right={
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setSelectMode((v) => !v); setSelected(new Set()); }}
            aria-label="Select"
            className={cn(
              "size-10 rounded-full flex items-center justify-center",
              selectMode ? "bg-primary text-primary-foreground" : "bg-secondary",
            )}
          ><CheckSquare className="size-4" /></button>
          <button
            onClick={() => setShowFilter((v) => !v)}
            aria-label="Filters"
            className={cn(
              "size-10 rounded-full flex items-center justify-center",
              showFilter || dueOnly || sortBy !== "due" ? "bg-primary text-primary-foreground" : "bg-secondary",
            )}
          ><SlidersHorizontal className="size-4" /></button>
          <button onClick={() => setShowAdd((v) => !v)} className="size-10 rounded-full saree-gradient text-primary-foreground flex items-center justify-center">
            <Plus className="size-5" />
          </button>
        </div>
      }
    >
      {/* Slim stats chip bar (mirrors bookings page) */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <StatChip icon={<Users className="size-3.5" />} label="Total" value={String(visibleSummary.count)} />
        <StatChip icon={<AlertCircle className="size-3.5" />} label="With due" value={String(visibleSummary.withDue)} tone={visibleSummary.withDue > 0 ? "warn" : "default"} />
        <StatChip icon={<IndianRupee className="size-3.5" />} label="Outstanding" value={fmtINR(visibleSummary.totalDueAll)} tone={visibleSummary.totalDueAll > 0 ? "danger" : "default"} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {(["client", "artist"] as CustomerKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition",
              tab === k ? "saree-gradient text-primary-foreground" : "bg-card border border-border text-muted-foreground",
            )}
          >{k === "client" ? `Clients · ${clientCount}` : `Artists · ${artistCount}`}</button>
        ))}
      </div>

      {showFilter && (
        <div className="bg-card card-shadow rounded-2xl p-3 mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Only show with balance</span>
            <button
              onClick={() => setDueOnly((v) => !v)}
              className={cn("relative h-6 w-11 rounded-full transition", dueOnly ? "saree-gradient" : "bg-secondary")}
            >
              <span className={cn("absolute top-0.5 size-5 rounded-full bg-card shadow transition-transform", dueOnly ? "translate-x-5" : "translate-x-0.5")} />
            </button>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Sort by</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(["due","orders","name"] as const).map((s) => (
                <button key={s} onClick={() => setSortBy(s)} className={cn("py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider",
                  sortBy === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="bg-card card-shadow rounded-2xl p-3 mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${tab === "client" ? "Client" : "Artist"} name`} className="bg-secondary rounded-full px-3 py-2 text-sm focus:outline-none" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" inputMode="tel" className="bg-secondary rounded-full px-3 py-2 text-sm focus:outline-none" />
          </div>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Address (optional)" className="w-full bg-secondary rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
          <button
            onClick={() => {
              if (!name.trim() || !phone.trim()) return;
              addCustomer({ kind: tab, name: name.trim(), phone: phone.trim(), address: address.trim() || undefined });
              setName(""); setPhone(""); setAddress(""); setShowAdd(false);
            }}
            className="w-full px-3 py-2 rounded-full saree-gradient text-primary-foreground text-sm font-semibold"
          >Add {tab}</button>
        </div>
      )}

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${tab}`} className="w-full bg-card border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
      </div>

      {list.length === 0 ? (
        <div className="bg-card card-shadow rounded-2xl p-8 text-center text-sm text-muted-foreground">No {tab}s yet.</div>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id}>
              <Link to="/customers/$id" params={{ id: c.id }} className="block bg-card card-shadow rounded-2xl p-4 active:scale-[0.99] transition">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="size-3"/>{c.phone}</p>
                    {c.address && <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5">{c.address}</p>}
                    {c.reference && <p className="text-[10px] text-primary/80 truncate mt-0.5">ref: {c.reference}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{c.count} order{c.count !== 1 && "s"}</p>
                    {c.due > 0 && <p className="text-xs text-destructive font-semibold">{fmtINR(c.due)} due</p>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function StatChip({ icon, label, value, tone = "default" }: { icon: React.ReactNode; label: string; value: string; tone?: "default" | "warn" | "danger" }) {
  const toneCls = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-warning" : "text-foreground";
  return (
    <div className="bg-card card-shadow rounded-xl px-2 py-1.5 flex items-center gap-1.5 min-w-0">
      <span className={cn("shrink-0", toneCls)}>{icon}</span>
      <div className="min-w-0 leading-tight">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{label}</p>
        <p className={cn("text-xs font-bold truncate tabular-nums", toneCls)}>{value}</p>
      </div>
    </div>
  );
}
