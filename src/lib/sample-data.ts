import { format, subDays, addDays } from "date-fns";
import type { Booking, Customer, Payment } from "@/lib/store";

export function generateSampleData(): {
  customers: Customer[];
  bookings: Booking[];
  payments: Payment[];
} {
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const tomorrowStr = format(addDays(now, 1), "yyyy-MM-dd");
  const nextWeekStr = format(addDays(now, 5), "yyyy-MM-dd");
  const pastStr = format(subDays(now, 4), "yyyy-MM-dd");

  const customers: Customer[] = [
    {
      id: "demo-cust-1",
      kind: "client",
      name: "Priya Sundaram",
      phone: "9876543210",
      address: "12/4, Gandhi Road, T. Nagar, Chennai",
      reference: "Instagram",
      notes: "Silk saree with heavy zari border, box fold requested",
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-cust-2",
      kind: "client",
      name: "Kavitha Ranganathan",
      phone: "9840123456",
      address: "5, Anna Nagar West, Chennai",
      reference: "Bridal Reference",
      notes: "Bridal muhurtham drape with pin support",
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-cust-3",
      kind: "artist",
      name: "Deepa Makeup Artistry",
      phone: "9444098765",
      address: "Mylapore, Chennai",
      reference: "Makeup Artist Partner",
      notes: "Regular bridal orders — 10% partner discount",
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-cust-4",
      kind: "client",
      name: "Ananya Krishnan",
      phone: "9790112233",
      address: "Velachery Main Road, Chennai",
      reference: "Friend Referral",
      notes: "2 Sarees (1 Kanchipuram + 1 Georgette)",
      createdAt: new Date().toISOString(),
    },
  ];

  const bookings: Booking[] = [
    {
      id: "demo-book-1",
      billNumber: "EYAS-101",
      customerId: "demo-cust-1",
      service: "prepleat",
      sareeCount: 2,
      pricePerSaree: 350,
      totalAmount: 700,
      advancePaid: 300,
      deliveryDate: tomorrowStr,
      deliveryTime: "17:00",
      notes: "Heavy Kanchipuram silk pleating with box packing",
      status: "pending",
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-book-2",
      billNumber: "EYAS-102",
      customerId: "demo-cust-2",
      service: "drape",
      sareeCount: 1,
      pricePerSaree: 1200,
      totalAmount: 1200,
      advancePaid: 1200,
      deliveryDate: todayStr,
      deliveryTime: "11:30",
      notes: "Direct on-site bridal draping for wedding reception",
      status: "completed",
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-book-3",
      billNumber: "EYAS-103",
      customerId: "demo-cust-3",
      service: "prepleat",
      sareeCount: 4,
      pricePerSaree: 300,
      totalAmount: 1200,
      advancePaid: 500,
      deliveryDate: nextWeekStr,
      deliveryTime: "18:00",
      notes: "Bridal party order from Deepa Artist",
      status: "pending",
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-book-4",
      billNumber: "EYAS-104",
      customerId: "demo-cust-4",
      service: "prepleat",
      sareeCount: 3,
      pricePerSaree: 350,
      totalAmount: 1050,
      advancePaid: 1050,
      deliveryDate: pastStr,
      deliveryTime: "16:00",
      notes: "Delivered & verified",
      status: "delivered",
      deliveredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];

  const payments: Payment[] = [
    {
      id: "demo-pay-1",
      bookingId: "demo-book-1",
      customerId: "demo-cust-1",
      amount: 300,
      date: todayStr,
      mode: "gpay",
      note: "Advance payment via GPay",
    },
    {
      id: "demo-pay-2",
      bookingId: "demo-book-2",
      customerId: "demo-cust-2",
      amount: 1200,
      date: todayStr,
      mode: "gpay",
      note: "Full settlement paid online",
    },
    {
      id: "demo-pay-3",
      bookingId: "demo-book-3",
      customerId: "demo-cust-3",
      amount: 500,
      date: todayStr,
      mode: "cash",
      note: "Cash advance handed at shop",
    },
    {
      id: "demo-pay-4",
      bookingId: "demo-book-4",
      customerId: "demo-cust-4",
      amount: 1050,
      date: pastStr,
      mode: "gpay",
      note: "Full payment received on delivery",
    },
  ];

  return { customers, bookings, payments };
}
