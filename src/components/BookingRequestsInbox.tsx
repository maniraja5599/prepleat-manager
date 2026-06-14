import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore, type ServiceType } from "@/lib/store";
import { Check, X, Inbox, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

interface BookingRequest {
  id: string;
  name: string;
  phone: string;
  service: string;
  saree_count: number;
  delivery_date: string | null;
  delivery_time: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export function BookingRequestsInbox() {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const settings = useStore((s) => s.settings);
  const addCustomer = useStore((s) => s.addCustomer);
  const addBooking = useStore((s) => s.addBooking);
  const customers = useStore((s) => s.customers);
  const navigate = useNavigate();

  const fetch = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error && data) setRequests(data as BookingRequest[]);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

  if (loading && requests.length === 0) return null;
  if (requests.length === 0) return null;

  const accept = async (r: BookingRequest) => {
    const phoneDigits = r.phone.replace(/\D/g, "");
    let cust = customers.find((c) => c.phone.replace(/\D/g, "") === phoneDigits);
    if (!cust) cust = addCustomer({ kind: "client", name: r.name, phone: r.phone });
    const service = (r.service === "drape" ? "drape" : "prepleat") as ServiceType;
    const price = service === "prepleat" ? settings.prepleatPrice : settings.drapePrice;
    const total = r.saree_count * price;
    const b = addBooking({
      customerId: cust.id,
      service,
      sareeCount: r.saree_count,
      pricePerSaree: price,
      totalAmount: total,
      advancePaid: 0,
      deliveryDate: r.delivery_date
        ? new Date(r.delivery_date).toISOString()
        : new Date().toISOString(),
      deliveryTime: r.delivery_time || "10:00",
      notes: r.notes ? `[Request] ${r.notes}` : "[From public request form]",
    });
    await supabase.from("booking_requests").update({ status: "confirmed" }).eq("id", r.id);
    setRequests((rs) => rs.filter((x) => x.id !== r.id));
    toast.success("Request accepted");
    navigate({ to: "/bookings/$id", params: { id: b.id } });
  };

  const dismiss = async (id: string) => {
    await supabase.from("booking_requests").update({ status: "dismissed" }).eq("id", id);
    setRequests((rs) => rs.filter((x) => x.id !== id));
    toast.success("Request dismissed");
  };

  return (
    <section className="mb-3 bg-gradient-to-br from-gold/15 to-primary/10 border border-primary/20 rounded-2xl p-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Inbox className="size-4" />
          </span>
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold truncate">
              {requests.length} new booking request{requests.length > 1 ? "s" : ""}
            </p>
            <p className="text-[11px] text-muted-foreground">Tap to review</p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            fetch();
          }}
          className="size-8 rounded-full bg-card flex items-center justify-center shrink-0"
          aria-label="Refresh"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </button>
      {expanded && (
        <ul className="mt-3 space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="bg-card rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.phone} · {r.service} · {r.saree_count} saree{r.saree_count > 1 ? "s" : ""}
                  </p>
                  {r.delivery_date && (
                    <p className="text-[11px] text-muted-foreground">
                      Wants: {r.delivery_date} {r.delivery_time ?? ""}
                    </p>
                  )}
                  {r.notes && <p className="text-[11px] mt-1 line-clamp-2">{r.notes}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => accept(r)}
                    className="size-8 rounded-full bg-success/15 text-success flex items-center justify-center"
                    aria-label="Accept"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={() => dismiss(r.id)}
                    className="size-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center"
                    aria-label="Dismiss"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
