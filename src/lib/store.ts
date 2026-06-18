import { create } from "zustand";
import { persist } from "zustand/middleware";
import { format as dfFormat, parseISO } from "date-fns";

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
  updatedAt?: string;
  completedAt?: string;
  receivedAt?: string;
  workDoneAt?: string;
  deliveredAt?: string;
  status: "pending" | "completed" | "delivered" | "cancelled";
}

export type PaymentMode = string;

export interface Payment {
  id: string;
  bookingId: string;
  customerId: string;
  amount: number;
  date: string;
  note?: string;
  mode?: PaymentMode;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  note?: string;
  date: string;
  mode?: PaymentMode;
  updatedAt?: string;
}

export interface ExtraIncome {
  id: string;
  amount: number;
  category: string;
  note?: string;
  date: string;
  mode?: PaymentMode;
  updatedAt?: string;
}

export type CustomerKind = "client" | "artist";

export interface Customer {
  id: string;
  kind: CustomerKind;
  name: string;
  phone: string;
  address?: string;
  locationUrl?: string;
  reference?: string;
  notes?: string;
  measurements?: Measurement[];
  createdAt: string;
  updatedAt?: string;
}

export type ThemeName =
  | "maroon"
  | "midnight"
  | "emerald"
  | "royal"
  | "rose"
  | "sand"
  | "charcoal"
  | "gold"
  | "sunset"
  | "ocean"
  | "forest"
  | "vintage"
  | "custom";

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
  artistPrepleatPrice?: number;
  artistDrapePrice?: number;
  defaultMeasurements: Measurement[];
  showPaymentOnCalendar: boolean;
  calendarAmountDisplay?: "none" | "pending" | "total" | "both";
  businessName: string;
  theme: ThemeName;
  customPrimary?: string;
  customColors?: CustomColors;
  logoDataUrl?: string;
  defaultPaymentMode?: PaymentMode;
  websiteUrl?: string;
  businessSlogan?: string;
  businessPhone?: string;
  businessAddress?: string;
  occasionPresets?: string[];
  expenseCategories?: string[];
  incomeCategories?: string[];
  paymentModes?: string[];
  prepleatDotColor?: string;
  directDrapeDotColor?: string;
  artistDotColor?: string;
  dateFormat: string;
  timeFormat: string;
}

export interface DeletedBooking {
  booking: Booking;
  payments: Payment[];
  deletedAt: string;
}

export interface DeletedCustomer {
  customer: Customer;
  bookings: Booking[];
  payments: Payment[];
  deletedAt: string;
}

export interface DeletedPayment {
  payment: Payment;
  deletedAt: string;
}

export interface DeletedExpense {
  expense: Expense;
  deletedAt: string;
}

export interface DeletedExtraIncome {
  extraIncome: ExtraIncome;
  deletedAt: string;
}

export type ActivityKind =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "payment-add"
  | "payment-delete"
  | "cancel";

export interface ActivityEntry {
  id: string;
  ts: string;
  kind: ActivityKind;
  bookingId?: string;
  summary: string;
  prev?: Booking;
  next?: Booking;
}

export interface Tombstone {
  id: string;
  type: "booking" | "payment" | "customer" | "expense" | "extraIncome";
  ts: string;
}

interface State {
  customers: Customer[];
  bookings: Booking[];
  payments: Payment[];
  expenses: Expense[];
  extraIncomes: ExtraIncome[];
  settings: Settings;
  trash: DeletedBooking[];
  deletedCustomers: DeletedCustomer[];
  deletedPayments: DeletedPayment[];
  deletedExpenses: DeletedExpense[];
  deletedExtraIncomes: DeletedExtraIncome[];
  activity: ActivityEntry[];
  redoStack: ActivityEntry[];
  tombstones: Tombstone[];

  addCustomer: (c: Omit<Customer, "id" | "createdAt">) => Customer;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  restoreCustomer: (id: string) => void;
  getCustomer: (id: string) => Customer | undefined;

  addBooking: (b: Omit<Booking, "id" | "createdAt" | "status" | "billNumber">) => Booking;
  updateBooking: (id: string, b: Partial<Booking>) => void;
  cancelBooking: (id: string) => void;
  deleteBooking: (id: string) => void;
  restoreBooking: (id: string) => void;
  undoLastEdit: () => boolean;
  undoActivityEntry: (entryId: string) => boolean;
  redoLastEdit: () => boolean;
  clearActivity: () => void;

