# Refinement plan (8 items)

## 1. Round logo everywhere
Audit all `<img ... logo ...>` usages and ensure every logo render uses `rounded-full object-cover` with a square aspect ratio.
- Files to fix: `AppShell.tsx` (already round), `auth.tsx`, `_authenticated/route.tsx` splash, `book.tsx`, `settings.tsx`, PDF header.
- Standard: `size-10` (header), `size-16` (splash/auth), `size-20` (PDF).

## 2. PDF rupee symbol + footer
- Problem: jsPDF default Helvetica font does not include the ₹ glyph → renders as `?` or empty box.
- Fix: switch all amount strings in PDF to prefix `Rs. ` instead of `₹` (most reliable, no font embedding required). Keep `₹` everywhere else in the app.
- Footer redesign: thin top border, two-column layout — left: business name + website + phone; right: "Thank you for choosing us 🙏" + generated date. Smaller muted text.

## 3. New Booking — small icons on date/time
Add a tiny `Calendar` icon left of the date `HorizontalPicker` label and `Clock` icon left of the time picker label so users instantly recognise them.

## 4. Reminder (WhatsApp/SMS) only when balance pending
- In `bookings.$id.tsx` and `customers.$id.tsx`, conditionally render the "Send reminder" buttons only when `totalDue(b) > 0` and status is not `cancelled`/`delivered`.
- PDF bill: enrich
  - Add billing-to block (customer name, phone, address)
  - Add booking metadata (booking date, delivery date+time, service, artist if any, occasion/notes)
  - Add detailed payment history table (date, mode, amount, note)
  - Totals block: Total / Paid / Balance with the PAID/BALANCE stamp already in place

## 5. New Booking — Artist booking mode
- Add a prominent top toggle "Book via Artist" in `new.tsx`.
- When ON: shows artist selector (filter `customers` where `kind === "artist"`), saves `artistId` on the booking.
- The artist chip on booking cards is already in place; verify it actually reads `artistId` and shows correctly. Audit `bookings.index.tsx` + `bookings.$id.tsx`.
- Code audit pass: search the codebase for stale references to artist flow and align.

## 6. Bookings page filters restyle
- Currently: default "All" selected, no visual emphasis.
- New: segmented pill row "All · Paid · Due" and a second row "All · Prepleat · Drape", both with active pill in `bg-primary text-primary-foreground`. Persisted via `useState`.
- Replace giant count/amount header with a slim 3-chip strip (Bookings · Collected · Pending) directly under page title.

## 7. New Booking — existing customer link + phone validation
- Existing customer picker: autocomplete combobox at top of form. Selecting fills name/phone/address; otherwise type a new name (mandatory).
- Phone: input prefixed with fixed `+91` chip. Sanitise on paste — strip `+91`, `0091`, leading `0`, spaces, dashes. Validate exactly 10 digits starting with `[6-9]`. Show inline error and disable Save when invalid.
- Name: mandatory with inline error.

## 8. Bookings page polish + step workflow
- Replace big stat header with small chips (see #6).
- In booking detail, replace single "Mark as delivered" with a 3-step status track:
  1. **Saree Received** (default on create)
  2. **Prepleat/Drape Done**
  3. **Delivered**
- Each step is a tappable check that locks in a timestamp. Delivered step requires zero balance — if balance > 0, show confirmation: "Balance ₹X pending. Mark as paid + delivered?" → on confirm, auto-add a payment for the balance using the default payment mode, then mark delivered.
- Store: extend `Booking` with `receivedAt`, `workDoneAt`, `deliveredAt` (existing `completedAt` retained for compatibility). Migration v6 backfills `receivedAt = createdAt`, and if `status === "delivered"` set `deliveredAt = completedAt`.

## Technical notes
- Store version bump → `v6`. Migration adds new timestamps and keeps existing data intact.
- PDF: only currency formatter changes (`Rs. ` prefix inside PDF helper); app UI keeps `₹` via existing `fmtINR`.
- No backend/schema changes — all client-side (Zustand persist).

## Out of scope
- Server-side bill storage, automated WhatsApp delivery (still uses `wa.me` deep link), photo upload of measurements.

Reply **go** to proceed, or tell me which items to drop/reorder.
