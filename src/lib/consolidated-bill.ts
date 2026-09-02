import jsPDF from "jspdf";
import type { Booking, Customer, Settings } from "./store";
import { fmtINR, fmtTime12, totalDue, netBookingAmount, formatShortBillNumber, formatAppDate } from "./store";

export interface ConsolidatedStatementOptions {
  clientOrArtist: Customer | null;
  selectedBookings: Booking[];
  allCustomers: Customer[];
  settings: Settings;
  customTitle?: string;
}

/**
 * High-Definition 300 DPI Multi-Bill Consolidated Statement Canvas
 */
export function drawConsolidatedStatementCanvas(opts: ConsolidatedStatementOptions): HTMLCanvasElement {
  const { clientOrArtist, selectedBookings, allCustomers, settings, customTitle } = opts;
  const clientName = clientOrArtist?.name || "Client / Artist";
  const clientPhone = clientOrArtist?.phone || "";
  const clientAddress = clientOrArtist?.address || "";

  // Financial aggregates
  let totalSarees = 0;
  let grandTotal = 0;
  let totalPaid = 0;
  let totalBalanceDue = 0;

  selectedBookings.forEach((b) => {
    totalSarees += b.sareeCount || 0;
    grandTotal += netBookingAmount(b);
    totalPaid += b.advancePaid || 0;
    totalBalanceDue += totalDue(b);
  });

  const SCALE = 3.0; // 300+ DPI Retina Scale
  const BASE_W = 850;
  const rowHeight = 44;
  const tableBaseH = Math.max(260, selectedBookings.length * rowHeight + 60);
  const BASE_H = Math.max(1180, 520 + tableBaseH);
  const W = BASE_W;
  const H = BASE_H;

  const canvas = document.createElement("canvas");
  canvas.width = BASE_W * SCALE;
  canvas.height = BASE_H * SCALE;
  canvas.style.width = `${BASE_W}px`;
  canvas.style.height = `${BASE_H}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.scale(SCALE, SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Outer border
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // 1. Header Banner Gradient
  const grad = ctx.createLinearGradient(0, 0, W, 175);
  grad.addColorStop(0, "#500724");
  grad.addColorStop(0.5, "#881337");
  grad.addColorStop(1, "#4c0519");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 175);

  // Company Name
  ctx.fillStyle = "#fef3c7";
  ctx.font = "bold 28px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText(settings.businessName || "SAREE PREPLEAT STUDIO", 36, 48);

  // Tagline
  ctx.fillStyle = "#fde68a";
  ctx.font = "italic 14.5px Georgia, serif";
  ctx.fillText(settings.businessSlogan || "Flawless Saree Draping & Pre-Pleat Care", 36, 74);

  // Contact Phone & Address
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.font = "bold 13px 'Segoe UI', Tahoma, sans-serif";
  if (settings.businessPhone) {
    ctx.fillText(`📞 +91 ${settings.businessPhone}`, 36, 104);
  }
  if (settings.businessAddress) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = "12px 'Segoe UI', Tahoma, sans-serif";
    ctx.fillText(`📍 ${settings.businessAddress}`, 36, 128);
  }

  // Right Header: Consolidated Badge Pill
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.beginPath();
  ctx.roundRect(W - 220, 24, 184, 42, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${selectedBookings.length} BILLS COMBINED`, W - 128, 50);

  ctx.fillStyle = "#fef3c7";
  ctx.font = "bold 12px 'Courier New', monospace";
  ctx.fillText(formatAppDate(new Date().toISOString()), W - 128, 88);

  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "bold 10.5px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText(customTitle || "CONSOLIDATED STATEMENT", W - 128, 110);

  // 2. Client / Artist Info Grid Section
  const infoY = 190;
  const infoH = 104;
  ctx.fillStyle = "#fefce8";
  ctx.fillRect(16, infoY, W - 32, infoH);
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 1;
  ctx.strokeRect(16, infoY, W - 32, infoH);

  // Billed To (Left)
  ctx.textAlign = "left";
  ctx.fillStyle = "#854d0e";
  ctx.font = "bold 11.5px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText("STATEMENT PREPARED FOR", 36, infoY + 24);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 17px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText(clientName, 36, infoY + 48);

  ctx.fillStyle = "#475569";
  ctx.font = "bold 13px 'Segoe UI', Tahoma, sans-serif";
  if (clientPhone) {
    ctx.fillText(`Mobile: +91 ${clientPhone}`, 36, infoY + 70);
  }
  if (clientAddress) {
    ctx.fillStyle = "#64748b";
    ctx.font = "12px 'Segoe UI', Tahoma, sans-serif";
    ctx.fillText(clientAddress, 36, infoY + 90);
  }

  // Summary Metrics (Right)
  ctx.textAlign = "right";
  ctx.fillStyle = "#854d0e";
  ctx.font = "bold 11.5px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText("SUMMARY BREAKDOWN", W - 36, infoY + 24);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 15px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText(`${selectedBookings.length} Orders · ${totalSarees} Sarees Total`, W - 36, infoY + 48);

  ctx.fillStyle = "#475569";
  ctx.font = "bold 13px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText(`Statement Date: ${formatAppDate(new Date().toISOString())}`, W - 36, infoY + 70);

  // 3. Multi-Bill Breakdown Table
  let tableY = 314;
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(16, tableY, W - 32, 34);
  ctx.strokeStyle = "#e2e8f0";
  ctx.strokeRect(16, tableY, W - 32, 34);

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 11.5px 'Segoe UI', Tahoma, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("BILL # & DATE/TIME", 36, tableY + 22);
  ctx.fillText("LOCATION / NOTES", 230, tableY + 22);
  ctx.textAlign = "center";
  ctx.fillText("SERVICE & QTY", W - 260, tableY + 22);
  ctx.textAlign = "right";
  ctx.fillText("TOTAL", W - 140, tableY + 22);
  ctx.fillText("BAL DUE", W - 36, tableY + 22);

  tableY += 34;

  selectedBookings.forEach((b, idx) => {
    const billNo = formatShortBillNumber(b.billNumber, b.id);
    const dateStr = formatAppDate(b.deliveryDate);
    const timeStr = b.deliveryTime ? fmtTime12(b.deliveryTime) : "";
    const bCustomer = allCustomers.find((c) => c.id === b.customerId);
    const place = bCustomer?.address || b.notes || "Studio Delivery";
    
    // Detailed Itemized Service Breakdown
    let svcBreakdown = "";
    if (b.items && b.items.length > 0) {
      svcBreakdown = b.items
        .map((it) => `${it.sareeCount || 1} ${it.serviceName || (it.service === "prepleat" ? "PrePleat" : "Drape")}`)
        .join(" + ");
    } else {
      svcBreakdown = `${b.sareeCount || 1} ${b.service === "prepleat" ? "PrePleat" : "Drape"}`;
    }

    const bNet = netBookingAmount(b);
    const bDue = totalDue(b);

    const isEven = idx % 2 === 0;
    ctx.fillStyle = isEven ? "#ffffff" : "#fbfcfe";
    ctx.fillRect(16, tableY, W - 32, rowHeight);
    ctx.strokeStyle = "#f1f5f9";
    ctx.strokeRect(16, tableY, W - 32, rowHeight);

    ctx.textAlign = "left";
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillText(billNo, 36, tableY + 19);

    ctx.fillStyle = "#64748b";
    ctx.font = "11px 'Segoe UI', Tahoma, sans-serif";
    ctx.fillText(`${dateStr}${timeStr ? ` · ${timeStr}` : ""}`, 36, tableY + 35);

    ctx.fillStyle = "#334155";
    ctx.font = "11.5px 'Segoe UI', Tahoma, sans-serif";
    const truncatedPlace = place.length > 26 ? place.slice(0, 24) + "..." : place;
    ctx.fillText(truncatedPlace, 230, tableY + 26);

    ctx.textAlign = "center";
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 11.5px 'Segoe UI', Tahoma, sans-serif";
    const truncatedSvc = svcBreakdown.length > 24 ? svcBreakdown.slice(0, 22) + ".." : svcBreakdown;
    ctx.fillText(truncatedSvc, W - 260, tableY + 26);

    ctx.textAlign = "right";
    ctx.font = "bold 13.5px 'Courier New', monospace";
    ctx.fillStyle = "#0f172a";
    ctx.fillText(fmtINR(bNet), W - 140, tableY + 26);

    ctx.fillStyle = bDue > 0 ? "#b91c1c" : "#047857";
    ctx.font = "bold 13.5px 'Courier New', monospace";
    ctx.fillText(bDue > 0 ? fmtINR(bDue) : "PAID", W - 36, tableY + 26);

    tableY += rowHeight;
  });

  // 4. Financial Summary & Rubber Stamp Seal
  const sumY = tableY + 30;

  ctx.save();
  ctx.translate(135, sumY + 46);
  ctx.rotate((-2.5 * Math.PI) / 180);

  const stampW = 185;
  const stampH = 74;
  const stampX = -stampW / 2;
  const stampY = -stampH / 2;

  const isAllPaid = totalBalanceDue === 0;
  const isPartial = !isAllPaid && totalPaid > 0;
  const stampColor = isAllPaid ? "rgba(4, 120, 87, 0.70)" : "rgba(185, 28, 28, 0.68)";
  const stampBg = isAllPaid ? "rgba(4, 120, 87, 0.03)" : "rgba(185, 28, 28, 0.03)";

  ctx.fillStyle = stampBg;
  ctx.beginPath();
  ctx.roundRect(stampX, stampY, stampW, stampH, 6);
  ctx.fill();
  ctx.strokeStyle = stampColor;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.setLineDash([3, 2.5]);
  ctx.strokeStyle = stampColor;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(stampX + 3.5, stampY + 3.5, stampW - 7, stampH - 7, 3);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = "center";
  ctx.fillStyle = stampColor;
  ctx.font = "bold 8px 'Courier New', monospace";
  ctx.fillText(`★ ${(settings.businessName || "SAREE STUDIO").toUpperCase()} ★`, 0, stampY + 15);

  ctx.strokeStyle = isAllPaid ? "rgba(4, 120, 87, 0.25)" : "rgba(185, 28, 28, 0.25)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(stampX + 8, stampY + 20);
  ctx.lineTo(stampX + stampW - 8, stampY + 20);
  ctx.moveTo(stampX + 8, stampY + 49);
  ctx.lineTo(stampX + stampW - 8, stampY + 49);
  ctx.stroke();

  ctx.font = "bold 13.5px 'Courier New', monospace";
  if (isAllPaid) {
    ctx.fillText("ALL BILLS CLEARED", 0, stampY + 38);
  } else if (isPartial) {
    ctx.fillText("PARTIAL RECEIVED", 0, stampY + 38);
  } else {
    ctx.fillText("STATEMENT PENDING", 0, stampY + 38);
  }

  ctx.font = "bold 7.5px 'Courier New', monospace";
  if (isAllPaid) {
    ctx.fillText("100% RECEIVED · ZERO OUTSTANDING", 0, stampY + 62);
  } else {
    ctx.fillText(`NET DUE: ${fmtINR(totalBalanceDue)} · CONSOLIDATED`, 0, stampY + 62);
  }

  ctx.restore();

  const totX = W - 36;
  ctx.textAlign = "right";

  ctx.fillStyle = "#64748b";
  ctx.font = "14px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText("Grand Total Amount:", totX - 120, sumY + 16);
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 15px 'Courier New', monospace";
  ctx.fillText(fmtINR(grandTotal), totX, sumY + 16);

  ctx.fillStyle = "#64748b";
  ctx.font = "14px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText("Total Advance / Paid:", totX - 120, sumY + 44);
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 15px 'Courier New', monospace";
  ctx.fillText(fmtINR(totalPaid), totX, sumY + 44);

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(totX - 240, sumY + 60);
  ctx.lineTo(totX, sumY + 60);
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 16px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText("Net Balance Due:", totX - 120, sumY + 88);

  ctx.fillStyle = totalBalanceDue > 0 ? "#b91c1c" : "#047857";
  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.fillText(totalBalanceDue > 0 ? fmtINR(totalBalanceDue) : "Rs. 0", totX, sumY + 88);

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
  ctx.fillText((settings.businessName || "SAREE PREPLEAT STUDIO").toUpperCase(), 36, footerY + 32);

  ctx.fillStyle = "#64748b";
  ctx.font = "italic 13px Georgia, serif";
  ctx.textAlign = "right";
  ctx.fillText(`Thank you for your valued partnership! 🙏`, W - 36, footerY + 32);

  return canvas;
}

