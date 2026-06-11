import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ServiceType = "prepleat" | "drape";

export interface Measurement {
  label: string; // A, B, C or custom
  value: number; // inches
}

export interface Booking {
  id: string;
  customerId: string;
  artistId?: string;
  service: ServiceType;
  sareeCount: number;
  pricePerSaree: number;
  totalAmount: number;
  advancePaid: number;
  deliveryDate: string; // ISO
  deliveryTime: string; // HH:mm
  notes?: string;
  measurements?: Measurement[];
  createdAt: string;
  completedAt?: string;
  status: "pending" | "completed" | "delivered";
}

export interface Payment {
  id: string;
  bookingId: string;
  customerId: string;
  amount: number;
  date: string;
  note?: string;
}

export type CustomerKind = "client" | "artist";

export interface Customer {
  id: string;
  kind: CustomerKind;
  name: string;
  phone: string; // for whatsapp
  address?: string;
  notes?: string;
  createdAt: string;
}

export type ThemeName = "maroon" | "midnight" | "emerald" | "royal" | "rose" | "sand" | "charcoal";

export interface Settings {
  prepleatPrice: number;
  drapePrice: number;
  defaultMeasurements: Measurement[];
  showPaymentOnCalendar: boolean;
  businessName: string;
  theme: ThemeName;
  logoDataUrl?: string;
}

interface State {
  customers: Customer[];
  bookings: Booking[];
  payments: Payment[];
  settings: Settings;

  addCustomer: (c: Omit<Customer, "id" | "createdAt">) => Customer;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  getCustomer: (id: string) => Customer | undefined;

  addBooking: (b: Omit<Booking, "id" | "createdAt" | "status">) => Booking;
  updateBooking: (id: string, b: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;

  addPayment: (p: Omit<Payment, "id">) => void;
  deletePayment: (id: string) => void;

  updateSettings: (s: Partial<Settings>) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      customers: [],
      bookings: [],
      payments: [],
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
        const booking: Booking = {
          ...b,
          id: uid(),
          createdAt: new Date().toISOString(),
          status: "pending",
        };
        set((s) => ({ bookings: [booking, ...s.bookings] }));
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
        set((s) => ({ bookings: s.bookings.map((x) => (x.id === id ? { ...x, ...b } : x)) })),
      deleteBooking: (id) =>
        set((s) => ({
          bookings: s.bookings.filter((x) => x.id !== id),
          payments: s.payments.filter((p) => p.bookingId !== id),
        })),

      addPayment: (p) =>
        set((s) => {
          const payment: Payment = { ...p, id: uid() };
          // also update booking advancePaid
          const bookings = s.bookings.map((b) =>
            b.id === p.bookingId ? { ...b, advancePaid: b.advancePaid + p.amount } : b,
          );
          return { payments: [payment, ...s.payments], bookings };
        }),
      deletePayment: (id) =>
        set((s) => {
          const pay = s.payments.find((p) => p.id === id);
          if (!pay) return s;
          const bookings = s.bookings.map((b) =>
            b.id === pay.bookingId ? { ...b, advancePaid: Math.max(0, b.advancePaid - pay.amount) } : b,
          );
          return { payments: s.payments.filter((p) => p.id !== id), bookings };
        }),

      updateSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
    }),
    {
      name: "saree-studio-v1",
      version: 3,
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
        persisted.settings = s;
        if (Array.isArray(persisted.customers)) {
          persisted.customers = persisted.customers.map((c: any) => ({ kind: c.kind ?? "client", ...c }));
        }
        return persisted;
      },
    },
  ),
);

// helpers
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
