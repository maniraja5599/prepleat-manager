export const APP_VERSION = "1.3.0";

export interface ChangelogEntry {
  version: string;
  date: string;
  isLatest?: boolean;
  title: string;
  badge?: string;
  changes: { emoji: string; text: string; desc?: string }[];
}

export const RECENT_UPDATES: ChangelogEntry[] = [
  {
    version: "v1.3.0",
    date: "21 Aug 2026",
    isLatest: true,
    title: "Continuous Activity Feed, Short Bill Numbers & Booked Date",
    badge: "NEW UPDATE 🚀",
    changes: [
      {
        emoji: "⚡",
        text: "Continuous Recent Activity (நேரலை நிகழ்வுகள்)",
        desc: "Search box-ல் அனைத்து சமீபத்திய Bookings & Payments விவரங்களும் வாடிக்கையாளர் பெயருடன் ஒரே தொடர்ச்சியான காலவரிசை (Timeline) ஸ்ட்ரீமாகத் தோன்றும்.",
      },
      {
        emoji: "🧾",
        text: "Smart Short Bill Numbers (#1, #42, #105)",
        desc: "இனி புதிய பில்கள் எளிய, சிறிய எண்களில் (#1, #2, #46) உருவாகும். பழைய பில்களுடன் எவ்வித மோதலும் இல்லாமல் எளிதாக நினைவில் வைக்கலாம்.",
      },
      {
        emoji: "📅",
        text: "Compact 'Booked on' Date Tag",
        desc: "ஆர்டர் எப்போது எடுக்கப்பட்டது (Booked Date) என்ற விவரம் அனைத்து கார்டுகளிலும் டெலிவரி தேதியுடன் சிறிய badge-ஆக சேர்க்கப்பட்டுள்ளது.",
      },
      {
        emoji: "🔔",
        text: "Instant What's New Updates Notice",
        desc: "புதிய updates வரும்போது மட்டுமே ஒருமுறை தெளிவாக காட்டும் புதிய Announcement Pop-up.",
      },
    ],
  },
  {
    version: "v1.2.0",
    date: "16 Aug 2026",
    title: "Text Scaling & Live Payment Sync",
    changes: [
      {
        emoji: "📱",
        text: "Display Font Size Scaling",
        desc: "Added 4-level text scale option (Compact 90%, Standard 100%, Large 110%, Extra Large 120%) with Live Preview.",
      },
      {
        emoji: "🚗",
        text: "Extra / Travel Charges Header",
        desc: "Added Travel/Delivery fee support in New Bookings, Payment Collection, Completion modal, and PDF invoices.",
      },
      {
        emoji: "💳",
        text: "Deep Real-time Payment Sync",
        desc: "In-place payment edit/delete with instant balance recalculation, fully-paid status transitions, and Firestore sync.",
      },
      {
        emoji: "↩️",
        text: "Safe Status Reversion",
        desc: "Revert completed or delivered orders back to active booking with confirmation prompt protection.",
      },
    ],
  },
  {
    version: "v1.1.5",
    date: "14 Aug 2026",
    title: "Mini Status Indicator & Live Recent Activity Feed",
    changes: [
      {
        emoji: "🔍",
        text: "Smart Global Search & Activity Log",
        desc: "Live 5-event recent activity timeline inside search popup and compact sync dot.",
      },
      {
        emoji: "🗂️",
        text: "Delivered & Completed Filter",
        desc: "Automatic segregation of completed orders into history view sorted with newest first.",
      },
      {
        emoji: "⚡",
        text: "Fast Navigation",
        desc: "Smooth, glitch-free vertical scrolling across all booking cards.",
      },
    ],
  },
  {
    version: "v1.1.0",
    date: "10 Aug 2026",
    title: "Smart Discount Validator & Measurement Grid",
    changes: [
      {
        emoji: "🏷️",
        text: "Discount Safeguard",
        desc: "Real-time warning if discount exceeds remaining due, preventing accidental negative balances.",
      },
      {
        emoji: "📏",
        text: "Custom Measurement Grid",
        desc: "Save custom hip, waist, and pallu measurements directly on individual customer profiles.",
      },
    ],
  },
];
