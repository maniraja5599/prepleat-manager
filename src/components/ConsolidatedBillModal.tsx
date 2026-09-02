import React, { useState } from "react";
import {
  type Booking,
  type Customer,
  type Settings,
  formatShortBillNumber,
  fmtINR,
  fmtTime12,
  totalDue,
  netBookingAmount,
  formatAppDate,
} from "@/lib/store";
import {
  downloadConsolidatedPDFDirect,
  downloadConsolidatedImagePNG,
  shareConsolidatedWhatsApp,
} from "@/lib/consolidated-bill";
import {
  X,
  Download,
  MessageCircle,
  FileText,
  Image as ImageIcon,
  Loader2,
  Phone,
  CheckCircle2,
  Layers,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

interface ConsolidatedBillModalProps {
  open: boolean;
  onClose: () => void;
  clientOrArtist: Customer | null;
  selectedBookings: Booking[];
  allCustomers: Customer[];
  settings: Settings;
}

export function ConsolidatedBillModal({
  open,
  onClose,
  clientOrArtist,
  selectedBookings,
  allCustomers,
  settings,
}: ConsolidatedBillModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [tempPhone, setTempPhone] = useState(clientOrArtist?.phone || "");

  if (!open || selectedBookings.length === 0) return null;

  const clientName = clientOrArtist?.name || "Client / Artist";
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

  const isAllPaid = totalBalanceDue === 0;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadConsolidatedPDFDirect({
        clientOrArtist,
        selectedBookings,
        allCustomers,
        settings,
      });
      toast.success("Ultra-HD Consolidated PDF Statement downloaded! 📄");
    } catch (err) {
      console.error("Failed to generate statement PDF:", err);
      toast.error("Could not download statement PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveImage = async () => {
    setSavingImage(true);
    try {
      await downloadConsolidatedImagePNG({
        clientOrArtist,
        selectedBookings,
        allCustomers,
        settings,
      });
      toast.success("Ultra-HD Statement Image saved! 📸");
    } catch (err) {
      console.error("Failed to save statement image:", err);
      toast.error("Could not save image");
    } finally {
      setSavingImage(false);
    }
  };

  const handleDirectWhatsAppShare = async (phoneToSend?: string) => {
    setSharingWhatsApp(true);
    try {
      const targetPhone = phoneToSend || clientOrArtist?.phone || tempPhone;
      const res = await shareConsolidatedWhatsApp(
        { clientOrArtist, selectedBookings, allCustomers, settings },
        targetPhone,
      );

      if (res.success) {
        toast.success("WhatsApp Statement opened! 💬");
        setShowPhonePrompt(false);
      } else if (res.message === "NO_PHONE") {
        setShowPhonePrompt(true);
      }
    } catch (err) {
      console.error("WhatsApp statement error:", err);
      toast.error("Could not open WhatsApp");
    } finally {
      setSharingWhatsApp(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[30000] bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-2xl h-[92vh] max-h-[820px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border/50 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-border/40 flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Layers className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-foreground leading-tight truncate">
                Combined Statement · {clientName}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate">
                {selectedBookings.length} Bills Selected · {totalSarees} Sarees Total
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDirectWhatsAppShare()}
              disabled={sharingWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <MessageCircle className="size-3.5" />
              <span className="hidden sm:inline">WhatsApp Statement</span>
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

        {/* Scrollable Statement Document Body */}
        <div className="flex-1 bg-muted/40 p-3 sm:p-5 overflow-y-auto flex items-start justify-center">
          <div
            className="w-full max-w-xl bg-white text-slate-900 rounded-2xl shadow-md overflow-hidden font-sans relative border border-slate-200"
            style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
          >
            {/* Header Gradient */}
            <div
              className="p-4 sm:p-5 text-white relative"
              style={{ background: "linear-gradient(135deg, #500724 0%, #881337 50%, #4c0519 100%)", color: "#ffffff" }}
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
                    {selectedBookings.length} BILLS COMBINED
                  </span>
                  <p className="text-[10.5px] font-mono mt-1 font-bold" style={{ color: "#fef3c7" }}>
                    {formatAppDate(new Date().toISOString())}
                  </p>
                  <p className="text-[9px] uppercase tracking-widest text-white/80 mt-0.5 font-bold">
                    CONSOLIDATED STATEMENT
                  </p>
                </div>
              </div>
            </div>

            {/* Client / Artist Summary Grid */}
            <div
              className="p-3.5 sm:p-4 grid grid-cols-2 gap-3 text-xs"
              style={{ backgroundColor: "#fefce8", borderBottom: "1px solid #fef08a" }}
            >
              <div>
                <span className="text-[9.5px] font-bold uppercase tracking-wider block" style={{ color: "#854d0e" }}>
                  STATEMENT PREPARED FOR
                </span>
                <p className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5">{clientName}</p>
                {clientOrArtist?.phone && (
                  <p className="text-slate-700 font-mono text-[10.5px] mt-0.5 font-semibold">
                    +91 {clientOrArtist.phone}
                  </p>
                )}
                {clientOrArtist?.address && (
                  <p className="text-slate-500 text-[9.5px] leading-tight mt-0.5">
                    {clientOrArtist.address}
                  </p>
                )}
              </div>

              <div className="text-right">
                <span className="text-[9.5px] font-bold uppercase tracking-wider block" style={{ color: "#854d0e" }}>
                  SUMMARY TOTALS
                </span>
                <p className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5">
                  {selectedBookings.length} Orders · {totalSarees} Sarees
                </p>
                <p className="text-slate-600 font-bold text-[10.5px] mt-0.5">
                  Grand Total: {fmtINR(grandTotal)}
                </p>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="p-3.5 sm:p-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th className="text-left py-2 px-2 text-slate-500 font-bold text-[10.5px]">BILL & DATE</th>
                    <th className="text-left py-2 px-2 text-slate-500 font-bold text-[10.5px]">LOCATION / NOTES</th>
                    <th className="text-center py-2 px-2 text-slate-500 font-bold text-[10.5px]">SERVICE</th>
                    <th className="text-right py-2 px-2 text-slate-500 font-bold text-[10.5px]">TOTAL</th>
                    <th className="text-right py-2 px-2 text-slate-500 font-bold text-[10.5px]">BAL DUE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedBookings.map((b) => {
                    const billNo = formatShortBillNumber(b.billNumber, b.id);
                    const dateStr = formatAppDate(b.deliveryDate);
                    const timeStr = b.deliveryTime ? fmtTime12(b.deliveryTime) : "";
                    const bCustomer = allCustomers.find((c) => c.id === b.customerId);
                    const place = bCustomer?.address || b.notes || "-";
                    
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

                    return (
                      <tr key={b.id}>
                        <td className="py-2.5 px-2">
                          <p className="font-bold font-mono text-slate-900">{billNo}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{dateStr}{timeStr ? ` · ${timeStr}` : ""}</p>
                        </td>
                        <td className="py-2.5 px-2 text-slate-700 text-[11px]">
                          <p className="truncate max-w-[140px] font-medium">{place}</p>
                          {b.notes && b.notes !== place && (
                            <p className="text-[10px] text-slate-500 italic mt-0.5 truncate max-w-[140px]">
                              Note: {b.notes}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-900 text-[11px]">
                          {svcBreakdown}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                          {fmtINR(bNet)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold">
                          <span className={bDue > 0 ? "text-rose-700 font-bold" : "text-emerald-700 font-bold"}>
                            {bDue > 0 ? fmtINR(bDue) : "PAID"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Financial Totals & Verification Rubber Stamp */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Visual Circular Rubber Stamp Seal */}
                <div
                  className="size-20 rounded-full border-2 border-dashed flex flex-col items-center justify-center -rotate-12 select-none shrink-0"
                  style={{
                    borderColor: isAllPaid ? "rgba(4, 120, 87, 0.48)" : "rgba(185, 28, 28, 0.48)",
                    backgroundColor: isAllPaid ? "rgba(4, 120, 87, 0.02)" : "rgba(185, 28, 28, 0.02)",
                    color: isAllPaid ? "rgba(4, 120, 87, 0.70)" : "rgba(185, 28, 28, 0.70)",
                  }}
                >
                  <span className="text-[7px] font-mono font-bold tracking-wider">★ OFFICIAL ★</span>
                  <div className="w-12 my-0.5 border-y border-current/40 py-0.5 text-center">
                    <span className="text-xs font-mono font-black tracking-widest block">
                      {isAllPaid ? "PAID" : "DUE"}
                    </span>
                  </div>
                  <span className="text-[6.5px] font-mono font-bold tracking-tight">
                    {isAllPaid ? "ALL CLEARED" : "STATEMENT DUE"}
                  </span>
                </div>

                {/* Financial Math */}
                <div className="w-full sm:w-60 space-y-1.5 text-xs text-right">
                  <div className="flex justify-between text-slate-500">
                    <span>Grand Total Amount:</span>
                    <span className="font-mono font-bold text-slate-900">{fmtINR(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Total Advance / Paid:</span>
                    <span className="font-mono font-bold text-slate-900">{fmtINR(totalPaid)}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-200 flex justify-between font-bold text-sm">
                    <span className="text-slate-900">Net Balance Due:</span>
                    <span className={totalBalanceDue > 0 ? "text-rose-700 font-mono font-black" : "text-emerald-700 font-mono font-black"}>
                      {totalBalanceDue > 0 ? fmtINR(totalBalanceDue) : "Rs. 0"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Bar */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[10.5px] text-slate-500 flex items-center justify-between">
              <span className="font-bold text-slate-700">
                {(settings.businessName || "SAREE STUDIO").toUpperCase()}
              </span>
              <span className="italic">Thank you for your valued partnership! 🙏</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-3 sm:p-4 bg-card border-t border-border/40 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
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
              <span>Send Statement to WhatsApp</span>
            </button>

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
                  <h4 className="font-bold text-sm text-foreground">Send Statement to WhatsApp</h4>
                </div>
                <button
                  onClick={() => setShowPhonePrompt(false)}
                  className="size-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Enter the client's 10-digit mobile number to send this combined statement for <strong>{selectedBookings.length} bills</strong>:
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
                  <span>Send Statement</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
