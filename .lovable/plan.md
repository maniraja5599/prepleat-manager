
This is a large scope (20 items). I'll split into 4 phases so each ships working and verifiable. Confirm the order and I'll start with Phase 1.

## Phase 1 — Foundations (Cloud + Auth + Data model)

Enable **Lovable Cloud** so we can do Gmail login, Guest login, cloud sync, exports, and (later) automatic WhatsApp/email reminders.

- **Auth**: Email/password + **Google (Gmail) sign-in** + **Guest mode** (anonymous session that can later upgrade to Gmail without losing data).
- **DB tables**: `profiles`, `customers`, `artists`, `bookings`, `payments`, `measurements`, `settings`, `activity_log` (for undo/redo + change history), `reminders`.
- **RLS**: every row scoped to `auth.uid()`.
- **Migration**: one-time push of existing localStorage data to Cloud on first login.
- **Export**: CSV download for bookings / customers / payments from Settings.

## Phase 2 — Booking & Calendar UX (items 1, 4, 5, 6, 9, 13, 14)

- **Smart date conflict hint** when picking a date already booked ("2 bookings on this date — still book?").
- **Swipeable date & month picker** (left/right), 12-hr time format with AM/PM, with a tiny inline tip the first time.
- **Measurements + Payment toggles** — optional; skip if off. Quick review shows whatever was filled.
- **Customer picker**: existing-customer chip row + smart fuzzy suggestions while typing; "+ New customer" inline.
- **Client vs Artist booking**: each booking has `booked_by: client | artist`. Customers page gets two tabs: **Clients** and **Artists**.
- **Calendar**: week starts **Sunday**, swipe months, long-press = quick peek popover, double-tap = jump to New Booking for that date, full month event list under the grid.
- **Upcoming events tab** on home + "Add to Google Calendar" deep link per booking.

## Phase 3 — Payments, WhatsApp, PDF (items 2, 7, 12)

- **WhatsApp share**: use `whatsapp://send` + `intent://` fallback so it opens the **app directly** (no browser tab). Message template includes business name, itemized amounts, balance, website https://eyasdrapist.shop/, and 2–3 tasteful emojis (🧵 💛 ✨).
- **Payment entry**: note field + **mode selector** (GPay / Cash / Other) with default configurable in Settings.
- **Bill generator**: one tap → choose **PDF / Image / Plain text** → share sheet → WhatsApp.

## Phase 4 — Settings, Theme, Reports, Polish (items 3, 8, 10, 11, 15, 16, 17, 18, 19, 20)

- **Settings redesign**: tabbed (Business · Services · Measurements · Theme · Payments · Data · About) with colored icons; per-section reset buttons (no global reset).
- **Themes**: 6 new presets + **Custom theme** (primary/bg pickers, live preview). All tokens stay consistent.
- **UI revamp**: card-based header, refined typography, active-tab pill in bottom nav, smoother transitions. Filters on Bookings collapse into a smart chip that expands.
- **Toasts**: replace blocking toasts with a subtle inline "Saved ✓" pill near the action button (non-intrusive).
- **Growth dashboard**: weekly/monthly bar chart (revenue, bookings, sarees), top customers, pending collections, completion rate. Built with `recharts`.
- **Activity log + Undo**: every create/update/delete writes to `activity_log`; deleted bookings can be restored for 7 days; edits show "changed from X → Y".
- **Footer credit**: "Developed by **ManiRaja**" → https://www.instagram.com/maniraja__/

## Verification checklist (item 20)

After each phase I'll:
1. Run the build.
2. Open the preview at mobile 390×844 and walk the changed flows.
3. Check console + network for errors.
4. Report back what I tested.

---

### Two quick decisions I need from you before Phase 1:

1. **Profiles table**: Do you want a user profile (display name, business name, avatar per user)? — recommended **yes** so multiple staff could log in to the same shop later.
2. **Guest mode behavior**: Should guest data **auto-upload** to their account when they later sign in with Gmail? — recommended **yes**.

Reply "go" to start Phase 1, or tell me to reorder / drop anything.