  addPayment: (p: Omit<Payment, "id">) => void;
  updatePayment: (id: string, p: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  restorePayment: (id: string) => void;

  addExpense: (e: Omit<Expense, "id" | "updatedAt">) => Expense;
  updateExpense: (id: string, e: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  restoreExpense: (id: string) => void;

  addExtraIncome: (e: Omit<ExtraIncome, "id" | "updatedAt">) => ExtraIncome;
  deleteExtraIncome: (id: string) => void;
  restoreExtraIncome: (id: string) => void;

  updateSettings: (s: Partial<Settings>) => void;
  resetApp: () => void;
  importHistoricalCsv: () => void;
  undoImportHistoricalCsv: () => void;
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
  if (prev.sareeCount !== next.sareeCount)
    parts.push(`sarees ${prev.sareeCount}→${next.sareeCount}`);
  if (prev.pricePerSaree !== next.pricePerSaree)
    parts.push(`price ${prev.pricePerSaree}→${next.pricePerSaree}`);
  if (prev.deliveryDate !== next.deliveryDate)
    parts.push(`date ${prev.deliveryDate.slice(0, 10)}→${next.deliveryDate.slice(0, 10)}`);
  if (prev.deliveryTime !== next.deliveryTime)
    parts.push(`time ${prev.deliveryTime}→${next.deliveryTime}`);
  if (prev.status !== next.status) parts.push(`status ${prev.status}→${next.status}`);
  if ((prev.notes || "") !== (next.notes || "")) parts.push("notes changed");
  if (prev.advancePaid !== next.advancePaid)
    parts.push(`paid ${prev.advancePaid}→${next.advancePaid}`);
  return parts.length ? parts.join(", ") : "minor edit";
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      customers: [],
      bookings: [],
      payments: [],
      expenses: [],
      extraIncomes: [],
      trash: [],
      deletedCustomers: [],
      deletedPayments: [],
      deletedExpenses: [],
      deletedExtraIncomes: [],
      activity: [],
      redoStack: [],
      tombstones: [],
      settings: {
        prepleatPrice: 350,
        drapePrice: 800,
        artistPrepleatPrice: 300,
        artistDrapePrice: 700,
        defaultMeasurements: [
          { label: "Pallu", value: 40 },
          { label: "Waist", value: 32 },
          { label: "Hip", value: 38 },
        ],
        showPaymentOnCalendar: false,
        calendarAmountDisplay: "pending",
        businessName: "Eyas Saree Drapist",
        theme: "royal",
        defaultPaymentMode: "gpay",
        websiteUrl: "https://eyasdrapist.shop/",
        businessSlogan: "Drape with grace · Pleat with love",
        businessPhone: "",
        businessAddress: "",
        occasionPresets: [
          "Bride",
          "Bridesmaid",
          "Engagement",
          "Reception",
          "Baby ceremony",
          "Function",
        ],
        expenseCategories: [
          "Material",
          "Travel",
          "Salary",
          "Rent",
          "Utilities",
          "Marketing",
          "Other",
        ],
        incomeCategories: ["Tips", "Sale", "Other Income"],
        paymentModes: ["gpay", "cash", "other"],
        prepleatDotColor: "#06b6d4", // Cyan
        directDrapeDotColor: "#d946ef", // Fuchsia
        artistDotColor: "#84cc16", // Lime
        dateFormat: "DD-MM-YYYY",
        timeFormat: "12",
      },

      addCustomer: (c) => {
        const now = new Date().toISOString();
        const customer: Customer = { ...c, id: uid(), createdAt: now, updatedAt: now };
        set((s) => ({ customers: [customer, ...s.customers] }));
        return customer;
      },
      updateCustomer: (id, c) =>
        set((s) => ({
          customers: s.customers.map((x) =>
            x.id === id ? { ...x, ...c, updatedAt: new Date().toISOString() } : x,
          ),
        })),
      deleteCustomer: (id) =>
        set((s) => {
          const c = s.customers.find((x) => x.id === id);
          if (!c) return s;
          const ts = new Date().toISOString();
          const relatedBookings = s.bookings.filter((b) => b.customerId === id);
          const relatedPayments = s.payments.filter((p) => p.customerId === id);
          const newTombs: Tombstone[] = [
            { id, type: "customer", ts },
            ...relatedBookings.map((b) => ({ id: b.id, type: "booking" as const, ts })),
            ...relatedPayments.map((p) => ({ id: p.id, type: "payment" as const, ts })),
          ];
          const deletedCustomerEntry: DeletedCustomer = {
            customer: c,
            bookings: relatedBookings,
            payments: relatedPayments,
            deletedAt: ts,
          };
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const deletedCustomers = [
            deletedCustomerEntry,
            ...s.deletedCustomers.filter((x) => new Date(x.deletedAt).getTime() > sevenDaysAgo),
          ].slice(0, 50);

          return {
            customers: s.customers.filter((x) => x.id !== id),
            bookings: s.bookings.filter((b) => b.customerId !== id),
            payments: s.payments.filter((p) => p.customerId !== id),
            deletedCustomers,
            tombstones: [...newTombs, ...s.tombstones].slice(0, 1000),
          };
        }),
      restoreCustomer: (id) =>
        set((s) => {
          const t = s.deletedCustomers.find((x) => x.customer.id === id);
          if (!t) return s;
          const now = new Date().toISOString();
          const restoredIds = new Set([
            t.customer.id,
            ...t.bookings.map((b) => b.id),
            ...t.payments.map((p) => p.id),
          ]);
          return {
            customers: [{ ...t.customer, updatedAt: now }, ...s.customers],
            bookings: [...t.bookings.map((b) => ({ ...b, updatedAt: now })), ...s.bookings],
            payments: [...t.payments.map((p) => ({ ...p, updatedAt: now })), ...s.payments],
            deletedCustomers: s.deletedCustomers.filter((x) => x.customer.id !== id),
            tombstones: s.tombstones.filter((tb) => !restoredIds.has(tb.id)),
          };
        }),
      getCustomer: (id) => get().customers.find((c) => c.id === id),

      addBooking: (b) => {
        const billNumber = generateBillNumber(get().bookings);
        const now = new Date().toISOString();
        const booking: Booking = {
          ...b,
          id: uid(),
          billNumber,
          createdAt: now,
          updatedAt: now,
          receivedAt: now,
          status: "pending",
        };
        const entry: ActivityEntry = {
          id: uid(),
          ts: new Date().toISOString(),
          kind: "create",
          bookingId: booking.id,
          summary: `${billNumber} · ${booking.service} · ${booking.sareeCount} sarees`,
        };
        set((s) => ({
          bookings: [booking, ...s.bookings],
          activity: [entry, ...s.activity].slice(0, 50),
          redoStack: [],
        }));
        if (b.advancePaid > 0) {
          const pid = uid();
          set((s) => ({
            payments: [
              {
                id: pid,
                bookingId: booking.id,
                customerId: b.customerId,
                amount: b.advancePaid,
                date: now,
                note: "Advance",
                updatedAt: now,
              },
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
          const next = { ...prev, ...b, updatedAt: new Date().toISOString() };
          const entry: ActivityEntry = {
            id: uid(),
            ts: new Date().toISOString(),
            kind: "update",
            bookingId: id,
            summary: describeDiff(prev, next),
            prev,
            next,
          };
          return {
            bookings: s.bookings.map((x) => (x.id === id ? next : x)),
            activity: [entry, ...s.activity].slice(0, 50),
            redoStack: [],
          };
        }),
      cancelBooking: (id) =>
        set((s) => {
          const prev = s.bookings.find((x) => x.id === id);
          if (!prev) return s;
          const next: Booking = {
            ...prev,
            status: "cancelled",
            updatedAt: new Date().toISOString(),
          };
          const entry: ActivityEntry = {
            id: uid(),
            ts: new Date().toISOString(),
            kind: "cancel",
            bookingId: id,
            summary: `cancelled ${prev.billNumber ?? prev.service}`,
            prev,
            next,
          };
          return {
            bookings: s.bookings.map((x) => (x.id === id ? next : x)),
            activity: [entry, ...s.activity].slice(0, 50),
            redoStack: [],
          };
        }),
      deleteBooking: (id) =>
        set((s) => {
          const b = s.bookings.find((x) => x.id === id);
          if (!b) return s;
          const relatedPayments = s.payments.filter((p) => p.bookingId === id);
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const deletedAt = new Date().toISOString();
          const trash = [
            { booking: b, payments: relatedPayments, deletedAt },
            ...s.trash.filter((t) => new Date(t.deletedAt).getTime() > sevenDaysAgo),
          ].slice(0, 50);
          const entry: ActivityEntry = {
            id: uid(),
            ts: deletedAt,
            kind: "delete",
            bookingId: id,
            summary: `deleted ${b.billNumber ?? b.service}`,
          };
          const newTombs: Tombstone[] = [
            { id, type: "booking", ts: deletedAt },
            ...relatedPayments.map((p) => ({ id: p.id, type: "payment" as const, ts: deletedAt })),
          ];
          return {
            bookings: s.bookings.filter((x) => x.id !== id),
            payments: s.payments.filter((p) => p.bookingId !== id),
            trash,
            activity: [entry, ...s.activity].slice(0, 50),
            redoStack: [],
            tombstones: [...newTombs, ...s.tombstones].slice(0, 1000),
          };
        }),
      restoreBooking: (id) =>
        set((s) => {
          const t = s.trash.find((x) => x.booking.id === id);
          if (!t) return s;
          const now = new Date().toISOString();
          const entry: ActivityEntry = {
            id: uid(),
            ts: now,
            kind: "restore",
            bookingId: id,
            summary: `restored ${t.booking.billNumber ?? t.booking.service}`,
          };
          const restoredIds = new Set([t.booking.id, ...t.payments.map((p) => p.id)]);
          return {
            bookings: [{ ...t.booking, updatedAt: now }, ...s.bookings],
            payments: [...t.payments.map((p) => ({ ...p, updatedAt: now })), ...s.payments],
            trash: s.trash.filter((x) => x.booking.id !== id),
            tombstones: s.tombstones.filter((tb) => !restoredIds.has(tb.id)),
            activity: [entry, ...s.activity].slice(0, 50),
          };
        }),
      undoLastEdit: () => {
        const s = get();
        const idx = s.activity.findIndex(
          (e) => (e.kind === "update" || e.kind === "cancel") && e.prev && e.next,
        );
        if (idx === -1) return false;
        const entry = s.activity[idx];
        set({
          bookings: s.bookings.map((x) =>
            x.id === entry.bookingId ? { ...entry.prev!, updatedAt: new Date().toISOString() } : x,
          ),
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
          bookings: s.bookings.map((x) =>
            x.id === entry.bookingId ? { ...entry.next!, updatedAt: new Date().toISOString() } : x,
          ),
          activity: [{ ...entry, id: uid(), ts: new Date().toISOString() }, ...s.activity].slice(
            0,
            50,
          ),
          redoStack: rest,
        });
        return true;
      },
      undoActivityEntry: (entryId) => {
        const s = get();
        const idx = s.activity.findIndex((e) => e.id === entryId);
        if (idx === -1) return false;
        const entry = s.activity[idx];
        if (!entry.prev || !entry.bookingId) return false;
        set({
          bookings: s.bookings.map((x) =>
            x.id === entry.bookingId ? { ...entry.prev!, updatedAt: new Date().toISOString() } : x,
          ),
          activity: s.activity.filter((_, i) => i !== idx),
          redoStack: [entry, ...s.redoStack].slice(0, 50),
        });
        return true;
      },
      clearActivity: () => set({ activity: [], redoStack: [] }),

      addPayment: (p) =>
        set((s) => {
          const now = new Date().toISOString();
          const payment: Payment = { ...p, id: uid(), updatedAt: now };
          const bookings = s.bookings.map((b) => {
            if (b.id !== p.bookingId) return b;
            const newPaid = b.advancePaid + p.amount;
            const fullyPaid = newPaid >= b.totalAmount;
            return {
              ...b,
              advancePaid: newPaid,
              status: fullyPaid && b.status === "pending" ? "completed" : b.status,
              updatedAt: now,
            };
          });
          const entry: ActivityEntry = {
            id: uid(),
            ts: now,
            kind: "payment-add",
            bookingId: p.bookingId,
            summary: `paid ₹${p.amount} (${p.mode ?? "gpay"})`,
          };
          return {
            payments: [payment, ...s.payments],
            bookings,
            activity: [entry, ...s.activity].slice(0, 50),
          };
        }),
      updatePayment: (id, patch) =>
        set((s) => ({
          payments: s.payments.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
          ),
        })),
      deletePayment: (id) =>
        set((s) => {
          const pay = s.payments.find((p) => p.id === id);
          if (!pay) return s;
          const now = new Date().toISOString();
          const bookings = s.bookings.map((b) => {
            if (b.id !== pay.bookingId) return b;
            const newPaid = Math.max(0, b.advancePaid - pay.amount);
            const stillFullyPaid = newPaid >= b.totalAmount;
            return {
              ...b,
              advancePaid: newPaid,
              status: !stillFullyPaid && b.status === "completed" ? "pending" : b.status,
              updatedAt: now,
            };
          });
          const entry: ActivityEntry = {
            id: uid(),
            ts: now,
            kind: "payment-delete",
            bookingId: pay.bookingId,
            summary: `removed payment ₹${pay.amount}`,
          };
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const deletedPayments = [
            { payment: pay, deletedAt: now },
            ...s.deletedPayments.filter((x) => new Date(x.deletedAt).getTime() > sevenDaysAgo),
          ].slice(0, 50);

          return {
            payments: s.payments.filter((p) => p.id !== id),
            bookings,
            deletedPayments,
            activity: [entry, ...s.activity].slice(0, 50),
            tombstones: [{ id, type: "payment" as const, ts: now }, ...s.tombstones].slice(0, 1000),
          };
        }),
      restorePayment: (id) =>
        set((s) => {
          const t = s.deletedPayments.find((x) => x.payment.id === id);
          if (!t) return s;
          const now = new Date().toISOString();
          const newPayment = { ...t.payment, updatedAt: now };
          const updatedPayments = [newPayment, ...s.payments];
          const bookings = s.bookings.map((b) => {
            if (b.id !== t.payment.bookingId) return b;
            const relatedPayments = updatedPayments.filter((p) => p.bookingId === b.id);
            const totalPaid = relatedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
            const isFullyPaid = totalPaid >= b.totalAmount;
            return {
              ...b,
              advancePaid: totalPaid,
              status: isFullyPaid && b.status === "pending" ? "completed" : b.status,
              updatedAt: now,
            };
          });
          return {
            payments: updatedPayments,
            bookings,
            deletedPayments: s.deletedPayments.filter((x) => x.payment.id !== id),
            tombstones: s.tombstones.filter((tb) => tb.id !== id),
          };
        }),

      addExpense: (e) => {
        const now = new Date().toISOString();
        const expense: Expense = { ...e, id: uid(), updatedAt: now };
        set((s) => ({ expenses: [expense, ...s.expenses] }));
        return expense;
      },
      updateExpense: (id, patch) =>
        set((s) => ({
          expenses: s.expenses.map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e,
          ),
        })),
      deleteExpense: (id) =>
        set((s) => {
          const exp = s.expenses.find((e) => e.id === id);
          if (!exp) return s;
          const now = new Date().toISOString();
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const deletedExpenses = [
            { expense: exp, deletedAt: now },
            ...s.deletedExpenses.filter((x) => new Date(x.deletedAt).getTime() > sevenDaysAgo),
          ].slice(0, 50);
          return {
            expenses: s.expenses.filter((e) => e.id !== id),
            deletedExpenses,
            tombstones: [{ id, type: "expense" as const, ts: now }, ...s.tombstones].slice(0, 1000),
          };
        }),
      restoreExpense: (id) =>
        set((s) => {
          const t = s.deletedExpenses.find((x) => x.expense.id === id);
          if (!t) return s;
          const now = new Date().toISOString();
          return {
            expenses: [{ ...t.expense, updatedAt: now }, ...s.expenses],
            deletedExpenses: s.deletedExpenses.filter((x) => x.expense.id !== id),
            tombstones: s.tombstones.filter((tb) => tb.id !== id),
          };
        }),

      addExtraIncome: (e) => {
        const now = new Date().toISOString();
        const item: ExtraIncome = { ...e, id: uid(), updatedAt: now };
        set((s) => ({ extraIncomes: [item, ...s.extraIncomes] }));
        return item;
      },
      deleteExtraIncome: (id) =>
        set((s) => {
          const item = s.extraIncomes.find((e) => e.id === id);
          if (!item) return s;
          const now = new Date().toISOString();
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const deletedExtraIncomes = [
            { extraIncome: item, deletedAt: now },
            ...s.deletedExtraIncomes.filter((x) => new Date(x.deletedAt).getTime() > sevenDaysAgo),
          ].slice(0, 50);
          return {
            extraIncomes: s.extraIncomes.filter((e) => e.id !== id),
            deletedExtraIncomes,
            tombstones: [{ id, type: "extraIncome" as const, ts: now }, ...s.tombstones].slice(0, 1000),
          };
        }),
      restoreExtraIncome: (id) =>
        set((s) => {
          const t = s.deletedExtraIncomes.find((x) => x.extraIncome.id === id);
          if (!t) return s;
          const now = new Date().toISOString();
          return {
            extraIncomes: [{ ...t.extraIncome, updatedAt: now }, ...s.extraIncomes],
            deletedExtraIncomes: s.deletedExtraIncomes.filter((x) => x.extraIncome.id !== id),
            tombstones: s.tombstones.filter((tb) => tb.id !== id),
          };
        }),

      updateSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),

      resetApp: () =>
        set({
          customers: [],
          bookings: [],
          payments: [],
          expenses: [],
          extraIncomes: [],
          trash: [],
          deletedCustomers: [],
          deletedPayments: [],
          deletedExpenses: [],
          deletedExtraIncomes: [],
          activity: [],
          redoStack: [],
          tombstones: [],
          settings: {
            prepleatPrice: 350,
            drapePrice: 800,
            artistPrepleatPrice: 300,
            artistDrapePrice: 700,
            defaultMeasurements: [
              { label: "Pallu", value: 40 },
              { label: "Waist", value: 32 },
              { label: "Hip", value: 38 },
            ],
            showPaymentOnCalendar: false,
            calendarAmountDisplay: "pending",
            businessName: "Eyas Saree Drapist",
            theme: "royal",
            defaultPaymentMode: "gpay",
            websiteUrl: "https://eyasdrapist.shop/",
            businessSlogan: "Drape with grace · Pleat with love",
            businessPhone: "",
            businessAddress: "",
            occasionPresets: [
              "Bride",
              "Bridesmaid",
              "Engagement",
              "Reception",
              "Baby ceremony",
              "Function",
            ],
            expenseCategories: [
              "Material",
              "Travel",
              "Salary",
              "Rent",
              "Utilities",
              "Marketing",
              "Other",
            ],
            incomeCategories: ["Tips", "Sale", "Other Income"],
            paymentModes: ["gpay", "cash", "other"],
            dateFormat: "DD-MM-YYYY",
            timeFormat: "12",
          },
        }),

      importHistoricalCsv: () => {
        // Idempotency guard — if data was already imported, do nothing on subsequent calls
        const existingPayments = get().payments ?? [];
        const alreadyImported = existingPayments.some((p: any) => p.note === "Imported Earning");
        if (alreadyImported) return;

        const rawCsv = `13-01-2026,Saree Prepleat,1500,
14-01-2026,Jeysu Artist,300,GPay
16-01-2026,Srinithi,1700,
25-01-2026,Nandhini,1050,GPay
26-01-2026,Sathya Artist,250,GPay
26-01-2026,Keerthana,1650,GPay
26-01-2026,Agashya Artist,1200,GPay
26-01-2026,Anu Artist,650,GPay
26-01-2026,Agashya Artist,400,GPay
26-01-2026,Thermozhi,400,GPay
27-01-2026,Asvini,700,GPay
27-01-2026,Asvini,1050,GPay
27-01-2026,Maheswari,500,Cash
27-01-2026,Maheswari,500,Cash
27-01-2026,Thermozhi,350,GPay
27-01-2026,Sangeetha,250,Cash
27-01-2026,Bhoomika,800,GPay
28-01-2026,Praneetha Artist,1500,Cash
28-01-2026,Maha,250,GPay
29-01-2026,Dhanam,250,Cash
29-01-2026,Ragheni,400,Cash
06-02-2026,Agashya Artist,1400,GPay
06-02-2026,Agashya Artist,800,GPay
06-02-2026,Priyanka,1700,GPay
07-02-2026,Gokulapriya,500,GPay
09-02-2026,Yasodha,1250,Cash
09-02-2026,Karthi,500,GPay
09-02-2026,Arathi,350,GPay
09-02-2026,Sujitha,250,GPay
13-02-2026,Agashya Artist,400,GPay
13-02-2026,Agashya Artist,400,GPay
14-02-2026,Sindhuja,100,GPay
15-02-2026,Praneetha Artist,3200,GPay
16-02-2026,Abirami,750,GPay
17-02-2026,Soundarya Sathish,1800,GPay
17-02-2026,Anu Artist,300,GPay
18-02-2026,Maheswari,500,Cash
18-02-2026,Sowmiya,600,GPay
18-02-2026,Sangeetha,200,GPay
18-02-2026,Priya,450,GPay
18-02-2026,Gokulapriya,1000,GPay
18-02-2026,Srinithi,2450,GPay
20-02-2026,Anu Artist,9500,GPay
20-02-2026,Deepika,300,Cash
20-02-2026,Agashya Artist,750,GPay
20-02-2026,Praneetha Artist,4000,GPay
21-02-2026,Gokulapriya,500,GPay
21-02-2026,Srinithi,350,Cash
21-02-2026,Poorvisha,1800,GPay
22-02-2026,Praneetha Artist,2500,GPay
23-02-2026,Anu Artist,4050,GPay
26-02-2026,Priyanka,850,GPay
27-02-2026,Praneetha Artist,850,GPay
01-03-2026,Anu Artist,700,GPay
01-03-2026,Gokulapriya,650,GPay
04-03-2026,Anu Artist,1650,GPay
06-03-2026,Agashya Artist,2900,GPay
07-03-2026,Anu Artist,1150,GPay
08-03-2026,Vikasini Artist,800,GPay
11-03-2026,Praneetha Artist,1000,GPay
15-03-2026,Praneetha Artist,850,GPay
21-03-2026,Preena,300,Cash
25-03-2026,Arathi,1000,Cash
25-03-2026,Sindhuja,900,GPay
25-03-2026,Nivetha,750,GPay
25-03-2026,Poonisha,1000,GPay
26-03-2026,Shivani,2900,GPay
27-03-2026,Elakkiya,1000,GPay
27-03-2026,Anu Artist,300,GPay
03-04-2026,Nivetha,300,GPay
05-04-2026,Sripriya,250,GPay
07-04-2026,Anu Artist,700,GPay
11-04-2026,Anu Artist,350,GPay
12-04-2026,Priya,900,GPay
12-04-2026,Srinithi,900,Cash
12-04-2026,Yamini,800,GPay
13-04-2026,Praneetha Artist,3500,GPay
17-04-2026,Sanjana,350,GPay
18-04-2026,Anu Artist,300,GPay
19-04-2026,Anu Artist,350,GPay
21-04-2026,Praneetha Artist,1000,GPay
24-04-2026,Shalini,700,Cash
29-04-2026,Anu Artist,600,Cash
01-05-2026,Praneetha Artist,6100,GPay
05-05-2026,Varthi,1000,Cash
06-05-2026,Jeysu Artist,1600,Cash
08-05-2026,Oviya,300,Cash
12-05-2026,Priyadarshini,300,Cash
12-05-2026,Yamini,800,Cash
16-05-2026,Maheswari,500,Cash
16-05-2026,Sowmiya,1400,Cash
16-05-2026,Praneetha Artist,950,GPay
17-05-2026,Dhivya,700,GPay
17-05-2026,Yalini,1200,Cash
20-05-2026,Yamini,200,GPay
20-05-2026,Malarvizhi,1600,GPay
22-05-2026,Suganya,800,GPay
23-05-2026,Senthamil,1050,GPay
24-05-2026,Dhivya,350,Cash
24-05-2026,Saritha,2100,GPay
25-05-2026,Kaimalar,2500,Cash
25-05-2026,Sujitha,500,Cash
25-05-2026,Nandhika,3000,GPay
25-05-2026,Dhivya,700,GPay
25-05-2026,Anu Artist,1400,Cash
26-05-2026,Suganya,900,GPay
27-05-2026,Vijayalakshmi,350,Cash
27-05-2026,Narmatha,350,GPay
27-05-2026,Mithra,3600,GPay
27-05-2026,Sangeetha,300,Cash
27-05-2026,Shalini,600,Cash
27-05-2026,Jeysu Artist,350,GPay
27-05-2026,Bhoomika,650,Cash
28-05-2026,Praneetha Artist,1850,GPay
28-05-2026,Kavya Artist,500,GPay
28-05-2026,Bhoomika,950,Cash
28-05-2026,Agashya Artist,700,Cash
28-05-2026,Manochitra,350,GPay
29-05-2026,Jeysu Artist,1100,Cash
29-05-2026,Kavya Artist,500,Cash
29-05-2026,Nivetha,500,Cash
30-05-2026,Mithra,5600,GPay
30-05-2026,Priya,2050,GPay
30-05-2026,Srinithi,900,Cash
31-05-2026,Selvanika,450,GPay
01-06-2026,Praneetha Artist,5750,Cash
03-06-2026,Sanjana,900,Cash
03-06-2026,Priya,1300,GPay
03-06-2026,Anu Artist,1400,Cash
04-06-2026,Anu Artist,950,GPay
05-06-2026,Ramya,250,Cash
06-06-2026,Priya,450,Cash
06-06-2026,Selvanika,450,Cash
07-06-2026,Navena Shree,350,Cash
07-06-2026,Kavya Artist,600,Cash
07-06-2026,Anu Artist,2450,GPay
08-06-2026,Madhuwarshini,200,Cash
08-06-2026,Sangeetha,1250,GPay
13-06-2026,Shalini,1500,Cash`;

        const lines = rawCsv
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const allCsvNames = new Set([
          "saree prepleat",
          "jeysu prepleat",
          "srinithi drape",
          "nandhini",
          "sathya artist",
          "keerthana",
          "agashya advance",
          "anu sri",
          "thermozhi",
          "asvini mom",
          "asvini chithi",
          "maheswari",
          "maheswari relative",
          "sangeetha gokulakrishnan",
          "bhoomika engagement drape",
          "pradeetha artist",
          "maha prepleat",
          "dhanam saree",
          "ragheni",
          "agashya feb event",
          "agashya march advance",
          "dr priyanka",
          "gokulapriya advance",
          "yasodha",
          "karthi",
          "arathi",
          "sujitha",
          "agashya artist advance",
          "agashya artist april advance",
          "sindhuja",
          "praneetha artist",
          "abirami",
          "soundarya sathish",
          "anu jeysu ref",
          "sowmiya",
          "sangeetha half saree",
          "priya vijayapathi",
          "gokulapriya",
          "srinithi",
          "anu renisha drape",
          "deepika prepleat",
          "agashya",
          "praneetha",
          "poorvisha",
          "praneetha abirami drape",
          "anu sri ref",
          "anusi saree prepleat",
          "anusi",
          "vikasini artist",
          "praneetha one drape",
          "preena",
          "arathi drape",
          "sindhuja drape",
          "anu gumathi drape",
          "priyadarshini",
          "priyanka athai drape",
          "anu makeup artist",
          "sangeetha",
          "malarvizhi",
          "dhivya",
          "yamini",
          "sripriya",
          "yamini maya",
          "yamini advance",
          "elakkiya",
          "saritha",
          "megha mithra",
          "mithra",
          "sanjana",
          "sanjana prepleat",
          "nandhika",
          "senthamil",
          "sathya",
          "kavya artist",
          "kavya",
          "manochitra",
          "vijayalakshmi",
          "selvanika",
          "navena shree",
          "kavya parthiban",
          "madhuwarshini",
          "poonisha",
          "oviya prepleat",
          "shalini",
          "shivani",
          "suganya",
          "varthi",
          "jeysu",
          "jeysu advance",
          "priya",
          "priya drape",
          "priya suresh",
          "yalini",
          "agashya artist",
          "anu artist",
          "jeysu artist",
          "bhoomika",
          "asvini",
          "priyanka",
          "maha",
          "nivetha",
          "oviya",
        ]);

        const paymentsBefore = get().payments ?? [];
        const importedPayments = paymentsBefore.filter((p: any) => p.note === "Imported Earning");
        const importedBookingIds = new Set(
          importedPayments.map((p: any) => p.bookingId).filter(Boolean),
        );

        const payments = paymentsBefore.filter((p: any) => p.note !== "Imported Earning");
        const bookings = (get().bookings ?? []).filter((b: any) => !importedBookingIds.has(b.id));

        const remainingBookingCustomerIds = new Set(bookings.map((b: any) => b.customerId));
        const customers = (get().customers ?? []).filter((c: any) => {
          if (c.kind === "client") {
            return remainingBookingCustomerIds.has(c.id);
          }
          return true; // Keep all artists
        });

        const manualPayments = [...payments];
        const monthCounters = new Map<string, number>();

        for (const b of bookings) {
          if (b.billNumber) {
            const parts = b.billNumber.split("-");
            if (parts.length === 3) {
              const ym = parts[1];
              const num = Number(parts[2]) || 0;
              if (num > (monthCounters.get(ym) ?? 0)) {
                monthCounters.set(ym, num);
              }
            }
          }
        }

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const parts = line.split(",");
          if (parts.length < 3) continue;
          const dateStr = parts[0].trim();
          const name = parts[1].trim();
          const amountStr = parts[2].trim();
          const modeRaw = parts[3] ? parts[3].trim() : "";

          const amount = Number(amountStr) || 0;
          if (amount <= 0) continue;

          const dateParts = dateStr.split("-");
          if (dateParts.length !== 3) continue;
          const isoDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
          const timestamp = new Date().toISOString();

          let mode = "other";
          if (modeRaw.toLowerCase() === "gpay") mode = "gpay";
          else if (modeRaw.toLowerCase() === "cash") mode = "cash";

          const isDuplicate = manualPayments.some(
            (p) =>
              p.amount === amount &&
              p.date === isoDate &&
              p.mode === mode &&
              customers.find((c) => c.id === p.customerId)?.name?.toLowerCase() ===
                name.toLowerCase(),
          );
          if (isDuplicate) continue;

          let c = customers.find((x: any) => x.name?.toLowerCase() === name.toLowerCase());
          if (!c) {
            const isArtist = name.toLowerCase().includes("artist");
            c = {
              id: `imp-c-${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
              kind: isArtist ? "artist" : "client",
              name,
              phone: "",
              createdAt: timestamp,
              updatedAt: timestamp,
            };
            customers.push(c);
          }

          let service: ServiceType = "prepleat";
          if (name.toLowerCase().includes("drape")) {
            service = "drape";
          }

          const ym = `${dateParts[2]}${dateParts[1]}`;
          const prefix = `EYAS-${ym}-`;
          const n = (monthCounters.get(ym) ?? 0) + 1;
          monthCounters.set(ym, n);
          const billNumber = `${prefix}${String(n).padStart(4, "0")}`;

          const bId = `imp-b-${ym}-${i}`;
          const booking: Booking = {
            id: bId,
            billNumber,
            customerId: c.id,
            artistId: c.kind === "artist" ? c.id : undefined,
            service,
            sareeCount: 1,
            pricePerSaree: amount,
            totalAmount: amount,
            advancePaid: amount,
            deliveryDate: isoDate,
            deliveryTime: "09:00",
            createdAt: timestamp,
            updatedAt: timestamp,
            completedAt: timestamp,
            receivedAt: timestamp,
            workDoneAt: timestamp,
            deliveredAt: timestamp,
            status: "delivered",
          };
          bookings.push(booking);

          const pId = `imp-p-${ym}-${i}`;
          const payment = {
            id: pId,
            bookingId: bId,
            customerId: c.id,
            amount,
            date: isoDate,
            mode,
            note: "Imported Earning",
            updatedAt: timestamp,
          };
          payments.push(payment);
        }

        set({ customers, bookings, payments });
      },

      undoImportHistoricalCsv: () => {
        const importedPayments = (get().payments ?? []).filter(
          (p: any) => p.note === "Imported Earning",
        );
        if (importedPayments.length === 0) return;

        const importedBookingIds = new Set(
          importedPayments.map((p: any) => p.bookingId).filter(Boolean),
        );

        const payments = (get().payments ?? []).filter((p: any) => p.note !== "Imported Earning");
        const bookings = (get().bookings ?? []).filter((b: any) => !importedBookingIds.has(b.id));

        const remainingCustomerIds = new Set(bookings.map((b: any) => b.customerId));
        const customers = (get().customers ?? []).filter((c: any) => {
          if (c.kind === "client") return remainingCustomerIds.has(c.id);
          return true; // keep artists
        });

        // Add tombstones for deleted records so CloudSync propagates the deletions
        const deletedPayments = importedPayments;
        const deletedBookings = (get().bookings ?? []).filter((b: any) => importedBookingIds.has(b.id));
        const deletedCustomers = (get().customers ?? []).filter((c: any) => {
          if (c.kind === "client") return !remainingCustomerIds.has(c.id);
          return false;
        });

        const now = new Date().toISOString();
        const newTombs: Tombstone[] = [
          ...deletedBookings.map((b) => ({ id: b.id, type: "booking" as const, ts: now })),
          ...deletedPayments.map((p) => ({ id: p.id, type: "payment" as const, ts: now })),
          ...deletedCustomers.map((c) => ({ id: c.id, type: "customer" as const, ts: now })),
        ];

        set((s) => ({ 
          customers, 
          bookings, 
          payments,
          tombstones: [...newTombs, ...(s.tombstones || [])].slice(0, 5000)
        }));
      },
    }),
    {
      name: "saree-studio-v1",
      version: 20,
      migrate: (persisted: any, _version) => {
        if (!persisted) return persisted;
        const s = persisted.settings ?? {};
        if (s.theme === "maroon" || s.theme === undefined) {
          s.theme = "royal";
        }
        if (s.calendarAmountDisplay === undefined) {
          s.calendarAmountDisplay = "pending";
        }
        if (s.businessName === "Saree Studio") s.businessName = "Eyas Saree Drapist";
        if (s.prepleatPrice === 150) s.prepleatPrice = 350;
        if (s.drapePrice === 300) s.drapePrice = 800;
        if (typeof s.artistPrepleatPrice !== "number")
          s.artistPrepleatPrice = s.prepleatPrice ?? 350;
        if (typeof s.artistDrapePrice !== "number") s.artistDrapePrice = s.drapePrice ?? 800;
        if (!Array.isArray(s.defaultMeasurements)) {
          s.defaultMeasurements = [
            { label: "Pallu", value: 40 },
            { label: "Waist", value: 32 },
            { label: "Hip", value: 38 },
          ];
        } else {
          const labels = s.defaultMeasurements.map((m: any) => m.label).join(",");
          if (labels === "A,B,C" || labels === "P,W,H") {
            s.defaultMeasurements = [
              { label: "Pallu", value: 40 },
              { label: "Waist", value: 32 },
              { label: "Hip", value: 38 },
            ];
          } else {
            s.defaultMeasurements = s.defaultMeasurements.map((m: any) => {
              if (m.label === "P") return { ...m, label: "Pallu" };
              if (m.label === "W") return { ...m, label: "Waist" };
              if (m.label === "H") return { ...m, label: "Hip" };
              return m;
            });
          }
        }
        if (Array.isArray(persisted.bookings)) {
          persisted.bookings = persisted.bookings.map((b: any) => {
            if (Array.isArray(b.measurements)) {
              b.measurements = b.measurements.map((m: any) => {
                if (m.label === "P") return { ...m, label: "Pallu" };
                if (m.label === "W") return { ...m, label: "Waist" };
                if (m.label === "H") return { ...m, label: "Hip" };
                return m;
              });
            }
            return b;
          });
        }
        if (Array.isArray(persisted.trash)) {
          persisted.trash = persisted.trash.map((t: any) => {
            if (t.booking && Array.isArray(t.booking.measurements)) {
              t.booking.measurements = t.booking.measurements.map((m: any) => {
                if (m.label === "P") return { ...m, label: "Pallu" };
                if (m.label === "W") return { ...m, label: "Waist" };
                if (m.label === "H") return { ...m, label: "Hip" };
                return m;
              });
            }
            return t;
          });
        }
        if (!Array.isArray(s.occasionPresets)) {
          s.occasionPresets = [
            "Bride",
            "Bridesmaid",
            "Engagement",
            "Reception",
            "Baby ceremony",
            "Function",
          ];
        }
        if (!Array.isArray(s.expenseCategories)) {
          s.expenseCategories = [
            "Material",
            "Travel",
            "Salary",
            "Rent",
            "Utilities",
            "Marketing",
            "Other",
          ];
        }
        if (!Array.isArray(s.incomeCategories)) {
          s.incomeCategories = ["Tips", "Sale", "Other Income"];
        }
        if (!Array.isArray(s.paymentModes)) {
          s.paymentModes = ["gpay", "cash", "other"];
        }
        persisted.settings = s;
        if (Array.isArray(persisted.customers)) {
          persisted.customers = persisted.customers.map((c: any) => ({
            kind: c.kind ?? "client",
            ...c,
          }));
        }
        // Backfill bill numbers
        if (Array.isArray(persisted.bookings)) {
          const monthCounters = new Map<string, number>();
          // Sort by created date so existing order yields stable numbering
          const sorted = [...persisted.bookings].sort((a: any, b: any) =>
            (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
          );
          for (const b of sorted) {
            if (b.billNumber) continue;
            const d = new Date(b.createdAt || Date.now());
            const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
            const prefix = `EYAS-${ym}-`;
            const n = (monthCounters.get(ym) ?? 0) + 1;
            monthCounters.set(ym, n);
            b.billNumber = `${prefix}${String(n).padStart(4, "0")}`;
          }
          // Backfill workflow timestamps
          for (const b of persisted.bookings) {
            if (!b.receivedAt) b.receivedAt = b.createdAt;
            if (b.status === "delivered" && !b.deliveredAt)
              b.deliveredAt = b.completedAt || b.createdAt;
            if ((b.status === "delivered" || b.status === "completed") && !b.workDoneAt)
              b.workDoneAt = b.completedAt || b.createdAt;
          }
        }
        if (!Array.isArray(persisted.activity)) persisted.activity = [];
        if (!Array.isArray(persisted.redoStack)) persisted.redoStack = [];
        if (!Array.isArray(persisted.tombstones)) persisted.tombstones = [];
        if (!Array.isArray(persisted.expenses)) persisted.expenses = [];
        if (!Array.isArray(persisted.extraIncomes)) persisted.extraIncomes = [];
        if (Array.isArray(persisted.bookings)) {
          for (const b of persisted.bookings) {
            if (!b.updatedAt)
              b.updatedAt =
                b.deliveredAt || b.workDoneAt || b.completedAt || b.receivedAt || b.createdAt;
          }
        }
        if (Array.isArray(persisted.customers)) {
          for (const c of persisted.customers) if (!c.updatedAt) c.updatedAt = c.createdAt;
        }
        if (Array.isArray(persisted.payments)) {
          for (const p of persisted.payments) if (!p.updatedAt) p.updatedAt = p.date;
        }

        if (_version < 20) {
          // Clean up any previously imported historical entries from v14/v15 (note: "Imported Earning")
          // to prevent double entries or duplicate client/artist entries.
          const payments = persisted.payments ?? [];
          const importedPayments = payments.filter((p: any) => p.note === "Imported Earning");
          const importedBookingIds = new Set(
            importedPayments.map((p: any) => p.bookingId).filter(Boolean),
          );

          persisted.payments = payments.filter((p: any) => p.note !== "Imported Earning");

          const bookings = persisted.bookings ?? [];
          persisted.bookings = bookings.filter((b: any) => !importedBookingIds.has(b.id));

          // Import the corrected merged master CSV
          const rawCsv = `13-01-2026,Saree Prepleat,1500,
14-01-2026,Jeysu Artist,300,GPay
16-01-2026,Srinithi,1700,
25-01-2026,Nandhini,1050,GPay
26-01-2026,Sathya Artist,250,GPay
26-01-2026,Keerthana,1650,GPay
26-01-2026,Agashya Artist,1200,GPay
26-01-2026,Anu Artist,650,GPay
26-01-2026,Agashya Artist,400,GPay
26-01-2026,Thermozhi,400,GPay
27-01-2026,Asvini,700,GPay
27-01-2026,Asvini,1050,GPay
27-01-2026,Maheswari,500,Cash
27-01-2026,Maheswari,500,Cash
27-01-2026,Thermozhi,350,GPay
27-01-2026,Sangeetha,250,Cash
27-01-2026,Bhoomika,800,GPay
28-01-2026,Praneetha Artist,1500,Cash
28-01-2026,Maha,250,GPay
29-01-2026,Dhanam,250,Cash
29-01-2026,Ragheni,400,Cash
06-02-2026,Agashya Artist,1400,GPay
06-02-2026,Agashya Artist,800,GPay
06-02-2026,Priyanka,1700,GPay
07-02-2026,Gokulapriya,500,GPay
09-02-2026,Yasodha,1250,Cash
09-02-2026,Karthi,500,GPay
09-02-2026,Arathi,350,GPay
09-02-2026,Sujitha,250,GPay
13-02-2026,Agashya Artist,400,GPay
13-02-2026,Agashya Artist,400,GPay
14-02-2026,Sindhuja,100,GPay
15-02-2026,Praneetha Artist,3200,GPay
16-02-2026,Abirami,750,GPay
17-02-2026,Soundarya Sathish,1800,GPay
17-02-2026,Anu Artist,300,GPay
18-02-2026,Maheswari,500,Cash
18-02-2026,Sowmiya,600,GPay
18-02-2026,Sangeetha,200,GPay
18-02-2026,Priya,450,GPay
18-02-2026,Gokulapriya,1000,GPay
18-02-2026,Srinithi,2450,GPay
20-02-2026,Anu Artist,9500,GPay
20-02-2026,Deepika,300,Cash
20-02-2026,Agashya Artist,750,GPay
20-02-2026,Praneetha Artist,4000,GPay
21-02-2026,Gokulapriya,500,GPay
21-02-2026,Srinithi,350,Cash
21-02-2026,Poorvisha,1800,GPay
22-02-2026,Praneetha Artist,2500,GPay
23-02-2026,Anu Artist,4050,GPay
26-02-2026,Priyanka,850,GPay
27-02-2026,Praneetha Artist,850,GPay
01-03-2026,Anu Artist,700,GPay
01-03-2026,Gokulapriya,650,GPay
04-03-2026,Anu Artist,1650,GPay
06-03-2026,Agashya Artist,2900,GPay
07-03-2026,Anu Artist,1150,GPay
08-03-2026,Vikasini Artist,800,GPay
11-03-2026,Praneetha Artist,1000,GPay
15-03-2026,Praneetha Artist,850,GPay
21-03-2026,Preena,300,Cash
25-03-2026,Arathi,1000,Cash
25-03-2026,Sindhuja,900,GPay
25-03-2026,Nivetha,750,GPay
25-03-2026,Poonisha,1000,GPay
26-03-2026,Shivani,2900,GPay
27-03-2026,Elakkiya,1000,GPay
27-03-2026,Anu Artist,300,GPay
03-04-2026,Nivetha,300,GPay
05-04-2026,Sripriya,250,GPay
07-04-2026,Anu Artist,700,GPay
11-04-2026,Anu Artist,350,GPay
12-04-2026,Priya,900,GPay
12-04-2026,Srinithi,900,Cash
12-04-2026,Yamini,800,GPay
13-04-2026,Praneetha Artist,3500,GPay
17-04-2026,Sanjana,350,GPay
18-04-2026,Anu Artist,300,GPay
19-04-2026,Anu Artist,350,GPay
21-04-2026,Praneetha Artist,1000,GPay
24-04-2026,Shalini,700,Cash
29-04-2026,Anu Artist,600,Cash
01-05-2026,Praneetha Artist,6100,GPay
05-05-2026,Varthi,1000,Cash
06-05-2026,Jeysu Artist,1600,Cash
08-05-2026,Oviya,300,Cash
12-05-2026,Priyadarshini,300,Cash
12-05-2026,Yamini,800,Cash
16-05-2026,Maheswari,500,Cash
16-05-2026,Sowmiya,1400,Cash
16-05-2026,Praneetha Artist,950,GPay
17-05-2026,Dhivya,700,GPay
17-05-2026,Yalini,1200,Cash
20-05-2026,Yamini,200,GPay
20-05-2026,Malarvizhi,1600,GPay
22-05-2026,Suganya,800,GPay
23-05-2026,Senthamil,1050,GPay
24-05-2026,Dhivya,350,Cash
24-05-2026,Saritha,2100,GPay
25-05-2026,Kaimalar,2500,Cash
25-05-2026,Sujitha,500,Cash
25-05-2026,Nandhika,3000,GPay
25-05-2026,Dhivya,700,GPay
25-05-2026,Anu Artist,1400,Cash
26-05-2026,Suganya,900,GPay
27-05-2026,Vijayalakshmi,350,Cash
27-05-2026,Narmatha,350,GPay
27-05-2026,Mithra,3600,GPay
27-05-2026,Sangeetha,300,Cash
27-05-2026,Shalini,600,Cash
27-05-2026,Jeysu Artist,350,GPay
27-05-2026,Bhoomika,650,Cash
28-05-2026,Praneetha Artist,1850,GPay
28-05-2026,Kavya Artist,500,GPay
28-05-2026,Bhoomika,950,Cash
28-05-2026,Agashya Artist,700,Cash
28-05-2026,Manochitra,350,GPay
29-05-2026,Jeysu Artist,1100,Cash
29-05-2026,Kavya Artist,500,Cash
29-05-2026,Nivetha,500,Cash
30-05-2026,Mithra,5600,GPay
30-05-2026,Priya,2050,GPay
30-05-2026,Srinithi,900,Cash
31-05-2026,Selvanika,450,GPay
01-06-2026,Praneetha Artist,5750,Cash
03-06-2026,Sanjana,900,Cash
03-06-2026,Priya,1300,GPay
03-06-2026,Anu Artist,1400,Cash
04-06-2026,Anu Artist,950,GPay
05-06-2026,Ramya,250,Cash
06-06-2026,Priya,450,Cash
06-06-2026,Selvanika,450,Cash
07-06-2026,Navena Shree,350,Cash
07-06-2026,Kavya Artist,600,Cash
07-06-2026,Anu Artist,2450,GPay
08-06-2026,Madhuwarshini,200,Cash
08-06-2026,Sangeetha,1250,GPay
13-06-2026,Shalini,1500,Cash`;

          const lines = rawCsv
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          const remainingBookingCustomerIds = new Set(
            (persisted.bookings ?? []).map((b: any) => b.customerId),
          );
          const customers = persisted.customers ?? [];
          persisted.customers = customers.filter((c: any) => {
            if (c.kind === "client") {
              return remainingBookingCustomerIds.has(c.id);
            }
            return true; // Keep all artists
          });

          const manualPayments = [...persisted.payments];
          const monthCounters = new Map<string, number>();

          // Recalculate month counters based on remaining bookings
          for (const b of persisted.bookings ?? []) {
            if (b.billNumber) {
              const parts = b.billNumber.split("-");
              if (parts.length === 3) {
                const ym = parts[1];
                const num = Number(parts[2]) || 0;
                if (num > (monthCounters.get(ym) ?? 0)) {
                  monthCounters.set(ym, num);
                }
              }
            }
          }

          const finalCustomers = persisted.customers ?? [];
          const finalBookings = persisted.bookings ?? [];
          const finalPayments = persisted.payments ?? [];

          for (const line of lines) {
            const parts = line.split(",");
            if (parts.length < 3) continue;
            const dateStr = parts[0].trim();
            const name = parts[1].trim();
            const amountStr = parts[2].trim();
            const modeRaw = parts[3] ? parts[3].trim() : "";

            const amount = Number(amountStr) || 0;
            if (amount <= 0) continue;

            const dateParts = dateStr.split("-");
            if (dateParts.length !== 3) continue;
            const isoDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            const timestamp = new Date(isoDate + "T12:00:00").toISOString();

            let mode = "other";
            if (modeRaw.toLowerCase() === "gpay") mode = "gpay";
            else if (modeRaw.toLowerCase() === "cash") mode = "cash";

            // Avoid duplicates
            const isDuplicate = manualPayments.some(
              (p: any) =>
                p.amount === amount &&
                p.date === isoDate &&
                p.mode === mode &&
                finalCustomers.find((c: any) => c.id === p.customerId)?.name.toLowerCase() ===
                  name.toLowerCase(),
            );
            if (isDuplicate) continue;

            let c = finalCustomers.find((x: any) => x.name.toLowerCase() === name.toLowerCase());
            if (!c) {
              const isArtist = name.toLowerCase().includes("artist");
              c = {
                id: uid(),
                kind: isArtist ? "artist" : "client",
                name,
                phone: "",
                createdAt: timestamp,
                updatedAt: timestamp,
              };
              finalCustomers.push(c);
            }

            let service = "prepleat";
            if (name.toLowerCase().includes("drape")) {
              service = "drape";
            }

            const ym = `${dateParts[2]}${dateParts[1]}`;
            const prefix = `EYAS-${ym}-`;
            const n = (monthCounters.get(ym) ?? 0) + 1;
            monthCounters.set(ym, n);
            const billNumber = `${prefix}${String(n).padStart(4, "0")}`;

            const bId = uid();
            const booking = {
              id: bId,
              billNumber,
              customerId: c.id,
              artistId: c.kind === "artist" ? c.id : undefined,
              service,
              sareeCount: 1,
              pricePerSaree: amount,
              totalAmount: amount,
              advancePaid: amount,
              deliveryDate: isoDate,
              deliveryTime: "09:00",
              createdAt: timestamp,
              updatedAt: timestamp,
              completedAt: timestamp,
              receivedAt: timestamp,
              workDoneAt: timestamp,
              deliveredAt: timestamp,
              status: "delivered",
            };
            finalBookings.push(booking);

            const pId = uid();
            const payment = {
              id: pId,
              bookingId: bId,
              customerId: c.id,
              amount,
              date: isoDate,
              mode,
              note: "Imported Earning",
              updatedAt: timestamp,
            };
            finalPayments.push(payment);
          }

          persisted.customers = finalCustomers;
          persisted.bookings = finalBookings;
          persisted.payments = finalPayments;
        }

        return persisted;
      },
    },
  ),
);

export const fmtINR = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export const formatAppDate = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return "";
  try {
    const settings = useStore.getState().settings;
    const dateFormat = settings.dateFormat || "DD-MM-YYYY";
    const d = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
    let fmt = dateFormat;
    if (fmt === "DD-MM-YYYY") fmt = "dd-MM-yyyy";
    if (fmt === "YYYY-MM-DD") fmt = "yyyy-MM-dd";
    if (fmt === "MM/DD/YYYY") fmt = "MM/dd/yyyy";
    return dfFormat(d, fmt);
  } catch {
    return String(dateInput);
  }
};

export const formatAppTime = (timeStr: string | undefined | null): string => {
  if (!timeStr) return "";
  try {
    const settings = useStore.getState().settings;
    const timeFormatSetting = settings.timeFormat || "12";
    
    let tempDate = new Date();
    const match12 = timeStr.match(/(\d+):(\d+)\s*(AM|PM|am|pm)/i);
    const match24 = timeStr.match(/^(\d+):(\d+)$/);
    if (match12) {
      let hrs = parseInt(match12[1]);
      const mins = parseInt(match12[2]);
      const pm = match12[3].toUpperCase() === "PM";
      if (pm && hrs < 12) hrs += 12;
      if (!pm && hrs === 12) hrs = 0;
      tempDate.setHours(hrs, mins, 0, 0);
    } else if (match24) {
      const hrs = parseInt(match24[1]);
      const mins = parseInt(match24[2]);
      tempDate.setHours(hrs, mins, 0, 0);
    } else {
      return timeStr;
    }

    if (timeFormatSetting === "12") {
      const h = tempDate.getHours();
      const m = tempDate.getMinutes();
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = ((h + 11) % 12) + 1;
      return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    } else {
      const h = tempDate.getHours();
      const m = tempDate.getMinutes();
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  } catch {
    return timeStr;
  }
};

export const formatAppDateTime = (isoString: string | undefined | null): string => {
  if (!isoString) return "";
  try {
    const datePart = formatAppDate(isoString);
    const d = parseISO(isoString);
    const settings = useStore.getState().settings;
    const timeFormatSetting = settings.timeFormat || "12";
    const timePart = dfFormat(d, timeFormatSetting === "12" ? "hh:mm a" : "HH:mm");
    return `${datePart} · ${timePart}`;
  } catch {
    return String(isoString);
  }
};

export const fmtTime12 = (hhmm: string) => formatAppTime(hhmm);

export const totalDue = (b: Booking) => Math.max(0, b.totalAmount - b.advancePaid);

export const customerBookings = (cid: string, bookings: Booking[]) =>
  bookings
    .filter((b) => b.customerId === cid)
    .sort((a, b) => (a.deliveryDate < b.deliveryDate ? 1 : -1));

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
