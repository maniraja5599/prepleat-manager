import React, { useEffect, useState } from "react";
import {
  type Booking,
  type Customer,
  type Payment,
  type Settings,
  formatShortBillNumber,
  fmtINR,
  totalDue,
  netBookingAmount,
  formatAppDate,
} from "@/lib/store";
import { getBillPDFBlobUrl, generateBillPDF } from "@/lib/pdf-bill";
import { cleanPhoneForWhatsApp } from "@/lib/utils";
import { X, Download, MessageCircle, Printer, Loader2, FileText } from "lucide-react";
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let urlToRevoke: string | null = null;

    if (open && booking) {
      setLoading(true);
      getBillPDFBlobUrl({ booking, customer, artist, payments, settings })
        .then(({ blobUrl: url }) => {
          if (active) {
            urlToRevoke = url;
            setBlobUrl(url);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Failed to render PDF:", err);
          if (active) setLoading(false);
          toast.error("Failed to preview PDF bill");
        });
    } else {
      setBlobUrl(null);
    }

    return () => {
      active = false;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [open, booking, customer, artist, payments, settings]);

  if (!open || !booking) return null;

  const billNo = formatShortBillNumber(booking.billNumber, booking.id);
  const customerName = customer?.name || "Customer";

  const handleDownload = () => {
    if (!booking) return;
    generateBillPDF({ booking, customer, artist, payments, settings });
    toast.success("PDF Invoice downloaded! 📄");
  };

  const handlePrint = () => {
    if (!blobUrl) return;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    };
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
      `💰 *Total Bill*: ${fmtINR(netBookingAmount(booking))}`,
      `💵 *Advance Paid*: ${fmtINR(booking.advancePaid || 0)}`,
      totalDue(booking) > 0
        ? `📌 *Balance Due*: *${fmtINR(totalDue(booking))}*`
        : `✅ *Payment Status*: Paid in Full ✅`,
      ``,
      `✨ _Wear with confidence & elegance!_`,
      `🙏 *Eyas Saree Drapist*`,
    ].join("\n");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-[30000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-2xl h-[88vh] max-h-[720px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border/50 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border/40 flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground leading-tight truncate">
                Invoice Preview · {billNo}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate">
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

        {/* PDF Viewer Body */}
        <div className="flex-1 bg-muted/30 relative flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="size-7 animate-spin text-primary" />
              <span className="text-xs font-semibold">Generating Bill PDF...</span>
            </div>
          ) : blobUrl ? (
            <iframe
              src={`${blobUrl}#toolbar=0&navpanes=0`}
              title={`PDF Preview ${billNo}`}
              className="w-full h-full border-none rounded-b-none"
            />
          ) : (
            <p className="text-xs text-muted-foreground">Preview unavailable.</p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-card border-t border-border/40 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!blobUrl || loading}
              className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition disabled:opacity-50"
            >
              <Printer className="size-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
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
              className="px-4 py-2 rounded-xl bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
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
