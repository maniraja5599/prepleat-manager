import jsPDF from "jspdf";
import type { Booking, Customer, Settings, Payment } from "./store";
import { formatShortBillNumber } from "./store";
import { drawInvoiceCanvas, downloadInvoicePDFDirect, downloadInvoiceImagePNG } from "./invoice-canvas";

export interface GenerateBillOptions {
  booking: Booking;
  customer?: Customer;
  artist?: Customer;
  payments: Payment[];
  settings: Settings;
}

export async function createBillPDFDoc(opts: GenerateBillOptions): Promise<{ doc: jsPDF; filename: string }> {
  const { booking, customer } = opts;
  const billNo = formatShortBillNumber(booking.billNumber, booking.id);
  const canvas = drawInvoiceCanvas(opts);
  const imgData = canvas.toDataURL("image/png");

  const pdfWidth = 420; // A5 width in pt
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  const doc = new jsPDF({
    orientation: "p",
    unit: "pt",
    format: [pdfWidth, pdfHeight],
  });

  doc.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
  const filename = `Bill-${billNo}-${(customer?.name || "Customer").replace(/\s+/g, "_")}.pdf`;
  return { doc, filename };
}

export async function generateBillPDF(opts: GenerateBillOptions): Promise<void> {
  await downloadInvoicePDFDirect(opts);
}

export async function getBillPDFBlobUrl(opts: GenerateBillOptions): Promise<{ blobUrl: string; filename: string; doc: jsPDF }> {
  const { doc, filename } = await createBillPDFDoc(opts);
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  return { blobUrl, filename, doc };
}

export async function getBillPDFDataUri(opts: GenerateBillOptions): Promise<{ dataUri: string; filename: string; doc: jsPDF }> {
  const { doc, filename } = await createBillPDFDoc(opts);
  const dataUri = doc.output("datauristring");
  return { dataUri, filename, doc };
}

export { downloadInvoiceImagePNG, downloadInvoicePDFDirect };
