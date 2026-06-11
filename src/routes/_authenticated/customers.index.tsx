import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, totalDue, fmtINR, type CustomerKind } from "@/lib/store";
import { useState, useMemo } from "react";
import { Search, Phone, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/customers/")({
  head: () => ({ meta: [{ title: "Customers — Saree Studio" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const customers = useStore((s) => s.customers);
  const bookings = useStore((s) => s.bookings);
  const addCustomer = useStore((s) => s.addCustomer);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<CustomerKind>("client");
  const [showAdd, setShowAdd] = useState(false);
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
      .filter((c) => !ql || c.name.toLowerCase().includes(ql) || c.phone.includes(ql))
      .sort((a, b) => b.due - a.due || a.name.localeCompare(b.name));
  }, [customers, bookings, q, tab]);

  const clientCount = customers.filter((c) => (c.kind ?? "client") === "client").length;
  const artistCount = customers.filter((c) => c.kind === "artist").length;

  return (
    <AppShell
      title={tab === "client" ? "Clients" : "Artists"}
      subtitle={`${tab === "client" ? clientCount : artistCount} ${tab === "client" ? "clients" : "artists"}`}
      right={
        <button onClick={() => setShowAdd((v) => !v)} className="size-10 rounded-full saree-gradient text-primary-foreground flex items-center justify-center">
          <Plus className="size-5" />
        </button>
      }
    >
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
