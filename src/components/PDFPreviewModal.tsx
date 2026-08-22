import React, { useRef, useState } from "react";
import {
  type Booking,
  type Customer,
  type Payment,
  type Settings,
  formatShortBillNumber,
  fmtINR,
  fmtTime12,
  totalDue,
  netBookingAmount,
  formatAppDate,
} from "@/lib/store";
import { generateBillPDF } from "@/lib/pdf-bill";
import { cleanPhoneForWhatsApp } from "@/lib/utils";
import { X, Download, MessageCircle, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface PDFPreviewModalProps {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
  customer?: Customer;
  artist?: Customer;
  payments: Payment[];
  settings: Settings;
}

export function PDFPreviewModal({
  open,
  onClose,
  booking,
  customer,
  artist,
  payments,
  settings,
}: PDFPreviewModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [savingImage, setSavingImage] = useState(false);

  if (!open || !booking) return null;

  const billNo = formatShortBillNumber(booking.billNumber, booking.id);
  const customerName = customer?.name || "Customer";
  const due = totalDue(booking);
  const netTotal = netBookingAmount(booking);
  const totalPaid = (booking.advancePaid || 0);

  const handleDownload = async () => {
    if (!booking) return;
    if (printAreaRef.current) {
      setDownloading(true);
      try {
        const canvas = await html2canvas(printAreaRef.current, {
          scale: 3,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
        const imgData = canvas.toDataURL("image/png");

        const pdfWidth = 420;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        const pdf = new jsPDF({
          orientation: pdfHeight > pdfWidth ? "p" : "l",
          unit: "pt",
          format: [pdfWidth, pdfHeight],
        });

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
        pdf.save(`Bill-${billNo}.pdf`);
        toast.success("PDF Invoice downloaded! 📄");
      } catch (err) {
        console.error("Failed to generate PDF from preview:", err);
        generateBillPDF({ booking, customer, artist, payments, settings });
        toast.success("PDF Invoice downloaded! 📄");
      } finally {
        setDownloading(false);
      }
    } else {
      generateBillPDF({ booking, customer, artist, payments, settings });
      toast.success("PDF Invoice downloaded! 📄");
    }
  };

  const handleSaveImage = async () => {
    if (!booking || !printAreaRef.current) return;
    setSavingImage(true);
    try {
      const canvas = await html2canvas(printAreaRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Invoice-${billNo}.png`;
      a.click();
      toast.success("Invoice Image saved! 📸");
    } catch (err) {
      console.error("Failed to save invoice image:", err);
      toast.error("Failed to save image");
    } finally {
      setSavingImage(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!booking) return;
    const phone = customer?.phone ? cleanPhoneForWhatsApp(customer.phone) : "";
    if (!phone) {
      return toast.error("No customer phone number available");
    }
    const msg = [
      `🥻 *EYAS SAREE DRAPIST* 🥻`,
      `*${settings.businessSlogan || "Flawless Drape & Saree Box Folding"}*`,
      ``,
      `Hi *${customerName}* 🙏`,
      `Here is your invoice for *Bill ${billNo}* 🧾`,
      ``,
      `🥻 *Service*: ${booking.service === "prepleat" ? "Pre-Pleating" : "Saree Draping"} (${booking.sareeCount} saree${booking.sareeCount > 1 ? "s" : ""})`,
      `📅 *Delivery Date*: ${formatAppDate(booking.deliveryDate)}`,
      ``,
      `💰 *Total Bill*: ${fmtINR(netTotal)}`,
      `💵 *Advance Paid*: ${fmtINR(totalPaid)}`,
      due > 0
        ? `📌 *Balance Due*: *${fmtINR(due)}*`
        : `✅ *Payment Status*: *PAID IN FULL* ✓`,
      ``,
      `✨ _Wear with confidence & elegance!_`,
      `🙏 *Eyas Saree Drapist*`,
    ].join("\n");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-[30000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-xl h-[90vh] max-h-[760px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border/50 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-border/40 flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground leading-tight truncate">
                Invoice Preview · {billNo}
              </h3>
              <p className="text-[10px] text-muted-foreground truncate">
                {customerName} {customer?.phone ? `(${customer.phone})` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Scrollable Authentic Paper Invoice Document Body */}
        <div className="flex-1 bg-muted/40 p-3 sm:p-5 overflow-y-auto flex items-start justify-center">
          <div
            ref={printAreaRef}
            className="w-full max-w-lg bg-white text-slate-900 rounded-2xl shadow-md overflow-hidden font-sans relative"
            style={{ backgroundColor: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0" }}
          >
            {/* Branded Invoice Banner Header */}
            <div
              className="p-4 sm:p-5 text-white relative"
              style={{ background: "linear-gradient(135deg, #7a1f2a 0%, #991b1b 50%, #4c0519 100%)", color: "#ffffff" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1
                    className="text-base sm:text-lg font-bold tracking-wide"
                    style={{ color: "#fef3c7", fontFamily: "Georgia, serif" }}
                  >
                    {settings.businessName || "EYAS SAREE DRAPIST"}
                  </h1>
                  <p
                    className="text-[11px] italic mt-0.5"
                    style={{ color: "#fde68a", fontFamily: "Georgia, serif" }}
                  >
                    {settings.businessSlogan || "Flawless Drape & Saree Box Folding"}
                  </p>
                  {settings.businessPhone && (
                    <p className="text-[10px] text-white/90 mt-1 font-mono">
                      📞 {settings.businessPhone}
                    </p>
                  )}
                  {settings.businessAddress && (
                    <p className="text-[9.5px] text-white/80 leading-tight max-w-xs mt-0.5">
                      📍 {settings.businessAddress}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold text-white shadow-xs"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.18)", border: "1px solid rgba(255, 255, 255, 0.3)" }}
                  >
                    {billNo}
                  </span>
                  <p className="text-[10px] font-mono mt-1" style={{ color: "#fef3c7" }}>
                    {formatAppDate(booking.createdAt)}
                  </p>
                  <p className="text-[8.5px] uppercase tracking-widest text-white/70 mt-0.5 font-bold">
                    TAX INVOICE
                  </p>
                </div>
              </div>
            </div>

            {/* Client & Delivery Info Grid */}
            <div
              className="p-3.5 sm:p-4 grid grid-cols-2 gap-3 text-xs"
              style={{ backgroundColor: "#fefce8", borderBottom: "1px solid #fef08a" }}
            >
              <div>
                <span
                  className="text-[9.5px] font-bold uppercase tracking-wider block"
                  style={{ color: "#854d0e" }}
                >
                  BILLED TO
                </span>
                <p className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5">{customerName}</p>
                {customer?.phone && (
                  <p className="text-slate-600 font-mono text-[10.5px] mt-0.5">
                    {customer.phone}
                  </p>
                )}
                {customer?.address && (
                  <p className="text-slate-500 text-[9.5px] leading-tight mt-0.5">
                    {customer.address}
                  </p>
                )}
              </div>

              <div className="text-right">
                <span
                  className="text-[9.5px] font-bold uppercase tracking-wider block"
                  style={{ color: "#854d0e" }}
                >
                  DELIVERY SCHEDULE
                </span>
                <p className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5">
                  {formatAppDate(booking.deliveryDate)}
                </p>
                <p className="text-slate-600 font-medium text-[10.5px] mt-0.5">
                  {fmtTime12(booking.deliveryTime)}
                </p>
                {artist && (
                  <p className="font-semibold text-[9.5px] mt-0.5" style={{ color: "#7a1f2a" }}>
                    Artist: {artist.name}
                  </p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="p-3.5 sm:p-4">
              <table className="w-full text-xs">
                <thead>
                  <tr
                    className="text-[9.5px] font-bold uppercase tracking-wider"
                    style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b" }}
                  >
                    <th className="py-1.5 text-left">Description</th>
                    <th className="py-1.5 text-center">Qty</th>
                    <th className="py-1.5 text-right">Rate</th>
                    <th className="py-1.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody style={{ color: "#1e293b" }}>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td className="py-2 text-left">
                      <span className="font-semibold block text-slate-800">
                        {booking.service === "prepleat" ? "PrePleat Saree Service" : "Saree Drape Service"}
                      </span>
                      <span className="text-[9.5px] text-slate-400">Professional pleating & box folding</span>
                    </td>
                    <td className="py-2 text-center font-mono">{booking.sareeCount}</td>
                    <td className="py-2 text-right font-mono">{fmtINR(booking.pricePerSaree)}</td>
                    <td className="py-2 text-right font-mono font-bold text-slate-900">
                      {fmtINR(booking.totalAmount)}
                    </td>
                  </tr>

                  {booking.extraCharges && booking.extraCharges > 0 && (
                    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td className="py-1.5 text-left text-slate-800">
                        <span>Extra / {booking.extraChargesNote || "Travel"} Charge</span>
                      </td>
                      <td className="py-1.5 text-center font-mono">1</td>
                      <td className="py-1.5 text-right font-mono">{fmtINR(booking.extraCharges)}</td>
                      <td className="py-1.5 text-right font-mono font-bold text-slate-900">
                        {fmtINR(booking.extraCharges)}
                      </td>
                    </tr>
                  )}

                  {booking.discount && booking.discount > 0 && (
                    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td className="py-1.5 text-left font-medium" style={{ color: "#047857" }}>
                        Special Discount / Offer
                      </td>
                      <td className="py-1.5 text-center font-mono">1</td>
                      <td className="py-1.5 text-right font-mono" style={{ color: "#047857" }}>-{fmtINR(booking.discount)}</td>
                      <td className="py-1.5 text-right font-mono font-bold" style={{ color: "#047857" }}>
                        -{fmtINR(booking.discount)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Financial Calculation Summary & Compact Rubber Seal Stamp */}
              <div
                className="mt-3.5 pt-3 flex items-center justify-between gap-3"
                style={{ borderTop: "1px solid #e2e8f0" }}
              >
                {/* Compact Official Rubber Seal Stamp */}
                <div className="pb-0.5">
                  {due === 0 ? (
                    <div className="inline-block rotate-[-4deg] select-none">
                      <div
                        className="p-0.5 rounded-md shadow-xs"
                        style={{
                          border: "1.8px solid #047857",
                          backgroundColor: "rgba(4, 120, 87, 0.04)",
                          color: "#047857",
                        }}
                      >
                        <div
                          className="px-2 py-0.5 rounded-[2px] flex flex-col items-center justify-center text-center"
                          style={{ border: "1px dashed rgba(4, 120, 87, 0.7)" }}
                        >
                          {/* Header */}
                          <span className="text-[6.5px] font-black uppercase tracking-tight font-mono whitespace-nowrap leading-none block">
                            ★ {settings.businessName || "EYAS SAREE DRAPIST"} ★
                          </span>
                          {/* Main Stamp Text */}
                          <div
                            className="my-0.5 py-0.5 w-full flex items-center justify-center"
                            style={{
                              borderTop: "1px solid rgba(4, 120, 87, 0.35)",
                              borderBottom: "1px solid rgba(4, 120, 87, 0.35)",
                            }}
                          >
                            <span className="text-[11px] font-black tracking-wider uppercase font-mono leading-none">
                              PAID
                            </span>
                          </div>
                          {/* Footer */}
                          <span className="text-[5.5px] font-extrabold uppercase tracking-tight font-mono leading-none block">
                            FULL SETTLEMENT · OFFICIAL SEAL
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="inline-block rotate-[-4deg] select-none">
                      <div
                        className="p-0.5 rounded-md shadow-xs"
                        style={{
                          border: "1.8px solid #b91c1c",
                          backgroundColor: "rgba(185, 28, 28, 0.04)",
                          color: "#b91c1c",
                        }}
                      >
                        <div
                          className="px-2 py-0.5 rounded-[2px] flex flex-col items-center justify-center text-center"
                          style={{ border: "1px dashed rgba(185, 28, 28, 0.7)" }}
                        >
                          {/* Header */}
                          <span className="text-[6.5px] font-black uppercase tracking-tight font-mono whitespace-nowrap leading-none block">
                            ★ {settings.businessName || "EYAS SAREE DRAPIST"} ★
                          </span>
                          {/* Main Stamp Text */}
                          <div
                            className="my-0.5 py-0.5 w-full flex items-center justify-center"
                            style={{
                              borderTop: "1px solid rgba(185, 28, 28, 0.35)",
                              borderBottom: "1px solid rgba(185, 28, 28, 0.35)",
                            }}
                          >
                            <span className="text-[9.5px] font-black tracking-tight uppercase font-mono leading-none">
                              {totalPaid > 0 ? "PARTIAL PAID" : "PAYMENT DUE"}
                            </span>
                          </div>
                          {/* Footer */}
                          <span className="text-[5.5px] font-extrabold uppercase tracking-tight font-mono leading-none block">
                            DUE: {fmtINR(due)} · OFFICIAL SEAL
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="w-44 space-y-1 text-xs text-right">
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Total Bill:</span>
                    <span className="font-mono font-semibold text-slate-800">{fmtINR(netTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Paid / Advance:</span>
                    <span className="font-mono font-semibold text-slate-800">{fmtINR(totalPaid)}</span>
                  </div>
                  <div
                    className="flex justify-between font-bold text-xs sm:text-sm pt-1"
                    style={{ borderTop: "1px solid #e2e8f0" }}
                  >
                    <span className="text-slate-900">Remaining Due:</span>
                    <span
                      className="font-mono"
                      style={{ color: due > 0 ? "#b91c1c" : "#047857" }}
                    >
                      {due > 0 ? fmtINR(due) : "₹0"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Footer */}
            <div
              className="px-4 py-2.5 flex items-center justify-between text-[9.5px]"
              style={{ backgroundColor: "#f8fafc", borderTop: "1px solid #e2e8f0", color: "#64748b" }}
            >
              <span className="font-semibold text-slate-700">
                {settings.businessName || "Eyas Saree Drapist"}
              </span>
              <span className="italic">Thank you for choosing Eyas! 🙏</span>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="p-3 sm:p-3.5 bg-card border-t border-border/40 flex items-center justify-between gap-1.5 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5">
            {customer?.phone && (
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-2.5 sm:px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                title="Send via WhatsApp"
              >
                <MessageCircle className="size-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveImage}
              disabled={savingImage}
              className="px-2.5 sm:px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition disabled:opacity-60"
              title="Save as PNG Image"
            >
              {savingImage ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ImageIcon className="size-3.5" />
              )}
              <span className="hidden sm:inline">Save Image</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="px-3.5 sm:px-4 py-2 rounded-xl saree-gradient text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer disabled:opacity-60"
            >
              {downloading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="size-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
