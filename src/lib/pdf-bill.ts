import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import type { Booking, Customer, Settings, Payment } from "./store";
import { fmtTime12, totalDue } from "./store";
import logoAsset from "@/assets/eyas-logo.png";

// Helvetica (jsPDF default) lacks the ₹ glyph — it renders as ? or a box.
// Use the universally-supported "Rs." prefix inside the PDF only.
const rs = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-IN");

// Best-effort fetch + base64 conversion for the brand logo. Returns null on
// failure (CORS, offline, etc.) so the caller can still render without it.
async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

// Flatten any transparent / off-white pixels onto a warm cream background so
// the PDF logo never shows a black square when alpha is missing. Returns the
// re-encoded JPEG data URL on success, or the original on failure.
async function flattenLogoOnCream(dataUrl: string): Promise<string> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = dataUrl;
    });
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.clearRect(0, 0, size, size);
    // Cover-fit the logo centered
    const ratio = Math.min(size / img.width, size / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    return canvas.toDataURL("image/png");
  } catch { return dataUrl; }
}

export async function generateBillPDF(opts: {
  booking: Booking;
  customer?: Customer;
  artist?: Customer;
  payments: Payment[];
  settings: Settings;
}) {
  const { booking, customer, artist, payments, settings } = opts;
  // Resolve a usable logo — prefer the user-uploaded one in settings, else
  // fall back to the bundled brand asset (fetched async into a data-URL).
  let logoData: string | undefined =
    settings.logoDataUrl && settings.logoDataUrl.startsWith("data:image")
      ? settings.logoDataUrl
      : undefined;
  if (!logoData && logoAsset) {
    const fetched = await fetchAsDataUrl(logoAsset);
    if (fetched) logoData = fetched;
  }

  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const accent: [number, number, number] = [122, 31, 42];
  const gold: [number, number, number] = [200, 156, 76];
  const muted: [number, number, number] = [120, 120, 120];
  const ink: [number, number, number] = [40, 40, 40];

  // ===== Header band =====
  doc.setFillColor(...accent);
  doc.rect(0, 0, W, 78, "F");

  // Round logo: draw a white circle then clipped square image on top.
  if (logoData) {
    try {
      const flat = await flattenLogoOnCream(logoData);
      const cx = 38;
      const cy = 39;
      const r = 22;
      doc.setFillColor(255, 248, 230);
      doc.circle(cx, cy, r + 2, "F");
      doc.addImage(flat, "PNG", cx - r, cy - r, r * 2, r * 2, undefined, "FAST");
    } catch { /* ignore bad logo */ }
  }

  doc.setTextColor(255, 248, 230);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(settings.businessName || "Eyas Saree Drapist", 72, 36);
  // Tagline / slogan (sits under the business name) — drawn from the brand site.
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(245, 215, 180);
  doc.text("Drape with grace · Pleat with love", 72, 50);

  doc.setTextColor(255, 248, 230);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Bill # ${booking.billNumber || booking.id.slice(0, 8).toUpperCase()}`, W - 18, 30, { align: "right" });
  doc.text(format(new Date(), "MMM d, yyyy"), W - 18, 42, { align: "right" });
  doc.text(`Booked ${format(parseISO(booking.createdAt), "MMM d, yyyy")}`, W - 18, 54, { align: "right" });

  let y = 100;

  // ===== Billed to =====
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("BILLED TO", 20, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(customer?.name || "Customer", 20, y + 15);
  doc.setTextColor(...muted);
  doc.setFontSize(9);
  doc.text(customer?.phone || "", 20, y + 28);
  if (customer?.address) {
    const lines = doc.splitTextToSize(customer.address, W / 2 - 30);
    doc.text(lines, 20, y + 40);
  }

  // ===== Delivery =====
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DELIVERY", W - 20, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(format(parseISO(booking.deliveryDate), "EEE, MMM d, yyyy"), W - 20, y + 15, { align: "right" });
  doc.setTextColor(...muted);
  doc.setFontSize(9);
  doc.text(fmtTime12(booking.deliveryTime), W - 20, y + 28, { align: "right" });
  if (artist) doc.text(`Artist: ${artist.name}`, W - 20, y + 40, { align: "right" });

  y += 70;

  // ===== Items =====
  autoTable(doc, {
    startY: y,
    head: [["Description", "Qty", "Rate", "Amount"]],
    body: [
      [
        booking.service === "prepleat" ? "PrePleat Saree Service" : "Saree Drape Service",
        String(booking.sareeCount),
        rs(booking.pricePerSaree),
        rs(booking.totalAmount),
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

  let cy = (doc as any).lastAutoTable.finalY + 12;

  // ===== Totals =====
  const due = totalDue(booking);
  const labelX = W - 150;
  const valueX = W - 20;
  const rowH = 15;

  const totals: Array<[string, string, boolean?]> = [
    ["Subtotal", rs(booking.totalAmount)],
    ["Amount paid", rs(booking.advancePaid)],
    ["Balance due", rs(due), true],
  ];
  doc.setFontSize(10);
  for (const [label, value, bold] of totals) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const c: [number, number, number] = bold ? accent : [60, 60, 60];
    doc.setTextColor(...c);
    doc.text(label, labelX, cy);
    doc.text(value, valueX, cy, { align: "right" });
    cy += rowH;
  }

  // Round rubber-stamp on the left — two concentric circles + label.
  const stamp = due === 0 ? "PAID" : "DUE";
  const subStamp = due === 0 ? "IN FULL" : "BALANCE";
  const stampColor: [number, number, number] = due === 0 ? [38, 130, 70] : [190, 50, 50];
  const sx = 60;
  const sy = cy - rowH * 2;
  doc.setDrawColor(...stampColor);
  doc.setTextColor(...stampColor);
  doc.setLineWidth(1.8);
  doc.circle(sx, sy, 28);
  doc.setLineWidth(0.6);
  doc.circle(sx, sy, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(stamp, sx, sy + 2, { align: "center" });
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text(subStamp, sx, sy + 11, { align: "center" });
  doc.setFontSize(5.5);
  doc.text(format(new Date(), "dd MMM yyyy").toUpperCase(), sx, sy - 11, { align: "center" });

  cy += 8;

  // ===== Payment history =====
  if (payments.length > 0) {
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("PAYMENT HISTORY", 20, cy);
    cy += 4;
    autoTable(doc, {
      startY: cy,
      head: [["Date", "Mode", "Note", "Amount"]],
      body: payments
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((p) => [
          format(parseISO(p.date), "MMM d, h:mm a"),
          (p.mode ?? "gpay").toUpperCase(),
          p.note ?? "—",
          rs(p.amount),
        ]),
      theme: "striped",
      margin: { left: 20, right: 20 },
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [240, 232, 218], textColor: accent },
      columnStyles: { 3: { halign: "right", fontStyle: "bold" } },
    });
    cy = (doc as any).lastAutoTable.finalY;
  }

  // ===== Notes (Omitted from PDF as requested) =====

  // ===== Footer =====
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.6);
  doc.line(20, H - 56, W - 20, H - 56);

  // Left column
  doc.setTextColor(...accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(settings.businessName || "Eyas Saree Drapist", 20, H - 42);
  doc.setTextColor(...muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(settings.websiteUrl || "https://eyasdrapist.shop/", 20, H - 30);

  // Right column
  doc.setTextColor(...gold);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Thank you for choosing us", W - 20, H - 42, { align: "right" });
  doc.setTextColor(...muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Generated ${format(new Date(), "MMM d, yyyy · h:mm a")}`, W - 20, H - 30, { align: "right" });

  doc.setFontSize(6.5);
  doc.setTextColor(180, 180, 180);
  doc.text("Bill software by ManiRaja", W / 2, H - 14, { align: "center" });

  const fname = `bill-${booking.billNumber || booking.id.slice(0, 6)}-${(customer?.name || "customer").replace(/\s+/g, "_")}.pdf`;
  doc.save(fname);
}
