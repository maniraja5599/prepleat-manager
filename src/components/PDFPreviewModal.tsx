import React, { useState } from "react";
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
import {
  downloadInvoicePDFDirect,
  downloadInvoiceImagePNG,
  shareInvoiceToCustomerWhatsApp,
} from "@/lib/invoice-canvas";
import { cleanPhoneForWhatsApp } from "@/lib/utils";
import {
  X,
  Download,
  MessageCircle,
  FileText,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Phone,
  Check,
} from "lucide-react";
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
  const [downloading, setDownloading] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [tempPhone, setTempPhone] = useState(customer?.phone || "");

  if (!open || !booking) return null;

  const billNo = formatShortBillNumber(booking.billNumber, booking.id);
  const customerName = customer?.name || "Customer";
  const due = totalDue(booking);
  const netTotal = netBookingAmount(booking);
  const totalPaid = booking.advancePaid || 0;

  const isPaid = due === 0;
  const isPartial = !isPaid && totalPaid > 0;

  const handleDownload = async () => {
    if (!booking) return;
    setDownloading(true);
    try {
      await downloadInvoicePDFDirect({ booking, customer, artist, payments, settings });
      toast.success("Ultra-HD PDF Invoice downloaded! 📄");
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      toast.error("Could not download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveImage = async () => {
    if (!booking) return;
    setSavingImage(true);
    try {
      await downloadInvoiceImagePNG({ booking, customer, artist, payments, settings });
      toast.success("Ultra-HD Invoice Image saved! 📸");
    } catch (err) {
      console.error("Failed to save image:", err);
      toast.error("Could not save image");
    } finally {
      setSavingImage(false);
    }
  };

  const handleDirectWhatsAppShare = async (phoneToSend?: string) => {
    if (!booking) return;
    setSharingWhatsApp(true);
    try {
      const targetPhone = phoneToSend || customer?.phone || tempPhone;
      const res = await shareInvoiceToCustomerWhatsApp(
        { booking, customer, artist, payments, settings },
        targetPhone,
      );

      if (res.success) {
        toast.success("WhatsApp Invoice opened! 💬");
        setShowPhonePrompt(false);
      } else if (res.message === "NO_PHONE") {
        setShowPhonePrompt(true);
      }
    } catch (err) {
      console.error("WhatsApp share error:", err);
      toast.error("Could not open WhatsApp");
    } finally {
      setSharingWhatsApp(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[30000] bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-xl h-[92vh] max-h-[780px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border/50 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Bar */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-border/40 flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <FileText className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-foreground leading-tight truncate">
                Invoice #{billNo} · {customerName}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate">
                {formatAppDate(booking.createdAt)} · {booking.service === "prepleat" ? "PrePleat" : "Draping"} ({booking.sareeCount} sarees)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Header WhatsApp Button */}
            <button
              type="button"
              onClick={() => handleDirectWhatsAppShare()}
              disabled={sharingWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <MessageCircle className="size-3.5" />
              <span className="hidden sm:inline">Send WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              <X className="size-4.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Authentic Paper Invoice Document Body */}
        <div className="flex-1 bg-muted/40 p-3 sm:p-5 overflow-y-auto flex items-start justify-center">
          <div
            className="w-full max-w-lg bg-white text-slate-900 rounded-2xl shadow-md overflow-hidden font-sans relative border border-slate-200"
            style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
          >
            {/* Branded Invoice Banner Header */}
            <div
              className="p-4 sm:p-5 text-white relative"
              style={{ background: "linear-gradient(135deg, #6b1724 0%, #881337 50%, #4c0519 100%)", color: "#ffffff" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1
                    className="text-base sm:text-lg font-bold tracking-wide"
                    style={{ color: "#fef3c7", fontFamily: "Georgia, serif" }}
                  >
                    {settings.businessName || "SAREE PREPLEAT STUDIO"}
                  </h1>
                  <p
                    className="text-[11px] italic mt-0.5"
                    style={{ color: "#fde68a", fontFamily: "Georgia, serif" }}
                  >
                    {settings.businessSlogan || "Flawless Saree Draping & Pre-Pleat Care"}
                  </p>
                  {settings.businessPhone && (
                    <p className="text-[10.5px] text-white/95 mt-1 font-mono font-semibold">
                      📞 +91 {settings.businessPhone}
                    </p>
                  )}
                  {settings.businessAddress && (
                    <p className="text-[9.5px] text-white/85 leading-tight max-w-xs mt-0.5">
                      📍 {settings.businessAddress}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span
                    className="inline-block px-3 py-1 rounded-xl text-xs font-mono font-bold text-white shadow-xs"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.18)", border: "1px solid rgba(255, 255, 255, 0.35)" }}
                  >
                    {billNo}
                  </span>
                  <p className="text-[10.5px] font-mono mt-1 font-bold" style={{ color: "#fef3c7" }}>
                    {formatAppDate(booking.createdAt)}
                  </p>
                  <p className="text-[9px] uppercase tracking-widest text-white/80 mt-0.5 font-bold">
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
                  BILLED TO CUSTOMER
                </span>
                <p className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5">{customerName}</p>
                {customer?.phone && (
                  <p className="text-slate-700 font-mono text-[10.5px] mt-0.5 font-semibold">
                    +91 {customer.phone}
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
                <p className="text-slate-700 font-bold text-[10.5px] mt-0.5">
                  {fmtTime12(booking.deliveryTime) || "Anytime"}
                </p>
                {artist && (
                  <p className="text-rose-900 font-bold text-[9.5px] mt-0.5">
                    Artist: {artist.name}
                  </p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="p-3.5 sm:p-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th className="text-left py-2 px-2 text-slate-500 font-bold text-[10.5px]">DESCRIPTION</th>
                    <th className="text-center py-2 px-2 text-slate-500 font-bold text-[10.5px]">QTY</th>
                    <th className="text-right py-2 px-2 text-slate-500 font-bold text-[10.5px]">RATE</th>
                    <th className="text-right py-2 px-2 text-slate-500 font-bold text-[10.5px]">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {booking.items && booking.items.length > 0 ? (
                    booking.items.map((it, idx) => {
                      const itemSubtotal = (it.sareeCount || 1) * (it.pricePerSaree || 0);
                      return (
                        <tr key={it.id || idx}>
                          <td className="py-2.5 px-2">
                            <p className="font-bold text-slate-900">
                              {it.serviceName || (it.service === "prepleat" ? "Saree Pre-Pleating" : it.service === "drape" ? "Saree Draping" : "Custom Service")}
                            </p>
                            {it.notes ? (
                              <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                                📌 Note: {it.notes}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400">Professional studio care</p>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900">
                            {it.sareeCount || 1}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                            {fmtINR(it.pricePerSaree || 0)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                            {fmtINR(itemSubtotal)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="py-2.5 px-2">
                        <p className="font-bold text-slate-900">
                          {booking.service === "prepleat" ? "Saree Pre-Pleating Service" : "Saree Draping Service"}
                        </p>
                        {booking.notes ? (
                          <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                            📌 Note: {booking.notes}
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400">Professional pleating & box folding care</p>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900">
                        {booking.sareeCount}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                        {fmtINR(booking.pricePerSaree)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                        {fmtINR(booking.totalAmount)}
                      </td>
                    </tr>
                  )}

                  {booking.extraCharges && booking.extraCharges > 0 ? (
                    <tr>
                      <td className="py-2 px-2 text-slate-700">
                        Extra / {booking.extraChargesNote || "Travel"} Charge
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-600">1</td>
                      <td className="py-2 px-2 text-right font-mono text-slate-600">{fmtINR(booking.extraCharges)}</td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">{fmtINR(booking.extraCharges)}</td>
                    </tr>
                  ) : null}

                  {booking.discount && booking.discount > 0 ? (
                    <tr className="text-emerald-700">
                      <td className="py-2 px-2 font-semibold">Special Discount / Coupon Offer</td>
                      <td className="py-2 px-2 text-center font-mono">1</td>
                      <td className="py-2 px-2 text-right font-mono">-{fmtINR(booking.discount)}</td>
                      <td className="py-2 px-2 text-right font-mono font-bold">-{fmtINR(booking.discount)}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>

              {/* Financial Totals & Verification Rubber Stamp */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Visual Circular Rubber Stamp Seal */}
                <div
                  className="size-20 rounded-full border-2 border-dashed flex flex-col items-center justify-center -rotate-12 select-none shrink-0"
                  style={{
                    borderColor: isPaid ? "rgba(4, 120, 87, 0.48)" : isPartial ? "rgba(194, 65, 12, 0.48)" : "rgba(185, 28, 28, 0.48)",
                    backgroundColor: isPaid ? "rgba(4, 120, 87, 0.02)" : "rgba(185, 28, 28, 0.02)",
                    color: isPaid ? "rgba(4, 120, 87, 0.70)" : isPartial ? "rgba(194, 65, 12, 0.70)" : "rgba(185, 28, 28, 0.70)",
                  }}
                >
                  <span className="text-[7px] font-mono font-bold tracking-wider">★ OFFICIAL ★</span>
                  <div className="w-12 my-0.5 border-y border-current/40 py-0.5 text-center">
                    <span className="text-xs font-mono font-black tracking-widest block">
                      {isPaid ? "PAID" : isPartial ? "PARTIAL" : "DUE"}
                    </span>
                  </div>
                  <span className="text-[6.5px] font-mono font-bold tracking-tight">
                    {isPaid ? "100% CLEARED" : isPartial ? "BAL PENDING" : "PAY ON DELIVERY"}
                  </span>
                </div>

                {/* Financial Math */}
                <div className="w-full sm:w-56 space-y-1.5 text-xs text-right">
                  <div className="flex justify-between text-slate-500">
                    <span>Total Bill:</span>
                    <span className="font-mono font-bold text-slate-900">{fmtINR(netTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Paid / Advance:</span>
                    <span className="font-mono font-bold text-slate-900">{fmtINR(totalPaid)}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-200 flex justify-between font-bold text-sm">
                    <span className="text-slate-900">Remaining Due:</span>
                    <span className={due > 0 ? "text-rose-700 font-mono font-black" : "text-emerald-700 font-mono font-black"}>
                      {due > 0 ? fmtINR(due) : "Rs. 0"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Footer Bar */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[10.5px] text-slate-500 flex items-center justify-between">
              <span className="font-bold text-slate-700">
                {(settings.businessName || "SAREE STUDIO").toUpperCase()}
              </span>
              <span className="italic">Thank you for choosing {settings.businessName || "us"}! 🙏</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-3 sm:p-4 bg-card border-t border-border/40 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Primary Direct WhatsApp Send Button */}
            <button
              type="button"
              onClick={() => handleDirectWhatsAppShare()}
              disabled={sharingWhatsApp}
              className="px-3 sm:px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              {sharingWhatsApp ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <MessageCircle className="size-4" />
              )}
              <span>Send to WhatsApp</span>
            </button>

            {/* High-Res PNG Image Download */}
            <button
              type="button"
              onClick={handleSaveImage}
              disabled={savingImage}
              className="px-3 py-2.5 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition disabled:opacity-60"
            >
              {savingImage ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ImageIcon className="size-3.5" />
              )}
              <span className="hidden sm:inline">HD Image</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 rounded-2xl bg-secondary text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Close
            </button>

            {/* Ultra-HD PDF Download */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-2.5 rounded-2xl saree-gradient text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer disabled:opacity-60"
            >
              {downloading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Prompt Phone Number Sub-Modal if missing */}
        {showPhonePrompt && (
          <div
            className="fixed inset-0 z-[31000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setShowPhonePrompt(false)}
          >
            <div
              className="bg-card w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-primary/30 space-y-3.5 animate-in zoom-in-95 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                    <MessageCircle className="size-4" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">Send Invoice to WhatsApp</h4>
                </div>
                <button
                  onClick={() => setShowPhonePrompt(false)}
                  className="size-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Enter the customer's 10-digit mobile number to send bill <strong>#{billNo}</strong> directly:
              </p>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  WhatsApp Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={tempPhone}
                    onChange={(e) => setTempPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-secondary pl-11 pr-3 py-2.5 rounded-xl text-xs font-bold font-mono border border-border focus:outline-none focus:border-primary"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPhonePrompt(false)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectWhatsAppShare(tempPhone)}
                  disabled={tempPhone.length < 10}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <MessageCircle className="size-3.5" />
                  <span>Send Now</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
