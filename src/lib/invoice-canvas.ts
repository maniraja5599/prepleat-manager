import jsPDF from "jspdf";
import type { Booking, Customer, Settings, Payment } from "./store";
import { fmtINR, fmtTime12, totalDue, netBookingAmount, formatShortBillNumber, formatAppDate } from "./store";

export interface InvoiceDrawOptions {
  booking: Booking;
  customer?: Customer;
  artist?: Customer;
  payments: Payment[];
  settings: Settings;
}

export function drawInvoiceCanvas(opts: InvoiceDrawOptions): HTMLCanvasElement {
  const { booking, customer, artist, settings } = opts;
  const billNo = formatShortBillNumber(booking.billNumber, booking.id);
  const customerName = customer?.name || "Customer";
  const due = totalDue(booking);
  const netTotal = netBookingAmount(booking);
  const totalPaid = booking.advancePaid || 0;

  const canvas = document.createElement("canvas");
  const W = 800;
  const H = 1080;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Outer border
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // 1. Header Banner Gradient
  const grad = ctx.createLinearGradient(0, 0, W, 170);
  grad.addColorStop(0, "#6b1724");
  grad.addColorStop(0.5, "#881337");
  grad.addColorStop(1, "#4c0519");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 170);

  // Company Name
  ctx.fillStyle = "#fef3c7";
  ctx.font = "bold 28px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText(settings.businessName || "EYAS SAREE DRAPIST", 36, 48);

  // Tagline
  ctx.fillStyle = "#fde68a";
  ctx.font = "italic 15px Georgia, serif";
  ctx.fillText(settings.businessSlogan || "Flawless Drape & Saree Box Folding", 36, 74);

  // Contact Phone & Address
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.font = "14px 'Segoe UI', Tahoma, sans-serif";
  if (settings.businessPhone) {
    ctx.fillText(`📞 ${settings.businessPhone}`, 36, 102);
  }
  if (settings.businessAddress) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "13px 'Segoe UI', Tahoma, sans-serif";
    ctx.fillText(`📍 ${settings.businessAddress}`, 36, 126);
  }

  // Right Header: Bill Badge Pill
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.beginPath();
  ctx.roundRect(W - 170, 24, 134, 38, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(billNo, W - 103, 49);

  ctx.fillStyle = "#fef3c7";
  ctx.font = "13px 'Courier New', monospace";
  ctx.fillText(formatAppDate(booking.createdAt), W - 103, 86);

  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.font = "bold 11px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText("TAX INVOICE", W - 103, 108);

  // 2. Client & Delivery Info Section
  const infoY = 186;
  const infoH = 100;
  ctx.fillStyle = "#fefce8";
  ctx.fillRect(16, infoY, W - 32, infoH);
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 1;
  ctx.strokeRect(16, infoY, W - 32, infoH);

  // Billed To (Left)
  ctx.textAlign = "left";
  ctx.fillStyle = "#854d0e";
  ctx.font = "bold 12px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText("BILLED TO", 36, infoY + 24);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 17px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText(customerName, 36, infoY + 48);

  ctx.fillStyle = "#475569";
  ctx.font = "14px 'Segoe UI', Tahoma, sans-serif";
  if (customer?.phone) {
    ctx.fillText(customer.phone, 36, infoY + 70);
  }
  if (customer?.address) {
    ctx.fillStyle = "#64748b";
    ctx.font = "12px 'Segoe UI', Tahoma, sans-serif";
    ctx.fillText(customer.address, 36, infoY + 88);
  }

  // Delivery Schedule (Right)
  ctx.textAlign = "right";
  ctx.fillStyle = "#854d0e";
  ctx.font = "bold 12px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText("DELIVERY SCHEDULE", W - 36, infoY + 24);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 16px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText(formatAppDate(booking.deliveryDate), W - 36, infoY + 48);

  ctx.fillStyle = "#475569";
  ctx.font = "13px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText(fmtTime12(booking.deliveryTime), W - 36, infoY + 70);

  if (artist) {
    ctx.fillStyle = "#7a1f2a";
    ctx.font = "bold 12px 'Segoe UI', Tahoma, sans-serif";
    ctx.fillText(`Artist: ${artist.name}`, W - 36, infoY + 88);
  }

  // 3. Line Items Table
  let tableY = 320;
  // Header row
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(16, tableY, W - 32, 34);
  ctx.strokeStyle = "#e2e8f0";
  ctx.strokeRect(16, tableY, W - 32, 34);

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 12px 'Segoe UI', Tahoma, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("DESCRIPTION", 36, tableY + 22);
  ctx.textAlign = "center";
  ctx.fillText("QTY", W - 240, tableY + 22);
  ctx.textAlign = "right";
  ctx.fillText("RATE", W - 140, tableY + 22);
  ctx.fillText("AMOUNT", W - 36, tableY + 22);

  tableY += 34;

  // Row 1: Primary Service
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(16, tableY, W - 32, 54);
  ctx.strokeStyle = "#f1f5f9";
  ctx.strokeRect(16, tableY, W - 32, 54);

  ctx.textAlign = "left";
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 15px 'Segoe UI', Tahoma, sans-serif";
  const serviceTitle = booking.service === "prepleat" ? "PrePleat Saree Service" : "Saree Drape Service";
  ctx.fillText(serviceTitle, 36, tableY + 24);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText("Professional pleating & box folding", 36, tableY + 44);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 14px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(String(booking.sareeCount), W - 240, tableY + 32);

  ctx.textAlign = "right";
  ctx.font = "14px 'Courier New', monospace";
  ctx.fillText(fmtINR(booking.pricePerSaree), W - 140, tableY + 32);

  ctx.font = "bold 15px 'Courier New', monospace";
  ctx.fillText(fmtINR(booking.totalAmount), W - 36, tableY + 32);

  tableY += 54;

  // Extra charges row
  if (booking.extraCharges && booking.extraCharges > 0) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(16, tableY, W - 32, 42);
    ctx.strokeStyle = "#f1f5f9";
    ctx.strokeRect(16, tableY, W - 32, 42);

    ctx.textAlign = "left";
    ctx.fillStyle = "#334155";
    ctx.font = "14px 'Segoe UI', Tahoma, sans-serif";
    ctx.fillText(`Extra / ${booking.extraChargesNote || "Travel"} Charge`, 36, tableY + 26);

    ctx.textAlign = "center";
    ctx.font = "13px 'Courier New', monospace";
    ctx.fillText("1", W - 240, tableY + 26);

    ctx.textAlign = "right";
    ctx.fillText(fmtINR(booking.extraCharges), W - 140, tableY + 26);
    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.fillText(fmtINR(booking.extraCharges), W - 36, tableY + 26);

    tableY += 42;
  }

  // Discount row
  if (booking.discount && booking.discount > 0) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(16, tableY, W - 32, 42);
    ctx.strokeStyle = "#f1f5f9";
    ctx.strokeRect(16, tableY, W - 32, 42);

    ctx.textAlign = "left";
    ctx.fillStyle = "#047857";
    ctx.font = "bold 14px 'Segoe UI', Tahoma, sans-serif";
    ctx.fillText("Special Discount / Offer", 36, tableY + 26);

    ctx.textAlign = "center";
    ctx.font = "13px 'Courier New', monospace";
    ctx.fillText("1", W - 240, tableY + 26);

    ctx.textAlign = "right";
    ctx.fillText(`-${fmtINR(booking.discount)}`, W - 140, tableY + 26);
    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.fillText(`-${fmtINR(booking.discount)}`, W - 36, tableY + 26);

    tableY += 42;
  }

  // 4. Financial Summary & Rubber Stamp Seal
  const sumY = tableY + 30;

  // Stamp Section (Left)
  ctx.save();
  ctx.translate(140, sumY + 45);
  ctx.rotate((-4 * Math.PI) / 180);

  const stampW = 210;
  const stampH = 88;
  const stampX = -stampW / 2;
  const stampY = -stampH / 2;

  const isPaid = due === 0;
  const isPartial = !isPaid && totalPaid > 0;
  const stampColor = isPaid ? "#047857" : "#b91c1c";
  const stampBg = isPaid ? "rgba(4, 120, 87, 0.04)" : "rgba(185, 28, 28, 0.04)";

  // Outer solid border
  ctx.fillStyle = stampBg;
  ctx.beginPath();
  ctx.roundRect(stampX, stampY, stampW, stampH, 8);
  ctx.fill();
  ctx.strokeStyle = stampColor;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Inner dashed border
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = stampColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(stampX + 4, stampY + 4, stampW - 8, stampH - 8, 4);
  ctx.stroke();
  ctx.setLineDash([]);

  // Stamp Header
  ctx.textAlign = "center";
  ctx.fillStyle = stampColor;
  ctx.font = "bold 9px 'Courier New', monospace";
  ctx.fillText(`★ ${settings.businessName || "EYAS SAREE DRAPIST"} ★`, 0, stampY + 18);

  // Center Line Divider
  ctx.strokeStyle = isPaid ? "rgba(4, 120, 87, 0.4)" : "rgba(185, 28, 28, 0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(stampX + 10, stampY + 24);
  ctx.lineTo(stampX + stampW - 10, stampY + 24);
  ctx.moveTo(stampX + 10, stampY + 58);
  ctx.lineTo(stampX + stampW - 10, stampY + 58);
  ctx.stroke();

  // Main Stamp Text (Smart words)
  ctx.font = "bold 17px 'Courier New', monospace";
  if (isPaid) {
    ctx.fillText("PAID & VERIFIED", 0, stampY + 46);
  } else if (isPartial) {
    ctx.fillText("ADVANCE RECEIVED", 0, stampY + 46);
  } else {
    ctx.fillText("PAYMENT PENDING", 0, stampY + 46);
  }

  // Stamp Sub-label (Smart words)
  ctx.font = "bold 8.5px 'Courier New', monospace";
  if (isPaid) {
    ctx.fillText("100% RECEIVED · ALL DUES CLEARED", 0, stampY + 74);
  } else if (isPartial) {
    ctx.fillText(`BAL DUE: ${fmtINR(due)} · PAY ON DELIVERY`, 0, stampY + 74);
  } else {
    ctx.fillText(`TOTAL DUE: ${fmtINR(due)} · PAY ON DELIVERY`, 0, stampY + 74);
  }

  ctx.restore();

  // Financial Totals (Right)
  const totX = W - 36;
  ctx.textAlign = "right";

  ctx.fillStyle = "#64748b";
  ctx.font = "14px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText("Total Bill:", totX - 110, sumY + 16);
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 15px 'Courier New', monospace";
  ctx.fillText(fmtINR(netTotal), totX, sumY + 16);

  ctx.fillStyle = "#64748b";
  ctx.font = "14px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText("Paid / Advance:", totX - 110, sumY + 44);
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 15px 'Courier New', monospace";
  ctx.fillText(fmtINR(totalPaid), totX, sumY + 44);

  // Line separator
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(totX - 220, sumY + 60);
  ctx.lineTo(totX, sumY + 60);
  ctx.stroke();

  // Due Total
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 16px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText("Remaining Due:", totX - 110, sumY + 86);

  ctx.fillStyle = due > 0 ? "#b91c1c" : "#047857";
  ctx.font = "bold 19px 'Courier New', monospace";
  ctx.fillText(due > 0 ? fmtINR(due) : "Rs. 0", totX, sumY + 86);

  // 5. Invoice Footer
  const footerY = H - 54;
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, footerY, W, 54);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, footerY);
  ctx.lineTo(W, footerY);
  ctx.stroke();

  ctx.fillStyle = "#334155";
  ctx.font = "bold 13px 'Segoe UI', Tahoma, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(settings.businessName || "EYAS SAREE DRAPIST", 36, footerY + 32);

  ctx.fillStyle = "#64748b";
  ctx.font = "italic 13px Georgia, serif";
  ctx.textAlign = "right";
  ctx.fillText("Thank you for choosing Eyas! 🙏", W - 36, footerY + 32);

  return canvas;
}

export async function downloadInvoiceImagePNG(opts: InvoiceDrawOptions): Promise<void> {
  const { booking, customer } = opts;
  const billNo = formatShortBillNumber(booking.billNumber, booking.id);
  const canvas = drawInvoiceCanvas(opts);
  const dataUrl = canvas.toDataURL("image/png");

  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `Bill-${billNo}-${(customer?.name || "Customer").replace(/\s+/g, "_")}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function downloadInvoicePDFDirect(opts: InvoiceDrawOptions): Promise<void> {
  const { booking, customer } = opts;
  const billNo = formatShortBillNumber(booking.billNumber, booking.id);
  const canvas = drawInvoiceCanvas(opts);
  const imgData = canvas.toDataURL("image/png");

  const pdfWidth = 420; // A5 pt
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  const pdf = new jsPDF({
    orientation: "p",
    unit: "pt",
    format: [pdfWidth, pdfHeight],
  });

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
  pdf.save(`Bill-${billNo}-${(customer?.name || "Customer").replace(/\s+/g, "_")}.pdf`);
}
