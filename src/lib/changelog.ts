export const APP_VERSION = "1.3.6";

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
    version: "v1.3.6",
    date: "22 Aug 2026",
    isLatest: true,
    title: "Branded WhatsApp, In-App PDF Preview & Measurement Reset",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "💬",
        text: "Branded 'EYAS SAREE DRAPIST' Notifications",
        desc: "அனைத்து வாட்ஸ்அப் மெசேஜ்களிலும் முதலிலேயே 'EYAS SAREE DRAPIST' என தோன்றும். நிறைவு வாசகமாக 'Wear with confidence & elegance!' சேர்க்கப்பட்டுள்ளது.",
      },
      {
        emoji: "📑",
        text: "In-App PDF Invoice Preview Modal",
        desc: "Bills Register மற்றும் Booking பக்கத்தில் பில் PDF-ஐ உடனே பார்த்து, Print, Download அல்லது WhatsApp-ல் பகிரும் முழுமையான Preview வசதி.",
      },
      {
        emoji: "📐",
        text: "Measurement 'Reset Defaults' Button",
        desc: "New Booking-ல் தவறுதலாக ஏதேனும் அளவீட்டை நீக்கினாலோ மாற்றினாலோ ஒரே கிளிக்கில் அசல் அளவீடுகளை மீட்டெடுக்கும் வசதி.",
      },
      {
        emoji: "✨",
        text: "Modern Customer Action Buttons",
        desc: "Customer பக்கத்தில் '+ New Saree Booking' மற்றும் WhatsApp, Call, SMS பட்டன்கள் புதிய நேர்த்தியான தோற்றத்திற்கு மேம்படுத்தப்பட்டது.",
      },
    ],
  },
  {
    version: "v1.3.5",
    date: "22 Aug 2026",
    title: "Smart 3-Stage Pre-Pleat WhatsApp Lifecycle (Collection, Ready & Delivery)",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "📦",
        text: "Stage 1: Saree Collection Confirmation",
        desc: "புதிய Pre-Pleat புக்கிங் போடும் போது புடவை பாதுகாப்பாக பெறப்பட்டது, பில் எண் & டெலிவரி நேரத்துடன் WhatsApp அனுப்பும் வசதி.",
      },
      {
        emoji: "🥻",
        text: "Stage 2: Saree Ready for Pickup (Silent / WhatsApp)",
        desc: "புடவை மடித்து தயாரானவுடன் வாடிக்கையாளருக்கு கடை லொகேஷனுடன் WhatsApp அனுப்பலாம் அல்லது Silent-ஆக Ready பேட்ஜ் போடலாம்.",
      },
      {
        emoji: "💛",
        text: "Stage 3: Saree Delivered & Thank You Receipt",
        desc: "ஆர்டரை Complete செய்யும் போது வாடிக்கையாளருக்கு முழு கணக்குத் தீர்வு, நன்றி மற்றும் போட்டோ பகிரும் வாழ்த்து WhatsApp செய்தி அனுப்பும் வசதி.",
      },
    ],
  },
  {
    version: "v1.3.4",
    date: "22 Aug 2026",
    title: "Booking Draft Retention, Amount-Smart Complete & Chronological Bill Re-indexing",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "📝",
        text: "Booking Draft Auto-Retention (டிராஃப்ட் சேமிப்பு)",
        desc: "New Booking போடும் போது வேறு பக்கங்களுக்கு சென்று திரும்பினாலும் நீங்கள் உள்ளிட்ட அனைத்து விவரங்களும் அப்படியே இருக்கும்.",
      },
      {
        emoji: "💰",
        text: "Amount-Smart Complete Buttons (தொகை உறுதி பட்டன்)",
        desc: "Complete செய்யும் போது Confirm பட்டனிலேயே வசூலிக்கும் தொகை தெளிவாகக் காட்டும் ('Collect ₹500 & Complete ✓').",
      },
      {
        emoji: "🧾",
        text: "Chronological Sequential Bills (#1 to #N)",
        desc: "அனைத்து பழைய மற்றும் புதிய பில்களும் #1 முதல் #N வரை வரிசையாக வரிசைப்படுத்தப்பட்டு, சமீபத்திய பில் எப்போதுமே Bills பக்கத்தின் உச்சியில் தோன்றும்.",
      },
    ],
  },
  {
    version: "v1.3.3",
    date: "22 Aug 2026",
    title: "Unique Bill Numbers, Full Bills Hub, Dynamic Nav & Android Notification Fix",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "🧾",
        text: "Unique & Non-Duplicating Bill Numbers",
        desc: "பழைய தேதிகள் அல்லது முந்தைய பில்களுடன் எவ்வித எண் மோதலும் (duplicate #1) ஏற்படாதவாறு, தொடர்ச்சியான தனித்துவமான பில் எண்கள்.",
      },
      {
        emoji: "📑",
        text: "Dedicated Full Bills Register Page (/bills)",
        desc: "பாப்-அப் இல்லாமல் தனியான முழு பக்கமாக Bills Hub! பில் எண்களின் வரிசைப்படி தேடல், Due/Paid வடிகட்டல், நேரடி WhatsApp மற்றும் Call வசதி.",
      },
      {
        emoji: "⚙️",
        text: "Elevated Dynamic Center Nav Button",
        desc: "Bills பக்கத்திற்கு செல்லும்போது மட்டும் Center ஐகான் Highlight ஆகும். Bills பக்கத்தில் இருக்கும் போது அது தானாக Settings (⚙️) ஐகானாக மாறும்.",
      },
      {
        emoji: "🔔",
        text: "Android Push Notification Icon Fix & Reminder Banner",
        desc: "Android-ல் சரியான ஆப் லோகோவுடன் கூடிய Notification, மற்றும் முதன்முறை வருபவர்களுக்கு மட்டுமே காட்டும் சிறிய Reminder Banner.",
      },
    ],
  },
  {
    version: "v1.3.2",
    date: "22 Aug 2026",
    title: "Push Notifications Switch, Flexible Complete Payments & Clean Revert",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "🔔",
        text: "Browser Notifications ON/OFF Switch (நோட்டிபிகேஷன் ஸ்விட்ச்)",
        desc: "Settings பக்கத்தில் Push Notification-ஐ ஆன் / ஆஃப் செய்ய iOS-Style Toggle Switch மற்றும் What's New பாப்-அப்பில் 1-Tap Opt-In வசதி.",
      },
      {
        emoji: "✅",
        text: "Flexible Mark as Complete (பணம் வாங்குதல் & நிலுவை தேர்வு)",
        desc: "புக்கிங்கை Complete செய்யும் போது Full Payment, Custom/Partial தொகை, அல்லது பணம் வாங்காமல் ₹0 என நிலுவையில் வைக்கும் (Keep Due) 3 தேர்வுகள்.",
      },
      {
        emoji: "🟢",
        text: "Clean Revert to Active Bookings (மீண்டும் புக்கிங்காக மாற்றுதல்)",
        desc: "Complete செய்த புக்கிங்கை Revert செய்யும் போது, தானியங்கி கணக்குகள் சரியாக நீக்கப்பட்டு மீண்டும் Active Bookings பட்டியலில் தோன்றும்.",
      },
      {
        emoji: "🧾",
        text: "Balanced Bottom Navigation Bar",
        desc: "கீழ் Navbar-ல் Center Bill ஐகான் எப்போதும் Highlight ஆகாமல், மற்ற 4 ஐகான்களுடன் நேர்த்தியாகவும் சீராகவும் ஒருங்கிணைக்கப்பட்டுள்ளது.",
      },
    ],
  },
  {
    version: "v1.3.1",
    date: "21 Aug 2026",
    title: "Month Timeline, Scrolling Summary Tickers & 1-Day Advance Alerts",
    changes: [
      {
        emoji: "⏳",
        text: "Chronological Month Timeline (மாத டைம்லைன்)",
        desc: "Active மற்றும் Past புக்கிங்குகள் இடதுபக்க Timeline Line & Glowing Milestone Nodes வழியாக மாதவாரியாக அழகாக இணைக்கப்பட்டுள்ளன.",
      },
      {
        emoji: "🔄",
        text: "Scrolling Month Summary Tickers",
        desc: "ஒவ்வொரு மாத Header-லும் Orders எண்ணிக்கை, Sarees எண்ணிக்கை, Total Billed மற்றும் Pending Due வினாடிக்கு ஒருமுறை சுழன்று மாறும் அனிமேஷன்.",
      },
      {
        emoji: "🔔",
        text: "1-Day-Before Event Delivery Alert",
        desc: "நாளை டெலிவரி செய்ய வேண்டிய புக்கிங்குகள் இருந்தால் Top Header-ல் Amber நிறத்தில் 1 நாள் முன்கூட்டியே நினைவூட்டும் வசதி.",
      },
      {
        emoji: "📊",
        text: "Summary Business Analytics",
        desc: "Payments Summary பக்கத்தில் PrePleat vs Direct Drape சதவீத பார், Top VIP வாடிக்கையாளர்கள், மற்றும் UPI vs Cash பிரிப்பு சேர்க்கப்பட்டுள்ளது.",
      },
    ],
  },
  {
    version: "v1.3.0",
    date: "21 Aug 2026",
    title: "Continuous Activity Feed, Short Bill Numbers & Booked Date",
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
