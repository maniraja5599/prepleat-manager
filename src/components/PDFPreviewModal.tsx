import React, { useRef } from "react";
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
  formatAppDateTime,
} from "@/lib/store";
import { generateBillPDF } from "@/lib/pdf-bill";
import { cleanPhoneForWhatsApp } from "@/lib/utils";
import { X, Download, MessageCircle, Printer, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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

  if (!open || !booking) return null;

  const billNo = formatShortBillNumber(booking.billNumber, booking.id);
  const customerName = customer?.name || "Customer";
  const due = totalDue(booking);
  const netTotal = netBookingAmount(booking);
  const totalPaid = (booking.advancePaid || 0);

  const handleDownload = () => {
    if (!booking) return;
    generateBillPDF({ booking, customer, artist, payments, settings });
    toast.success("PDF Invoice downloaded! 📄");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!booking) return;
    const phone = customer?.phone ? cleanPhoneForWhatsApp(customer.phone) : "";
    if (!phone) {
      return toast.error("No customer phone number available");
    }
    const msg = [
      `🥻 *EYAS SAREE DRAPIST* 🥻`,
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
        : `✅ *Payment Status*: Paid in Full ✅`,
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
            className="w-full max-w-lg bg-white text-slate-900 rounded-2xl shadow-md border border-amber-900/10 overflow-hidden font-sans relative"
          >
            {/* Branded Invoice Banner Header */}
            <div className="saree-gradient p-5 sm:p-6 text-white relative">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-lg sm:text-xl font-display font-extrabold tracking-wide text-amber-100">
                    {settings.businessName || "EYAS SAREE DRAPIST"}
                  </h1>
                  <p className="text-xs italic text-amber-200/90 font-serif mt-0.5">
                    {settings.businessSlogan || "Flawless Drape & Saree Box Folding"}
                  </p>
                  {settings.businessPhone && (
                    <p className="text-[11px] text-white/85 mt-1.5 font-mono">
                      📞 {settings.businessPhone}
                    </p>
                  )}
                  {settings.businessAddress && (
                    <p className="text-[10px] text-white/75 leading-tight max-w-xs mt-0.5">
                      📍 {settings.businessAddress}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-3 py-1 bg-white/15 backdrop-blur-xs rounded-xl border border-white/25 text-xs font-mono font-bold text-white shadow-xs">
                    {billNo}
                  </span>
                  <p className="text-[10px] text-amber-100/80 font-mono mt-1.5">
                    {formatAppDate(booking.createdAt)}
                  </p>
                  <p className="text-[9px] text-white/60 uppercase tracking-widest mt-0.5">
                    TAX INVOICE
                  </p>
                </div>
              </div>
            </div>

            {/* Client & Delivery Info Grid */}
            <div className="p-4 sm:p-5 bg-amber-50/40 border-b border-amber-900/10 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-amber-900/70 uppercase tracking-wider block">
                  BILLED TO
                </span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{customerName}</p>
                {customer?.phone && (
                  <p className="text-slate-600 font-mono text-[11px] mt-0.5">
                    {customer.phone}
                  </p>
                )}
                {customer?.address && (
                  <p className="text-slate-500 text-[10px] leading-tight mt-0.5">
                    {customer.address}
                  </p>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-amber-900/70 uppercase tracking-wider block">
                  DELIVERY SCHEDULE
                </span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {formatAppDate(booking.deliveryDate)}
                </p>
                <p className="text-slate-600 font-medium text-[11px] mt-0.5">
                  {fmtTime12(booking.deliveryTime)}
                </p>
                {artist && (
                  <p className="text-primary font-semibold text-[10px] mt-0.5">
                    Artist: {artist.name}
                  </p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="p-4 sm:p-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2 text-left">Description</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Rate</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td className="py-2.5 text-left text-slate-800">
                      <span className="font-semibold block">
                        {booking.service === "prepleat" ? "PrePleat Saree Service" : "Saree Drape Service"}
                      </span>
                      <span className="text-[10px] text-slate-400">Professional pleating & box folding</span>
                    </td>
                    <td className="py-2.5 text-center font-mono">{booking.sareeCount}</td>
                    <td className="py-2.5 text-right font-mono">{fmtINR(booking.pricePerSaree)}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                      {fmtINR(booking.totalAmount)}
                    </td>
                  </tr>

                  {booking.extraCharges && booking.extraCharges > 0 && (
                    <tr>
                      <td className="py-2 text-left text-slate-800">
                        <span>Extra / {booking.extraChargesNote || "Travel"} Charge</span>
                      </td>
                      <td className="py-2 text-center font-mono">1</td>
                      <td className="py-2 text-right font-mono">{fmtINR(booking.extraCharges)}</td>
                      <td className="py-2 text-right font-mono font-bold text-slate-900">
                        {fmtINR(booking.extraCharges)}
                      </td>
                    </tr>
                  )}

                  {booking.discount && booking.discount > 0 && (
                    <tr>
                      <td className="py-2 text-left text-emerald-700 font-medium">
                        Special Discount / Offer
                      </td>
                      <td className="py-2 text-center font-mono">1</td>
                      <td className="py-2 text-right font-mono text-emerald-700">-{fmtINR(booking.discount)}</td>
                      <td className="py-2 text-right font-mono font-bold text-emerald-700">
                        -{fmtINR(booking.discount)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Financial Calculation Summary & Authentic Physical Rubber Seal Stamp */}
              <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
                {/* Authentic Physical Rubber Seal Stamp */}
                <div className="pb-0.5">
                  {due === 0 ? (
                    <div className="inline-block rotate-[-5deg] transition hover:rotate-[-2deg] select-none">
                      <div className="p-1 rounded-lg border-[2.5px] border-emerald-700/90 bg-emerald-700/[0.04] shadow-xs">
                        <div className="px-3.5 py-1.5 rounded-sm border border-dashed border-emerald-700/80 flex flex-col items-center justify-center text-center">
                          {/* Stamp Header */}
                          <span className="text-[8px] font-extrabold uppercase tracking-widest text-emerald-800 font-mono">
                            ★ {settings.businessName || "EYAS SAREE DRAPIST"} ★
                          </span>
                          
                          {/* Main Stamp Text */}
                          <div className="my-0.5 flex items-center justify-center gap-1.5 border-y border-emerald-700/40 py-0.5 w-full">
                            <span className="text-base sm:text-lg font-black tracking-widest text-emerald-700 uppercase font-mono leading-none">
                              PAID
                            </span>
                          </div>

                          {/* Stamp Subtitle & Meta */}
                          <span className="text-[7.5px] font-bold text-emerald-800 uppercase tracking-wider font-mono">
                            FULL SETTLEMENT · {formatAppDate(new Date())}
                          </span>
                          <span className="text-[6.5px] text-emerald-700/80 font-mono tracking-widest uppercase">
                            ✓ OFFICIAL RECEIPT SEAL
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="inline-block rotate-[-4deg] transition hover:rotate-[-2deg] select-none">
                      <div className="p-1 rounded-lg border-[2.5px] border-rose-700/90 bg-rose-700/[0.04] shadow-xs">
                        <div className="px-3.5 py-1.5 rounded-sm border border-dashed border-rose-700/80 flex flex-col items-center justify-center text-center">
                          {/* Stamp Header */}
                          <span className="text-[8px] font-extrabold uppercase tracking-widest text-rose-800 font-mono">
                            ★ {settings.businessName || "EYAS SAREE DRAPIST"} ★
                          </span>

                          {/* Main Stamp Text */}
                          <div className="my-0.5 flex items-center justify-center gap-1 border-y border-rose-700/40 py-0.5 w-full">
                            <span className="text-sm sm:text-base font-black tracking-widest text-rose-700 uppercase font-mono leading-none">
                              {totalPaid > 0 ? "PARTIAL PAID" : "PAYMENT DUE"}
                            </span>
                          </div>

                          {/* Stamp Subtitle & Meta */}
                          <span className="text-[7.5px] font-bold text-rose-800 uppercase tracking-wider font-mono">
                            BALANCE DUE: {fmtINR(due)}
                          </span>
                          <span className="text-[6.5px] text-rose-700/80 font-mono tracking-widest uppercase">
                            ⚠ PENDING SETTLEMENT
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="w-48 space-y-1.5 text-xs text-right">
                  <div className="flex justify-between text-slate-500">
                    <span>Total Bill:</span>
                    <span className="font-mono font-semibold text-slate-800">{fmtINR(netTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Paid / Advance:</span>
                    <span className="font-mono font-semibold text-slate-800">{fmtINR(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1.5 border-t border-slate-200">
                    <span className="text-slate-900">Remaining Due:</span>
                    <span className={due > 0 ? "text-amber-700 font-mono" : "text-emerald-700 font-mono"}>
                      {due > 0 ? fmtINR(due) : "₹0"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
              <span className="font-semibold text-slate-700">
                {settings.businessName || "Eyas Saree Drapist"}
              </span>
              <span className="italic">Thank you for choosing Eyas! 🙏</span>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="p-3 sm:p-3.5 bg-card border-t border-border/40 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            {customer?.phone && (
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
              >
                <MessageCircle className="size-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl saree-gradient text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
