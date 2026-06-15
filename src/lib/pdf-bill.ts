import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import type { Booking, Customer, Settings, Payment } from "./store";
import { fmtTime12, totalDue } from "./store";
import logoAsset from "@/assets/eyas-logo.png";

// Helvetica (jsPDF default) lacks the ₹ glyph — it renders as ? or a box.
const rs = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-IN");

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

const THEME_COLORS: Record<string, { primary: string; accent: string }> = {
  royal: { primary: "#5b3fc8", accent: "#cfc5f0" },
  maroon: { primary: "#7a1f2a", accent: "#e8c878" },
  midnight: { primary: "#c5483f", accent: "#5a3a35" },
  emerald: { primary: "#1f6b4a", accent: "#bfe3cc" },
  rose: { primary: "#c9457e", accent: "#f4c4d6" },
  sand: { primary: "#8a5a2a", accent: "#dcc299" },
  charcoal: { primary: "#d4a24e", accent: "#3a342a" },
  gold: { primary: "#c89a3a", accent: "#f0d77a" },
  sunset: { primary: "#c85a3a", accent: "#f4cca8" },
  ocean: { primary: "#2c78a0", accent: "#a8daf4" },
};

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
  } catch {
    return null;
  }
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
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.clearRect(0, 0, size, size);
    // Cover-fit the logo centered
    const ratio = Math.min(size / img.width, size / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    return canvas.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
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

  let primaryHex = "#7a1f2a"; // Default maroon
  let accentHex = "#e8c878"; // Default gold

  const tName = settings.theme || "royal";
  if (tName === "custom" && settings.customPrimary) {
    primaryHex = settings.customPrimary;
    accentHex = "#e8c878";
  } else if (THEME_COLORS[tName]) {
    primaryHex = THEME_COLORS[tName].primary;
    accentHex = THEME_COLORS[tName].accent;
  }

  const accent: [number, number, number] = hexToRgb(primaryHex);
  const gold: [number, number, number] = hexToRgb(accentHex);
  const muted: [number, number, number] = [120, 120, 120];
  const ink: [number, number, number] = [40, 40, 40];

  // ===== Header band =====
  const headerH = 92;
  doc.setFillColor(...accent);
  doc.rect(0, 0, W, headerH, "F");

  // Logo: draw the transparent PNG directly.
  if (logoData) {
    try {
      const flat = await flattenLogoOnCream(logoData);
      const cx = 38;
      const cy = 46;
      const r = 22;
      doc.addImage(flat, "PNG", cx - r, cy - r, r * 2, r * 2, undefined, "FAST");
    } catch {
      /* ignore bad logo */
    }
  }

  doc.setTextColor(255, 248, 230);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15.5);
  doc.text(settings.businessName || "Eyas Saree Drapist", 72, 28);
  
  // Tagline / slogan
  const slogan = settings.businessSlogan || "Drape with grace · Pleat with love";
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...gold);
  doc.text(slogan, 72, 40);

  // Business Phone & Address
  let currentY = 52;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(245, 240, 255); // soft cream/off-white

  if (settings.businessPhone) {
    doc.text(`Ph: ${settings.businessPhone}`, 72, currentY);
    currentY += 11;
  }
  if (settings.businessAddress) {
    const addrLines = doc.splitTextToSize(settings.businessAddress, W / 2 - 15);
    doc.text(addrLines, 72, currentY);
  }

  doc.setTextColor(255, 248, 230);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Bill # ${booking.billNumber || booking.id.slice(0, 8).toUpperCase()}`, W - 18, 36, {
    align: "right",
  });
  doc.text(format(new Date(), "MMM d, yyyy"), W - 18, 48, { align: "right" });
  doc.text(`Booked ${format(parseISO(booking.createdAt), "MMM d, yyyy")}`, W - 18, 60, {
    align: "right",
  });

  let y = 115;

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
  doc.text(format(parseISO(booking.deliveryDate), "EEE, MMM d, yyyy"), W - 20, y + 15, {
    align: "right",
  });
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

  // Rectangular rubber-stamp on the left — double border + business name + status + date.
  const stamp = due === 0 ? "PAID" : "DUE";
  const subStamp = due === 0 ? "IN FULL" : "BALANCE";
  const stampColor: [number, number, number] = due === 0 ? [38, 130, 70] : [190, 50, 50];

  const w = 70;
  const h = 34;
  const sx = 60;
  const sy = cy - rowH * 2;
  const rx = sx - w / 2;
  const ry = sy - h / 2;

  doc.setDrawColor(...stampColor);
  doc.setTextColor(...stampColor);

  // Outer rectangle
  doc.setLineWidth(1.6);
  doc.rect(rx, ry, w, h, "D");

  // Inner rectangle
  doc.setLineWidth(0.6);
  doc.rect(rx + 2, ry + 2, w - 4, h - 4, "D");

  // Business Name (Top line)
  const rawBizName = settings.businessName || "Eyas Saree Drapist";
  const bizName = rawBizName.length > 20 ? rawBizName.slice(0, 18) + ".." : rawBizName;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.text(bizName.toUpperCase(), sx, ry + 8, { align: "center" });

  // Status (Middle line, large and bold)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(stamp, sx, ry + 20, { align: "center" });

  // Sub-status and Date (Bottom line)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  const dateStr = format(new Date(), "dd MMM yyyy").toUpperCase();
  doc.text(`${subStamp} · ${dateStr}`, sx, ry + 29, { align: "center" });

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
  doc.text(`Generated ${format(new Date(), "MMM d, yyyy · h:mm a")}`, W - 20, H - 30, {
    align: "right",
  });


  const fname = `bill-${booking.billNumber || booking.id.slice(0, 6)}-${(customer?.name || "customer").replace(/\s+/g, "_")}.pdf`;
  doc.save(fname);
}
