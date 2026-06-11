import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, totalDue, fmtINR } from "@/lib/store";
import { useState, useMemo } from "react";
import { Search, Phone, Plus } from "lucide-react";

export const Route = createFileRoute("/customers/")({
  head: () => ({ meta: [{ title: "Customers — Saree Studio" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const customers = useStore((s) => s.customers);
  const bookings = useStore((s) => s.bookings);
  const addCustomer = useStore((s) => s.addCustomer);
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const list = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return customers
      .map((c) => {
        const cb = bookings.filter((b) => b.customerId === c.id);
        const due = cb.reduce((s, b) => s + totalDue(b), 0);
        return { ...c, count: cb.length, due };
      })
      .filter((c) => !ql || c.name.toLowerCase().includes(ql) || c.phone.includes(ql))
      .sort((a, b) => b.due - a.due || a.name.localeCompare(b.name));
  }, [customers, bookings, q]);

  return (
    <AppShell
      title="Customers"
      subtitle={`${customers.length} total`}
      right={
        <button onClick={() => setShowAdd((v) => !v)} className="size-10 rounded-full saree-gradient text-primary-foreground flex items-center justify-center">
          <Plus className="size-5" />
        </button>
      }
    >
      {showAdd && (
        <div className="bg-card card-shadow rounded-2xl p-3 mb-3 grid grid-cols-[1fr_1fr_auto] gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="bg-secondary rounded-full px-3 py-2 text-sm focus:outline-none" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" inputMode="tel" className="bg-secondary rounded-full px-3 py-2 text-sm focus:outline-none" />
          <button
            onClick={() => {
              if (!name.trim() || !phone.trim()) return;
              addCustomer({ name: name.trim(), phone: phone.trim() });
              setName(""); setPhone(""); setShowAdd(false);
            }}
            className="px-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
          >Add</button>
        </div>
      )}

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer" className="w-full bg-card border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
      </div>

      {list.length === 0 ? (
        <div className="bg-card card-shadow rounded-2xl p-8 text-center text-sm text-muted-foreground">No customers yet.</div>
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
