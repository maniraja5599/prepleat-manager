import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ServiceType = "prepleat" | "drape";

export interface Measurement {
  label: string;
  value: number;
}

export interface Booking {
  id: string;
  billNumber?: string;
  customerId: string;
  artistId?: string;
  service: ServiceType;
  sareeCount: number;
  pricePerSaree: number;
  totalAmount: number;
  advancePaid: number;
  deliveryDate: string;
  deliveryTime: string;
  notes?: string;
  measurements?: Measurement[];
  createdAt: string;
  completedAt?: string;
  status: "pending" | "completed" | "delivered" | "cancelled";
}

export type PaymentMode = "gpay" | "cash" | "other";

export interface Payment {
  id: string;
  bookingId: string;
  customerId: string;
  amount: number;
  date: string;
  note?: string;
  mode?: PaymentMode;
}

export type CustomerKind = "client" | "artist";

export interface Customer {
  id: string;
  kind: CustomerKind;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export type ThemeName = "maroon" | "midnight" | "emerald" | "royal" | "rose" | "sand" | "charcoal" | "gold" | "custom";

export interface CustomColors {
  primary?: string;
  accent?: string;
  background?: string;
  card?: string;
  foreground?: string;
}

export interface Settings {
  prepleatPrice: number;
  drapePrice: number;
  defaultMeasurements: Measurement[];
  showPaymentOnCalendar: boolean;
  businessName: string;
  theme: ThemeName;
  customPrimary?: string;
  customColors?: CustomColors;
  logoDataUrl?: string;
  defaultPaymentMode?: PaymentMode;
  websiteUrl?: string;
  occasionPresets?: string[];
}

export interface DeletedBooking {
  booking: Booking;
  payments: Payment[];
  deletedAt: string;
}

export type ActivityKind = "create" | "update" | "delete" | "restore" | "payment-add" | "payment-delete" | "cancel";

export interface ActivityEntry {
  id: string;
  ts: string;
  kind: ActivityKind;
  bookingId?: string;
  summary: string;
  prev?: Booking;
  next?: Booking;
}

interface State {
  customers: Customer[];
  bookings: Booking[];
  payments: Payment[];
  settings: Settings;
  trash: DeletedBooking[];
  activity: ActivityEntry[];
  redoStack: ActivityEntry[];

  addCustomer: (c: Omit<Customer, "id" | "createdAt">) => Customer;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  getCustomer: (id: string) => Customer | undefined;

  addBooking: (b: Omit<Booking, "id" | "createdAt" | "status" | "billNumber">) => Booking;
  updateBooking: (id: string, b: Partial<Booking>) => void;
  cancelBooking: (id: string) => void;
  deleteBooking: (id: string) => void;
  restoreBooking: (id: string) => void;
  undoLastEdit: () => boolean;
  redoLastEdit: () => boolean;
  clearActivity: () => void;

  addPayment: (p: Omit<Payment, "id">) => void;
  deletePayment: (id: string) => void;

  updateSettings: (s: Partial<Settings>) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const generateBillNumber = (existing: Booking[]): string => {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `EYAS-${ym}-`;
  const usedNumbers = existing
    .map((b) => b.billNumber)
    .filter((n): n is string => !!n && n.startsWith(prefix))
    .map((n) => Number(n.slice(prefix.length)) || 0);
  const next = (usedNumbers.length ? Math.max(...usedNumbers) : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
};

const describeDiff = (prev: Booking, next: Booking): string => {
  const parts: string[] = [];
  if (prev.service !== next.service) parts.push(`service ${prev.service}→${next.service}`);
  if (prev.sareeCount !== next.sareeCount) parts.push(`sarees ${prev.sareeCount}→${next.sareeCount}`);
  if (prev.pricePerSaree !== next.pricePerSaree) parts.push(`price ${prev.pricePerSaree}→${next.pricePerSaree}`);
  if (prev.deliveryDate !== next.deliveryDate) parts.push(`date ${prev.deliveryDate.slice(0,10)}→${next.deliveryDate.slice(0,10)}`);
  if (prev.deliveryTime !== next.deliveryTime) parts.push(`time ${prev.deliveryTime}→${next.deliveryTime}`);
  if (prev.status !== next.status) parts.push(`status ${prev.status}→${next.status}`);
  if ((prev.notes || "") !== (next.notes || "")) parts.push("notes changed");
  if (prev.advancePaid !== next.advancePaid) parts.push(`paid ${prev.advancePaid}→${next.advancePaid}`);
  return parts.length ? parts.join(", ") : "minor edit";
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      customers: [],
      bookings: [],
      payments: [],
      trash: [],
      activity: [],
      redoStack: [],
      settings: {
        prepleatPrice: 350,
        drapePrice: 800,
        defaultMeasurements: [
          { label: "P", value: 40 },
          { label: "W", value: 32 },
          { label: "H", value: 38 },
        ],
        showPaymentOnCalendar: false,
        businessName: "Eyas Saree Drapist",
        theme: "maroon",
        defaultPaymentMode: "gpay",
        websiteUrl: "https://eyasdrapist.shop/",
        occasionPresets: ["Bride", "Bridesmaid", "Engagement", "Reception", "Baby ceremony", "Function"],
      },

      addCustomer: (c) => {
        const customer: Customer = { ...c, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ customers: [customer, ...s.customers] }));
        return customer;
      },
      updateCustomer: (id, c) =>
        set((s) => ({ customers: s.customers.map((x) => (x.id === id ? { ...x, ...c } : x)) })),
      deleteCustomer: (id) =>
        set((s) => ({
          customers: s.customers.filter((x) => x.id !== id),
          bookings: s.bookings.filter((b) => b.customerId !== id),
          payments: s.payments.filter((p) => p.customerId !== id),
        })),
      getCustomer: (id) => get().customers.find((c) => c.id === id),

