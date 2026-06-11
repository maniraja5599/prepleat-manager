# Refinement Pass — 15 fixes

Grouping the 15 items by area so the work stays coherent. All changes are mobile-first.

## 1. App boot & stability
- **First-load blank screen**: SSR hydration race — the auth gate renders `null` until session resolves, causing a black flash. Fix: render a lightweight splash (logo + spinner) during auth check in `_authenticated/route.tsx` so users see content immediately, no manual refresh needed.
- **Long-press text selection on calendar**: add `select-none`, `touch-callout: none`, and `-webkit-user-select: none` to calendar day cells so long-press doesn't trigger the iOS/Android copy menu.

## 2. Calendar (item 2, 9)
- Replace "Today" pill in the center of the header with the **current month + year label** that updates as you swipe.
- Add a small **eye icon** above the calendar to toggle payment-on-calendar visibility (replaces the settings toggle for quick access).
- Add a separate **"Today"** button (jumps back to today's date).
- Keep swipe day/month navigation already added.

## 3. Bookings list & detail (items 3, 7, 11, 12, 14, 15)
- **Remove "Calendar sync"** button from bookings page.
- **Unique bill number**: generate sequential `EYAS-YYYYMM-NNNN` on booking creation, store on booking, show on detail & PDF.
- **Payment auto-updates bill**: when payment recorded, bill number is preserved but status badge (Paid / Partial / Pending) refreshes live.
- **Cancel booking**: add a "Cancel booking" action (sets `status: cancelled`, keeps record, removes from active counts). New status added to type.
- **Payment record click**: tapping a payment row opens a sheet showing amount, mode, date/time, note, and a delete button.
- **Date/time pickers**: replace arrow-based steppers with horizontal scroll-snap sliders (left/right swipe = one day / one 30-min slot). Same control style as the measurement slider.
- **Measurement ON/OFF toggle**: switch at the top of the measurements section — off = collapsed, no values saved; on = expand and save to customer.
- **Artist bookings**: when a booking is created for an `artist` customer, show a small gold "Artist" chip on the card in the list and a distinct accent on the detail page.

## 4. New booking quick notes (item 13)
- Under notes, add chip buttons: **Bride, Bridesmaid, Baby ceremony, Engagement, Reception, Function, Other**. Tap appends to the notes field.
- Settings → add an "Occasion presets" editor so the owner can add/rename/delete chips.

## 5. Customers — WhatsApp + SMS (item 4)
- Rewrite the reminder template: friendlier tone, 3-4 tasteful emojis (🌸 ✨ 📍), business name, balance line, and the configured `websiteUrl`.
- Next to the WhatsApp button add a direct **SMS** button (`sms:` deep link) with the same message.

## 6. Themes (item 5)
- Audit each preset (`maroon, midnight, emerald, royal, rose, sand, charcoal, gold`): ensure `--primary`, `--primary-foreground`, `--accent`, button hover, and ring colors are all defined per theme so buttons stay legible. Fix gold theme (red button bug).
- Expand **Custom theme** to pick: Primary, Accent, Background, Card, and Foreground — each with a color input. Stored in `settings.customColors`.

## 7. PDF bill (item 6)
- Use `jspdf` + `jspdf-autotable` to build a branded bill:
  - Header: logo (from `settings.logoDataUrl`), business name, website, bill number, date.
  - Customer block, itemized service table (qty × price), totals, advance, balance, status stamp ("PAID" / "BALANCE DUE").
  - Footer: thank-you line + website + "Developed by ManiRaja" small print.
- Replace the current browser-print flow with a direct download / share.

## 8. Settings page order (item 10)
Reorder mobile rail to: **Prices → Business → Occasions → Theme → Data → Account → Activity → Trash**.

## 9. Shortcuts (item 8)
- Home: add quick buttons → New booking, Today's deliveries, Pending balance, Inbox.
- Bookings detail: WhatsApp / SMS / PDF / Edit / Cancel as primary row.

## Technical notes
- New booking field: `billNumber: string`, `status` adds `"cancelled"`.
- Store migration bumps to v5: backfill bill numbers for existing bookings.
- New settings fields: `occasionPresets: string[]`, `customColors?: { primary, accent, background, card, foreground }`.
- Calendar header becomes a small state machine reacting to swipe / today button.
- PDF generation runs client-side; install `jspdf` and `jspdf-autotable`.

## Out of scope for this pass
- WhatsApp Cloud API automation (still manual deep-link).
- Server-side bill storage (bill number lives on the booking record only).

Reply **ok** to proceed, or tell me which items to drop / reorder.