import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import type { Booking, Customer, Settings, Payment } from "./store";
import { fmtINR, fmtTime12, totalDue } from "./store";

export function generateBillPDF(opts: {
  booking: Booking;
  customer?: Customer;
  artist?: Customer;
  payments: Payment[];
  settings: Settings;
}) {
  const { booking, customer, artist, payments, settings } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const W = doc.internal.pageSize.getWidth();

  const accent: [number, number, number] = [122, 31, 42]; // maroon
  const gold: [number, number, number] = [200, 156, 76];
  const muted: [number, number, number] = [120, 120, 120];

  // Header band
  doc.setFillColor(...accent);
  doc.rect(0, 0, W, 70, "F");

  // Logo
  if (settings.logoDataUrl && settings.logoDataUrl.startsWith("data:image")) {
    try {
      doc.addImage(settings.logoDataUrl, "PNG", 18, 14, 42, 42, undefined, "FAST");
    } catch { /* ignore bad logo */ }
  }

  doc.setTextColor(255, 248, 230);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(settings.businessName || "Eyas Saree Drapist", 70, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(settings.websiteUrl || "https://eyasdrapist.shop/", 70, 48);

  // Bill meta (right side)
  doc.setFontSize(8);
  doc.text(`Bill # ${booking.billNumber || booking.id.slice(0, 8).toUpperCase()}`, W - 18, 30, { align: "right" });
  doc.text(format(new Date(), "MMM d, yyyy"), W - 18, 42, { align: "right" });

  let y = 92;

  // Customer block
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Billed to", 20, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(customer?.name || "Customer", 20, y + 14);
  doc.setTextColor(...muted);
  doc.setFontSize(9);
  doc.text(customer?.phone || "", 20, y + 27);
  if (customer?.address) {
    const lines = doc.splitTextToSize(customer.address, W / 2 - 30);
    doc.text(lines, 20, y + 39);
  }

  // Delivery block (right)
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Delivery", W - 20, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(format(parseISO(booking.deliveryDate), "EEE, MMM d, yyyy"), W - 20, y + 14, { align: "right" });
  doc.setTextColor(...muted);
  doc.setFontSize(9);
  doc.text(fmtTime12(booking.deliveryTime), W - 20, y + 27, { align: "right" });
  if (artist) doc.text(`Artist: ${artist.name}`, W - 20, y + 39, { align: "right" });

  y += 60;

  // Items table
  autoTable(doc, {
    startY: y,
    head: [["Service", "Qty", "Rate", "Amount"]],
    body: [
      [
        booking.service === "prepleat" ? "PrePleat Saree" : "Saree Drape",
        String(booking.sareeCount),
        fmtINR(booking.pricePerSaree),
        fmtINR(booking.totalAmount),
      ],
    ],
    theme: "plain",
    margin: { left: 20, right: 20 },
    styles: { fontSize: 10, cellPadding: 8 },
    headStyles: { fillColor: accent, textColor: [255, 248, 230], fontStyle: "bold" },
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right", fontStyle: "bold" },
    },
  });

  let cy = (doc as any).lastAutoTable.finalY + 14;

  // Totals box
  const labelX = W - 140;
  const valueX = W - 20;
  const rowH = 16;
  const due = totalDue(booking);

  const totals: Array<[string, string, boolean?]> = [
    ["Subtotal", fmtINR(booking.totalAmount)],
    ["Advance paid", fmtINR(booking.advancePaid)],
    ["Balance due", fmtINR(due), true],
  ];
  doc.setFontSize(10);
  for (const [label, value, bold] of totals) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const c: [number, number, number] = bold ? accent : [60, 60, 60];
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(label, labelX, cy);
    doc.text(value, valueX, cy, { align: "right" });
    cy += rowH;
  }

  // Status stamp
  cy += 10;
  const stamp = due === 0 ? "PAID" : "BALANCE DUE";
  const stampColor: [number, number, number] = due === 0 ? [40, 140, 80] : [200, 60, 60];
  doc.setDrawColor(...stampColor);
  doc.setTextColor(...stampColor);
  doc.setLineWidth(1.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const stampW = doc.getTextWidth(stamp) + 16;
  doc.roundedRect(20, cy - 12, stampW, 22, 4, 4);
  doc.text(stamp, 28, cy + 3);

  // Payments list (compact)
  if (payments.length > 0) {
    cy += 30;
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Payments", 20, cy);
    cy += 4;
    autoTable(doc, {
      startY: cy,
      head: [["Date", "Mode", "Note", "Amount"]],
      body: payments.map((p) => [
        format(parseISO(p.date), "MMM d"),
        (p.mode ?? "gpay").toUpperCase(),
        p.note ?? "",
        fmtINR(p.amount),
      ]),
      theme: "striped",
      margin: { left: 20, right: 20 },
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [240, 232, 218], textColor: accent },
      columnStyles: { 3: { halign: "right" } },
    });
    cy = (doc as any).lastAutoTable.finalY;
  }

  // Notes
  if (booking.notes) {
    cy += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text("Notes", 20, cy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(booking.notes, W - 40);
    doc.text(lines, 20, cy + 12);
  }

  // Footer
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(230, 220, 200);
  doc.line(20, H - 50, W - 20, H - 50);
  doc.setTextColor(...gold);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Thank you for choosing us \u2728", W / 2, H - 32, { align: "center" });
  doc.setTextColor(...muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(settings.websiteUrl || "https://eyasdrapist.shop/", W / 2, H - 20, { align: "center" });
  doc.setFontSize(6.5);
  doc.text("Developed by ManiRaja", W / 2, H - 10, { align: "center" });

  const fname = `bill-${booking.billNumber || booking.id.slice(0, 6)}-${(customer?.name || "customer").replace(/\s+/g, "_")}.pdf`;
  doc.save(fname);
}