      addBooking: (b) => {
        const billNumber = generateBillNumber(get().bookings);
        const booking: Booking = { ...b, id: uid(), billNumber, createdAt: new Date().toISOString(), status: "pending" };
        const entry: ActivityEntry = {
          id: uid(), ts: new Date().toISOString(), kind: "create",
          bookingId: booking.id, summary: `${billNumber} · ${booking.service} · ${booking.sareeCount} sarees`,
        };
        set((s) => ({
          bookings: [booking, ...s.bookings],
          activity: [entry, ...s.activity].slice(0, 200),
          redoStack: [],
        }));
        if (b.advancePaid > 0) {
          const pid = uid();
          set((s) => ({
            payments: [
              { id: pid, bookingId: booking.id, customerId: b.customerId, amount: b.advancePaid, date: new Date().toISOString(), note: "Advance" },
              ...s.payments,
            ],
          }));
        }
        return booking;
      },
      updateBooking: (id, b) =>
        set((s) => {
          const prev = s.bookings.find((x) => x.id === id);
          if (!prev) return s;
          const next = { ...prev, ...b };
          const entry: ActivityEntry = {
            id: uid(), ts: new Date().toISOString(), kind: "update",
            bookingId: id, summary: describeDiff(prev, next), prev, next,
          };
          return {
            bookings: s.bookings.map((x) => (x.id === id ? next : x)),
            activity: [entry, ...s.activity].slice(0, 200),
            redoStack: [],
          };
        }),
      cancelBooking: (id) =>
        set((s) => {
          const prev = s.bookings.find((x) => x.id === id);
          if (!prev) return s;
          const next: Booking = { ...prev, status: "cancelled" };
          const entry: ActivityEntry = {
            id: uid(), ts: new Date().toISOString(), kind: "cancel",
            bookingId: id, summary: `cancelled ${prev.billNumber ?? prev.service}`, prev, next,
          };
          return {
            bookings: s.bookings.map((x) => (x.id === id ? next : x)),
            activity: [entry, ...s.activity].slice(0, 200),
            redoStack: [],
          };
        }),
      deleteBooking: (id) =>
        set((s) => {
          const b = s.bookings.find((x) => x.id === id);
          if (!b) return s;
          const relatedPayments = s.payments.filter((p) => p.bookingId === id);
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const trash = [
            { booking: b, payments: relatedPayments, deletedAt: new Date().toISOString() },
            ...s.trash.filter((t) => new Date(t.deletedAt).getTime() > sevenDaysAgo),
          ].slice(0, 50);
          const entry: ActivityEntry = {
            id: uid(), ts: new Date().toISOString(), kind: "delete",
            bookingId: id, summary: `deleted ${b.billNumber ?? b.service}`,
          };
          return {
            bookings: s.bookings.filter((x) => x.id !== id),
            payments: s.payments.filter((p) => p.bookingId !== id),
            trash,
            activity: [entry, ...s.activity].slice(0, 200),
            redoStack: [],
          };
        }),
      restoreBooking: (id) =>
        set((s) => {
          const t = s.trash.find((x) => x.booking.id === id);
          if (!t) return s;
          const entry: ActivityEntry = {
            id: uid(), ts: new Date().toISOString(), kind: "restore",
            bookingId: id, summary: `restored ${t.booking.billNumber ?? t.booking.service}`,
          };
          return {
            bookings: [t.booking, ...s.bookings],
            payments: [...t.payments, ...s.payments],
            trash: s.trash.filter((x) => x.booking.id !== id),
            activity: [entry, ...s.activity].slice(0, 200),
          };
        }),
      undoLastEdit: () => {
        const s = get();
        const idx = s.activity.findIndex((e) => (e.kind === "update" || e.kind === "cancel") && e.prev && e.next);
        if (idx === -1) return false;
        const entry = s.activity[idx];
        set({
          bookings: s.bookings.map((x) => (x.id === entry.bookingId ? entry.prev! : x)),
          activity: s.activity.filter((_, i) => i !== idx),
          redoStack: [entry, ...s.redoStack].slice(0, 50),
        });
        return true;
      },
      redoLastEdit: () => {
        const s = get();
        if (s.redoStack.length === 0) return false;
        const [entry, ...rest] = s.redoStack;
        if (!entry.next) return false;
        set({
          bookings: s.bookings.map((x) => (x.id === entry.bookingId ? entry.next! : x)),
          activity: [{ ...entry, id: uid(), ts: new Date().toISOString() }, ...s.activity].slice(0, 200),
          redoStack: rest,
        });
        return true;
      },
      clearActivity: () => set({ activity: [], redoStack: [] }),