export async function downloadConsolidatedPDFDirect(opts: ConsolidatedStatementOptions): Promise<void> {
  const { clientOrArtist } = opts;
  const clientName = (clientOrArtist?.name || "Client").replace(/\s+/g, "_");
  const canvas = drawConsolidatedStatementCanvas(opts);
  const imgData = canvas.toDataURL("image/png", 1.0);

  const pdfWidth = 595.28;
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  const pdf = new jsPDF({
    orientation: "p",
    unit: "pt",
    format: [pdfWidth, pdfHeight],
    compress: false,
  });

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "SLOW");
  pdf.save(`Statement-${clientName}-${formatAppDate(new Date().toISOString())}.pdf`);
}

export async function downloadConsolidatedImagePNG(opts: ConsolidatedStatementOptions): Promise<void> {
  const { clientOrArtist } = opts;
  const clientName = (clientOrArtist?.name || "Client").replace(/\s+/g, "_");
  const canvas = drawConsolidatedStatementCanvas(opts);
  const filename = `Statement-${clientName}-${formatAppDate(new Date().toISOString())}.png`;

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 1.0));
  if (!blob) throw new Error("Could not create statement image");

  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent || "") ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  // On iOS Safari / WebKit: Trigger Web Share API with File
  if (isIOS && typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Statement - ${clientName}`,
          files: [file],
        });
        return;
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.warn("iOS Share aborted or failed:", e);
    }
  }

  // Universal Blob download for all other devices
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }, 2500);
}

export async function shareConsolidatedWhatsApp(
  opts: ConsolidatedStatementOptions,
  customPhone?: string,
): Promise<{ success: boolean; message?: string }> {
  const { clientOrArtist, selectedBookings, allCustomers, settings } = opts;
  const clientName = clientOrArtist?.name || "Client / Artist";
  const targetPhone = (customPhone || clientOrArtist?.phone || "").replace(/\D/g, "").slice(-10);

  let totalSarees = 0;
  let grandTotal = 0;
  let totalPaid = 0;
  let totalBalanceDue = 0;

  const billLines: string[] = [];

  selectedBookings.forEach((b, idx) => {
    const billNo = formatShortBillNumber(b.billNumber, b.id);
    const dateStr = formatAppDate(b.deliveryDate);
    const timeStr = b.deliveryTime ? fmtTime12(b.deliveryTime) : "";
    const bCustomer = allCustomers.find((c) => c.id === b.customerId);
    const place = bCustomer?.address || b.notes || "";
    const svc = b.service === "prepleat" ? "PrePleat" : "Drape";
    const bNet = netBookingAmount(b);
    const bDue = totalDue(b);

    totalSarees += b.sareeCount || 0;
    grandTotal += bNet;
    totalPaid += b.advancePaid || 0;
    totalBalanceDue += bDue;

    billLines.push(
      `${idx + 1}. *Bill #${billNo}* (${dateStr}${timeStr ? ` ${timeStr}` : ""})\n   👗 ${b.sareeCount} Saree (${svc}) · Total: ${fmtINR(bNet)}${bDue > 0 ? ` · Due: *${fmtINR(bDue)}*` : " · (Paid)"}${place ? `\n   📍 ${place}` : ""}`
    );
  });

  const msg = [
    `🌸 *${(settings.businessName || "SAREE PREPLEAT STUDIO").toUpperCase()}* 🌸`,
    `_${settings.businessSlogan || "Flawless Saree Draping & Pre-Pleat Care"}_`,
    ``,
    `Vanakkam *${clientName}* 🙏`,
    `Here is your *Consolidated Multi-Bill Statement* for *${selectedBookings.length} orders* (${totalSarees} Sarees Total) 🧾`,
    ``,
    `📋 *ITEMIZED BILLS BREAKDOWN*:`,
    ...billLines,
    ``,
    `───────────────────────`,
    `💰 *Grand Total Amount*: ${fmtINR(grandTotal)}`,
    `💵 *Total Advance Paid*: ${fmtINR(totalPaid)}`,
    totalBalanceDue > 0
      ? `📌 *Net Balance Due*: *${fmtINR(totalBalanceDue)}*`
      : `✅ *Statement Status*: *ALL DUES CLEARED* ✓`,
    `───────────────────────`,
    ``,
    settings.businessPhone ? `📞 *Contact*: +91 ${settings.businessPhone}` : "",
    settings.businessAddress ? `📍 *Location*: ${settings.businessAddress}` : "",
    ``,
    `✨ *Thank you for your valued partnership!* 🙏`,
  ].filter(Boolean).join("\n");

  try {
    const canvas = drawConsolidatedStatementCanvas(opts);
    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 1.0));
      if (blob) {
        const file = new File([blob], `Statement-${clientName}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Statement - ${clientName}`,
            text: msg,
            files: [file],
          });
          return { success: true };
        }
      }
    }
  } catch (e) {
    console.log("Web share fallback to WhatsApp link", e);
  }

  if (targetPhone && targetPhone.length >= 10) {
    window.open(`https://wa.me/91${targetPhone}?text=${encodeURIComponent(msg)}`, "_blank");
    return { success: true };
  } else {
    return { success: false, message: "NO_PHONE" };
  }
}