      addPayment: (p) =>
        set((s) => {
          const payment: Payment = { ...p, id: uid() };
          const bookings = s.bookings.map((b) => {
            if (b.id !== p.bookingId) return b;
            const newPaid = b.advancePaid + p.amount;
            const fullyPaid = newPaid >= b.totalAmount;
            return {
              ...b,
              advancePaid: newPaid,
              status: fullyPaid && b.status === "pending" ? "completed" : b.status,
            };
          });
          const entry: ActivityEntry = {
            id: uid(), ts: new Date().toISOString(), kind: "payment-add",
            bookingId: p.bookingId, summary: `paid ₹${p.amount} (${p.mode ?? "gpay"})`,
          };
          return { payments: [payment, ...s.payments], bookings, activity: [entry, ...s.activity].slice(0, 200) };
        }),
      deletePayment: (id) =>
        set((s) => {
          const pay = s.payments.find((p) => p.id === id);
          if (!pay) return s;
          const bookings = s.bookings.map((b) => {
            if (b.id !== pay.bookingId) return b;
            const newPaid = Math.max(0, b.advancePaid - pay.amount);
            const stillFullyPaid = newPaid >= b.totalAmount;
            return {
              ...b,
              advancePaid: newPaid,
              status: !stillFullyPaid && b.status === "completed" ? "pending" : b.status,
            };
          });
          const entry: ActivityEntry = {
            id: uid(), ts: new Date().toISOString(), kind: "payment-delete",
            bookingId: pay.bookingId, summary: `removed payment ₹${pay.amount}`,
          };
          return { payments: s.payments.filter((p) => p.id !== id), bookings, activity: [entry, ...s.activity].slice(0, 200) };
        }),


      updateSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
    }),
    {
      name: "saree-studio-v1",
      version: 5,
      migrate: (persisted: any, _version) => {
        if (!persisted) return persisted;
        const s = persisted.settings ?? {};
        if (s.businessName === "Saree Studio") s.businessName = "Eyas Saree Drapist";
        if (s.prepleatPrice === 150) s.prepleatPrice = 350;
        if (s.drapePrice === 300) s.drapePrice = 800;
        if (Array.isArray(s.defaultMeasurements)) {
          const labels = s.defaultMeasurements.map((m: any) => m.label).join(",");
          if (labels === "A,B,C") s.defaultMeasurements = [
            { label: "P", value: 40 },
            { label: "W", value: 32 },
            { label: "H", value: 38 },
          ];
        }
        if (!Array.isArray(s.occasionPresets)) {
          s.occasionPresets = ["Bride", "Bridesmaid", "Engagement", "Reception", "Baby ceremony", "Function"];
        }
        persisted.settings = s;
        if (Array.isArray(persisted.customers)) {
          persisted.customers = persisted.customers.map((c: any) => ({ kind: c.kind ?? "client", ...c }));
        }
        // Backfill bill numbers
        if (Array.isArray(persisted.bookings)) {
          const monthCounters = new Map<string, number>();
          // Sort by created date so existing order yields stable numbering
          const sorted = [...persisted.bookings].sort((a: any, b: any) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
          for (const b of sorted) {
            if (b.billNumber) continue;
            const d = new Date(b.createdAt || Date.now());
            const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
            const prefix = `EYAS-${ym}-`;
            const n = (monthCounters.get(ym) ?? 0) + 1;
            monthCounters.set(ym, n);
            b.billNumber = `${prefix}${String(n).padStart(4, "0")}`;
          }
        }
        if (!Array.isArray(persisted.activity)) persisted.activity = [];
        if (!Array.isArray(persisted.redoStack)) persisted.redoStack = [];
        return persisted;
      },
    },
  ),
);

export const fmtINR = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

export const fmtTime12 = (hhmm: string) => {
  const [hStr, mStr] = (hhmm || "00:00").split(":");
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

export const totalDue = (b: Booking) => Math.max(0, b.totalAmount - b.advancePaid);

export const customerBookings = (cid: string, bookings: Booking[]) =>
  bookings.filter((b) => b.customerId === cid).sort((a, b) => (a.deliveryDate < b.deliveryDate ? 1 : -1));

export const lastPriceFor = (cid: string, service: ServiceType, bookings: Booking[]) => {
  const past = bookings
    .filter((b) => b.customerId === cid && b.service === service)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return past[0]?.pricePerSaree;
};

export const bookingsOnDate = (isoDate: string, bookings: Booking[]) => {
  const ymd = isoDate.slice(0, 10);
  return bookings.filter((b) => b.deliveryDate.slice(0, 10) === ymd);
};
