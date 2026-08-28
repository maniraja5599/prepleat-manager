export const APP_VERSION = "1.7.7";

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
    version: "v1.7.7",
    date: "28 Aug 2026",
    isLatest: true,
    title: "Completed Dues Default View, Safe Deletions & Enhanced Chart Inspection",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "📋",
        text: "Completed Work Pending Dues (Default View)",
        desc: "Pending Dues now defaults to showing delivered/completed jobs with outstanding balances, with instant filters for All Pending, Upcoming, and High Dues.",
      },
      {
        emoji: "🛡️",
        text: "Booking & Payments Deletion Safety Guard",
        desc: "Added smart safety confirmation warning that payments will be deleted, and provides a 1-tap option to Cancel Booking instead to keep financial records intact.",
      },
      {
        emoji: "📈",
        text: "Expanded Chart Height & Pinned Inspection Bar",
        desc: "Increased revenue chart height and added a pinned monthly detail bar that doesn't obscure the chart when tapped on mobile.",
      },
      {
        emoji: "🔄",
        text: "Instant Multi-Device Sync on Resume",
        desc: "Added visibility-change and extended startup auth resolution for seamless real-time sync across phones and computers with email login.",
      },
      {
        emoji: "📅",
        text: "Repositioned Calendar Hints & Smooth Month Bar Scroll",
        desc: "Moved date selection hints below the calendar grid and auto-scrolls the 12-month schedule bar comfortably to the left.",
      },
    ],
  },
  {
    version: "v1.7.6",
    date: "28 Aug 2026",
    isLatest: false,
    title: "Side-by-Side Financial Overview, Report Downloads & Large-Screen Fit",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "💳",
        text: "Dual Income/Expense Overview & Reports Download",
        desc: "Instant side-by-side Income & Expense metric boxes with 1-tap Download button on the Payments dashboard.",
      },
      {
        emoji: "📱",
        text: "Standardized Multi-Device Fit & Nav Clearance",
        desc: "Optimized Calendar and App layout with standardized phone bounds and ample bottom clearance on large screens like Samsung Galaxy Ultra / Edge.",
      },
      {
        emoji: "✨",
        text: "Centered Symmetry & Clean Quick Entry",
        desc: "Symmetrically centered financial metric cards in Summary sub-tabs and single clean Quick Entry floating trigger.",
      },
    ],
  },
  {
    version: "v1.7.5",
    date: "28 Aug 2026",
    isLatest: false,
    title: "12-Month Year-Round Calendar Schedule, Deep Financial Analytics & Micro Dots",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "📅",
        text: "12-Month Year-Round Calendar Schedule",
        desc: "Interactive year-round 12-month delivery forecast strip placed directly at the top of the Calendar page with live delivery counters for every month.",
      },
      {
        emoji: "📊",
        text: "Deep Multi-Year & Monthly Financial Analytics",
        desc: "Filter finances by year, compare Best vs Slowest performing months, inspect MoM margins, daily run-rate, and saree revenue realization.",
      },
      {
        emoji: "✨",
        text: "Sleek Single-Line Chart Header & Micro Dots",
        desc: "Compact unified single-line chart header and sleek micro-dots for smooth cumulative revenue curve visualization.",
      },
    ],
  },
  {
    version: "v1.7.4",
    date: "28 Aug 2026",
    isLatest: false,
    title: "Financial Sub-Tabs, 3-Month Calendar Forecast & Alphabet Directory",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "📊",
        text: "Categorized Financial Analytics Sub-Tabs",
        desc: "Organized Summary dashboard into 4 specialized sub-tabs: Overview & Margins, Saree Services, VIP Clients, and Payment Modes.",
      },
      {
        emoji: "📅",
        text: "3-Month Booking Forecast Chips",
        desc: "Quickly view upcoming bookings count for Current, Next, and 3rd month with instant 1-tap navigation directly in the Calendar header.",
      },
      {
        emoji: "🔤",
        text: "Alphabet Quick-Jump Customer Directory",
        desc: "Browse customers with a fast A-Z index bar, initial avatars, and 1-tap Call & WhatsApp shortcuts.",
      },
      {
        emoji: "📐",
        text: "Compact Low-Profile Financial Metric Boxes",
        desc: "Slim, streamlined stat boxes across Summary, Payments, and Pending Dues views.",
      },
    ],
  },
  {
    version: "v1.7.3",
    date: "28 Aug 2026",
    isLatest: false,
    title: "Cumulative Revenue Composed Chart, Soft Pastels & Seamless Ledger",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "📊",
        text: "Cumulative Revenue & Stacked Monthly Chart",
        desc: "Interactive financial chart displaying cumulative revenue growth line alongside monthly Income/Expense breakdown in a single stacked bar.",
      },
      {
        emoji: "🎨",
        text: "Soft & Clean Pastel Badges",
        desc: "Refined Bookings and Bills register with soft pastel service tags (Pre-Pleat, Drape, Artist) and clean minimal cards.",
      },
      {
        emoji: "💳",
        text: "Fast Transactions-First Ledger",
        desc: "Payments sub-tabs and recent entries appear immediately at the top, with unified 3-column stats in Pending Dues.",
      },
      {
        emoji: "📱",
        text: "iOS Mobile Number Typing & Paste",
        desc: "Enhanced phone input compatibility on iPhone preventing clipboard dialog blockages.",
      },
    ],
  },
  {
    version: "v1.7.2",
    date: "28 Aug 2026",
    isLatest: false,
    title: "Digital Bill Book, White-Label Branding & Revenue Trend Line",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "🧾",
        text: "Smart Digital Bill Book Cards",
        desc: "Redesigned bookings and bill register into distinct invoice ledger cards with bill badges, instant call/WhatsApp, and live payment status.",
      },
      {
        emoji: "🏷️",
        text: "100% White-Label Business Branding",
        desc: "All PDF invoices, rubber stamps, WhatsApp messages, and receipts dynamically adapt to your business name and brand logo from Settings.",
      },
      {
        emoji: "📈",
        text: "Monthly Revenue & Cashflow Trend",
        desc: "Enhanced financial summary with smooth revenue area and line charts, plus clean milestone highlights.",
      },
      {
        emoji: "🔔",
        text: "Delivered Today Header Ticker",
        desc: "Optimized notification bar with clear font visibility and smooth ticker transitions.",
      },
    ],
  },
  {
    version: "v1.7.1",
    date: "28 Aug 2026",
    isLatest: false,
    title: "Income/Expense Sub-Tabs, Clean Details & Earning Bar Chart",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "📊",
        text: "Monthly Earning Bar Chart",
        desc: "Added interactive monthly Income vs Expense comparison bar chart in Financial Summary.",
      },
      {
        emoji: "💳",
        text: "Income & Expense Sub-Tabs",
        desc: "Organized Payments into clean Income and Expense sub-tabs with quick search and clean essential details.",
      },
      {
        emoji: "✨",
        text: "Quick Review Modal Shield",
        desc: "Protected Quick Review sheet from any background calendar bleed-through.",
      },
    ],
  },
  {
    version: "v1.7.0",
    date: "28 Aug 2026",
    isLatest: false,
    title: "Firestore Sync Stability & Total Local Data Protection",
    badge: "PREVIOUS",
    changes: [
      {
        emoji: "🛡️",
        text: "Zero Data Loss Guarantee",
        desc: "Strengthened local-first data architecture and cloud snapshot merging so your client orders, payments, and rates are always preserved safely.",
      },
      {
        emoji: "☁️",
        text: "Firestore 12 Cache & Sync Fix",
        desc: "Resolved WebView IndexedDB multi-tab lock errors and simplified query execution across all devices.",
      },
    ],
  },
  {
    version: "v1.6.9",
    date: "28 Aug 2026",
    isLatest: false,
    title: "Quick Review Icon Fix & Order Completion Payment Sync",
    badge: "PREVIOUS",
    changes: [
      {
        emoji: "📅",
        text: "Quick Review Delivery Icon Fix",
        desc: "Fixed date icon in Quick Review bottom sheet to render cleanly without opening date picker elements.",
      },
      {
        emoji: "💳",
        text: "Atomic Completion Payment Sync",
        desc: "Guaranteed 100% mathematical precision and real-time synchronization between payment ledger and booking balance on order completion.",
      },
    ],
  },
  {
    version: "v1.6.8",
    date: "28 Aug 2026",
    isLatest: false,
    title: "Settings Navigation Overhaul: 4-Card Category Switcher & High-Contrast Sub-Sections",
    badge: "PREVIOUS",
    changes: [
      {
        emoji: "🎛️",
        text: "4-Card Settings Category Grid",
        desc: "Replaced flat setting pills with a modern 2x2 grid featuring icons, hints, active glowing badges, and instant category switching.",
      },
      {
        emoji: "📑",
        text: "High-Contrast Sub-Sections Bar",
        desc: "All setting sub-tabs now feature high-contrast gradient active pills, category guide headers, and smooth switching for effortless discovery.",
      },
    ],
  },
  {
    version: "v1.6.7",
    date: "28 Aug 2026",
    isLatest: false,
    title: "Finances Default Summary, Smart +Transaction, Instant Autofill & Android Keyboard Polish",
    badge: "PREVIOUS",
    changes: [
      {
        emoji: "📊",
        text: "Summary First on Finances",
        desc: "Finances page now opens directly to the Revenue & Summary analytics tab with a unified +Transaction drawer.",
      },
      {
        emoji: "⚡",
        text: "Instant Clipboard Auto-Fill",
        desc: "Instant 1-tap phone autofill without popups or extra confirmation dialogs.",
      },
      {
        emoji: "📱",
        text: "Android Keyboard Optimization",
        desc: "Removed autoFocus on modal inputs and improved keyboard responsiveness so bottom navigation never overlaps keyboard.",
      },
      {
        emoji: "✨",
        text: "Customer Display & Quick Review Polish",
        desc: "Prominent customer name styling, single-line mobile phone prompts, and structured Quick Review bottom sheet.",
      },
    ],
  },
  {
    version: "v1.6.6",
    date: "28 Aug 2026",
    isLatest: false,
    title: "Finances Dashboard, Pending Dues Ledger, Complete Payment Alerts & Header Ticker Polish",
    badge: "PREVIOUS",
    changes: [
      {
        emoji: "💰",
        text: "Finances Dashboard & Outstanding Dues",
        desc: "Renamed Payments to Finances with dedicated tabs for Payments Ledger, Pending Dues (all unpaid clients), and Revenue Analytics.",
      },
      {
        emoji: "🛡️",
        text: "Strict Payment Verification on Complete",
        desc: "Added verification alerts before marking orders complete to confirm Cash/GPay payment or preserve balance due.",
      },
      {
        emoji: "📜",
        text: "Slow-Scrolling Header Ticker & Micro-Typography",
        desc: "Refined notification pill with compact text-[8px] typography and continuous slow vertical text scrolling.",
      },
      {
        emoji: "📱",
        text: "Verified Android WhatsApp Integration",
        desc: "All WhatsApp receipt and reminder links verified for instant 1-tap dispatch on Android, iOS, and desktop browsers.",
      },
    ],
  },
  {
    version: "v1.6.5",
    date: "28 Aug 2026",
    isLatest: false,
    title: "International English UI, Timeline View, Smart Booking & Header Polish",
    badge: "PREVIOUS",
    changes: [
      {
        emoji: "🌐",
        text: "Global English-Only Interface",
        desc: "All buttons, dialogs, badges, and guides have been converted to clear, standard English for international boutique operations.",
      },
      {
        emoji: "⏳",
        text: "Vertical Delivery Timeline on Calendar",
        desc: "Day bookings now render as an elegant chronological vertical timeline with contact shortcuts, bill numbers, and balance status.",
      },
      {
        emoji: "✨",
        text: "Smart Booking Form & Optional Time / Advance",
        desc: "Added optional delivery time with 12-Hour AM/PM picker, optional advance payment toggle, grand total distinction, and in-place tag management.",
      },
      {
        emoji: "🛡️",
        text: "Single-Row Fixed Header (Zero Layout Shift)",
        desc: "Fixed header height without second-line wrapping jumps, displaying clean business date.",
      },
      {
        emoji: "📱",
        text: "1-Click Web App Install with Animated Guide",
        desc: "Animated installation feedback for Android Chrome and interactive 2-step Add-to-Home guide for iOS Safari.",
      },
    ],
  },
  {
    version: "v1.6.4",
    date: "28 Aug 2026",
    isLatest: false,
    title: "1-Click Web App Install, Double-Tap Calendar Book & Zero Popup Clutter",
    badge: "PREVIOUS",
    changes: [
      {
        emoji: "📱",
        text: "1-Click App Install & iOS Guide",
        desc: "Added 1-click home screen installation for Android and Safari Share -> Add to Home Screen guide for iPhone users.",
      },
      {
        emoji: "📅",
        text: "Calendar Double-Tap to Book",
        desc: "Double-tapping any date on the calendar immediately opens the new booking form for that specific delivery date.",
      },
      {
        emoji: "⚡",
        text: "Zero Startup Popup Clutter",
        desc: "Eliminated automatic startup popups so existing users only see relevant version releases.",
      },
    ],
  },
  {
    version: "v1.6.3",
    date: "24 Aug 2026",
    isLatest: false,
    title: "Smart Clipboard Phone Auto-Fill & Logo Settings Link",
    badge: "PREVIOUS",
    changes: [
      {
        emoji: "📋",
        text: "Smart Clipboard Auto-Fill",
        desc: "Automatically detects copied 10-digit mobile numbers from call logs or WhatsApp and fills with 1 tap.",
      },
      {
        emoji: "🏷️",
        text: "Direct Logo Tap to Settings",
        desc: "Tapping the header logo or business name opens Settings instantly.",
      },
    ],
  },
  {
    version: "v1.6.0",
    date: "24 Aug 2026",
    isLatest: false,
    title: "12-Hour AM/PM Time Selection & Enhanced Booking Editor",
    badge: "PREVIOUS",
    changes: [
      {
        emoji: "🕒",
        text: "Dedicated 12-Hour AM/PM Time Picker",
        desc: "ரயில்வே நேரம் (24-Hour) முழுமையாக அகற்றப்பட்டு, 1 முதல் 12 மணி வரை எளிதாக தேர்வு செய்யும் AM/PM பட்டன்கள் மற்றும் ஸ்டெப்பர் கண்ட்ரோல்கள் சேர்க்கப்பட்டது.",
      },
      {
        emoji: "⚡",
        text: "1-Tap Popular Delivery Presets",
        desc: "புடவை டெலிவரிக்கு அதிகம் பயன்படும் நேரங்களை (09:00 AM, 12:00 PM, 05:00 PM, 06:30 PM) ஒரே கிளிக்கில் தேர்வு செய்யும் வசதி.",
      },
      {
        emoji: "📝",
        text: "Smooth Booking Edit Experience",
        desc: "புக்கிங் எடிட் மற்றும் புதிய புக்கிங் உருவாக்கும் போது மொபைல் திரையில் குழப்பமில்லாமல் நேரம் மாற்றி அமைக்கும் நவீன வடிவமைப்பு.",
      },
    ],
  },
  {
    version: "v1.5.9",
    date: "24 Aug 2026",
    isLatest: false,
    title: "Firebase Android Configuration & Google Play Services Verified",
    badge: "PREVIOUS",
    changes: [
      {
        emoji: "🛡️",
        text: "Official google-services.json Connected",
        desc: "Firebase Android Credentials (SHA-1 & OAuth Web Client ID) வெற்றிகரமாக இணைக்கப்பட்டு, Google Play Services Native Sign-In முழுமையாக இயக்கப்பட்டது.",
      },
      {
        emoji: "⚡",
        text: "Direct 1-Tap Google Sign-In Active",
        desc: "பிரவுசர் ஓபன் ஆகாமல், போன் திரையிலேயே கூகுள் கணக்கை தேர்வு செய்து நொடியில் ஆப் திறக்கும் வசதி உறுதிப்படுத்தப்பட்டது.",
      },
    ],
  },
  {
    version: "v1.5.8",
    date: "24 Aug 2026",
    isLatest: false,
    title: "Native Android Google Sign-In via Google Play Services",
    badge: "PREVIOUS",
    changes: [
      {
        emoji: "🚀",
        text: "Native 1-Tap Google Account Picker",
        desc: "பிரவுசருக்கு செல்லாமல் உங்கள் மொபைல் திரையிலேயே கூகுள் கணக்குகளை காட்டி 1 நொடியில் லாகின் செய்யும் Native Google Play Services Authentication இணைக்கப்பட்டுள்ளது.",
      },
      {
        emoji: "⚡",
        text: "Zero-Redirect In-App Token Sync",
        desc: "பிரவுசர் Redirect மற்றும் Storage Partitioning பிழைகள் ஏதுமின்றி நேரடியாக ஆப்-க்குள் லாகின் ஆகும் வகையில் கட்டமைக்கப்பட்டுள்ளது.",
      },
    ],
  },
  {
    version: "v1.5.7",
    date: "24 Aug 2026",
    isLatest: false,
    title: "Official Eyas Drapist High-Res App Icon & Launcher Branding",
    badge: "PREVIOUS",
    changes: [
      {
        emoji: "🎨",
        text: "Official Eyas Drapist App Icon & Adaptive Launcher",
        desc: "அனைத்து ஆண்ட்ராய்டு போன்களிலும் (HD, FHD, 2K, 4K) தெளிவாக தெரியும் வகையில் அசல் Eyas Drapist லோகோவுடன் கூடிய புதிய Launcher Icon மற்றும் Splash Screen உருவாக்கப்பட்டது.",
      },
      {
        emoji: "📱",
        text: "Adaptive Icon & Round Icon Support",
        desc: "Android 8 முதல் Android 14/15 வரையிலான அனைத்து Launcher வடிவங்களுக்கும் (Circle, Squircle, Rounded Square) ஏற்றவாறு ஐகான் பேக் செய்யப்பட்டது.",
      },
    ],
  },
  {
    version: "v1.5.6",
    date: "24 Aug 2026",
    isLatest: false,
    title: "Enhanced Mobile Auth, Intent-Filter Deep Links & Quick Guest Mode",
    badge: "PREVIOUS",
    changes: [
      {
        emoji: "🔐",
        text: "Direct In-App Email & Password Auth",
        desc: "மொபைல் ஆப்-க்குள் பிரவுசருக்கு செல்லாமல் உடனே லாகின் / அக்கவுண்ட் உருவாக்கும் வசதி மற்றும் பாஸ்வேர்டு பார்க்கும் கண் ஐகான் சேர்க்கப்பட்டுள்ளது.",
      },
      {
        emoji: "⚡",
        text: "1-Tap Instant Guest Access",
        desc: "எந்தவொரு லாகின் தேவையும் இன்றி உடனே ஆப்பை பயன்படுத்தி பில்லிங் மற்றும் புடவை கணக்குகளை பராமரிக்கும் வசதி.",
      },
      {
        emoji: "🌐",
        text: "Google Auth Redirect Handler & Deep Linking",
        desc: "ஆப் மற்றும் பிரவுசர் இடையில் சீரான தகவல் தொடர்புக்கு Android Intent Filter மற்றும் Google Auth Redirect Listener சேர்க்கப்பட்டது.",
      },
    ],
  },
  {
    version: "v1.5.5",
    date: "24 Aug 2026",
    isLatest: false,
    title: "Settings Sub-Tabs Architecture, Top Account Bar & WhatsApp Previews",
    badge: "PREVIOUS",
    changes: [
      {
        emoji: "🗂️",
        text: "Modular Settings Sub-Tabs Architecture",
        desc: "செட்டிங்ஸ் பக்கம் குழப்பமில்லாமல் Shop & Logo, Theme Colors, Font & Clock, Saree Rates, Measurements, WhatsApp Previews, மற்றும் Backup & Reset என தனித்தனி சப்-டேப்களாக மாற்றப்பட்டது.",
      },
      {
        emoji: "👤",
        text: "Direct Top Account & Logout Card",
        desc: "செட்டிங்ஸ் மேலே நேரடியாக உங்களின் Google மின்னஞ்சல் மற்றும் 1-Tap Logout / Sign In பட்டன் வைக்கப்பட்டுள்ளது.",
      },
      {
        emoji: "💬",
        text: "WhatsApp Chat Bubble Live Previews",
        desc: "ஆர்டர் உறுதிப்படுத்தல், புடவை ரெடி அலர்ட், மற்றும் கட்டணம் ரசீதுகள் WhatsApp-ல் எப்படி செல்லும் என்பதை காட்டும் நேரலை முன்னோட்டம் மற்றும் 1-Tap Sample Copy வசதி.",
      },
      {
        emoji: "🎯",
        text: "Smooth Touch & Staff Tab Cleanup",
        desc: "தேவையில்லாத Staff Tab நீக்கப்பட்டு, தவறுதலாக பக்கங்கள் மாறுவதைத் தடுக்க Swipe Tab Change முடக்கப்பட்டது.",
      },
    ],
  },
  {
    version: "v1.5.4",
    date: "24 Aug 2026",
    isLatest: false,
    title: "Enhanced Interactive Onboarding & Contextual Micro-Tips",
    badge: "PREVIOUS",
    changes: [
      {
        emoji: "🌟",
        text: "Interactive Onboarding Guide & Secret Gestures",
        desc: "புதிய பயனர்களுக்கான வெல்கம் மாடலில் கேலெண்டர் பயன்பாடு, கலர் புள்ளிகள் (PrePleat, Drape, Artist), மற்றும் கீழ் Calendar ஐகானை Double Tap செய்தால் Global Search திறக்கும் குறுக்குவழிகள் தெளிவாக சேர்க்கப்பட்டுள்ளது.",
      },
      {
        emoji: "💡",
        text: "Contextual Dismissible Micro-Tips",
        desc: "Calendar, Bookings, Bills, New Booking, மற்றும் Customers பக்கங்களில் தேவையான இடங்களில் சுருக்கமான, பயனுள்ள 💡 Pro-Tip பதாகைகள் சேர்க்கப்பட்டுள்ளன.",
      },
    ],
  },
  {
    version: "v1.5.3",
    date: "23 Aug 2026",
    title: "Quick Tips, Demo Data Onboarding & 5-Sub-Tabs Settings",
    changes: [
      {
        emoji: "💡",
        text: "Smart Micro-Tips & Shortcuts Helper",
        desc: "Header-ல் புதிய 💡 Tips பட்டன்! Gestures, 1-Tap Canvas Invoices, WhatsApp Fast Share மற்றும் Keyboard குறுக்குவழிகள் எளிய தமிழில்.",
      },
      {
        emoji: "📦",
        text: "First-Time User Demo Data Onboarding",
        desc: "புதிய பயனர்கள் App-ஐத் திறக்கும்போது மாதிரி புக்கிங் & பில்களை லோட் செய்து உடனடியாக சோதித்துப் பார்க்கும் புதிய Welcome Onboarding வசதி.",
      },
      {
        emoji: "⚙️",
        text: "Settings 5-Sub-Tabs Architecture",
        desc: "நீளமான Settings பக்கம் 5 நேர்த்தியான Sub-Tabs (🏢 Profile, 💰 Rates, 💬 WhatsApp, 👥 Staff, 🔒 Security) ஆக மாற்றப்பட்டு மொபைலில் Full-width அனுபவம் வழங்குகிறது.",
      },
    ],
  },
  {
    version: "v1.5.2",
    date: "23 Aug 2026",
    title: "Sticky Fixed Search Bar & Docked Month Headers",
    changes: [
      {
        emoji: "🔍",
        text: "Sticky Unified Search & Control Bar",
        desc: "Bookings மற்றும் Bills பக்கங்களில் கீழே ஸ்க்ரோல் செய்யும்போது, Search Box மற்றும் Filters திரையின் மேற்பகுதியில் (Company Header-க்கு கீழே) Fixed ஆக நிற்கும்.",
      },
      {
        emoji: "📅",
        text: "Docked Month Timeline Headers",
        desc: "மாதத் தலைப்புகள் அந்த Search Box-க்குக் கீழே சரியாக இணைக்கப்பட்டு, அடுத்த மாதம் வரும் வரை அங்கே நிலையாக நிற்கும்.",
      },
    ],
  },
  {
    version: "v1.5.1",
    date: "22 Aug 2026",
    title: "iOS Safe Area & WebKit Dynamic Sticky Month Headers",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "🍎",
        text: "Full iOS & Android Safe Area Adaptation",
        desc: "iPhone Notch / Dynamic Island மற்றும் WebKit விதிகளுக்கு ஏற்ப, -webkit-sticky மற்றும் env(safe-area-inset-top) துல்லியமாக இணைக்கப்பட்டு iOS மற்றும் Android இரண்டிலும் Sticky Month Headers அச்சு அசலாக வேலை செய்யும்படி மேம்படுத்தப்பட்டுள்ளது.",
      },
    ],
  },
  {
    version: "v1.5.0",
    date: "22 Aug 2026",
    title: "Sticky Fixed Month Timeline Headers",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "📌",
        text: "Sticky Month Timeline Headers",
        desc: "Bookings மற்றும் Bills பக்கங்களில் கீழே ஸ்க்ரோல் செய்யும்போது, அந்த மாதத்தின் தலைப்பு (Month Header & Stats Ticker) அடுத்த மாதம் வரும் வரை திரையின் மேல்பகுதியில் நிலையாக (Sticky Fixed) ஒட்டிக்கொண்டு இருக்கும் வசதி சேர்க்கப்பட்டுள்ளது.",
      },
    ],
  },
  {
    version: "v1.4.9",
    date: "22 Aug 2026",
    title: "Keyboard Auto-Hide for Bottom Nav & Payments",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "⌨️",
        text: "Smart Keyboard Auto-Hide",
        desc: "மொபைலில் ஏதேனும் டைப் செய்ய கீபோர்டு திறக்கும்போது, கீழ்ப்பகுதி நேவிகேஷன் மற்றும் பேமெண்ட் பார் திரையை மறைக்காமல் தானாக மறைந்து கொள்ளும் வசதி சேர்க்கப்பட்டுள்ளது.",
      },
    ],
  },
  {
    version: "v1.4.8",
    date: "22 Aug 2026",
    title: "Instant Native Canvas PDF/Image Generator & Smart Rubber Seal",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "⚡",
        text: "Zero-Lag Native Canvas PDF & Image Export",
        desc: "முழுக்க முழுக்க Native HTML5 Canvas முறையில் எந்தவிதமான தாமதமோ (0ms Freeze) பிழையோ இன்றி திரையில் பார்க்கும் அசல் Tax Invoice மற்றும் சீல் 100% துல்லியமாக PDF மற்றும் PNG படமாக உடனுக்குடன் பதிவிறக்கப்படும்.",
      },
      {
        emoji: "🏷️",
        text: "Smart Rubber Stamp Wording",
        desc: "ரப்பர் சீல் வாசகங்கள் 'PAID & VERIFIED · 100% RECEIVED', 'ADVANCE RECEIVED · PAY ON DELIVERY' என மிக நேர்த்தியாகவும் அதிகாரப்பூர்வமாகவும் மாற்றப்பட்டுள்ளன.",
      },
    ],
  },
  {
    version: "v1.4.7",
    date: "22 Aug 2026",
    title: "Compact Rubber Stamp Seal & Save as PNG Image",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "🏷️",
        text: "Compact Rubber Stamp Seal",
        desc: "ரப்பர் சீல் அளவு நேர்த்தியாகக் குறைக்கப்பட்டு மிகச் சிறிய அழகிய முத்திரையாக மாற்றப்பட்டுள்ளது.",
      },
      {
        emoji: "📸",
        text: "Save as Invoice Image (PNG)",
        desc: "Preview திரையில் புதிய 'Save Image' பொத்தான் சேர்க்கப்பட்டு வாடிக்கையாளருக்கு படமாக அனுப்பும் வசதி உருவாக்கப்பட்டுள்ளது.",
      },
    ],
  },
  {
    version: "v1.4.6",
    date: "22 Aug 2026",
    title: "100% WYSIWYG Invoice PDF Download (Matches Screen Preview 1:1)",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "📄",
        text: "Direct High-Res Screen Matching PDF Export",
        desc: "Download PDF பட்டனை அழுத்தும்போது திரையில் பார்க்கும் அதே வண்ணமயமான Tax Invoice மற்றும் ரப்பர் சீலுடன் கூடிய அசல் பில் 100% துல்லியமாக PDF ஃபைலாகப் பதிவிறக்கப்படும்.",
      },
    ],
  },
  {
    version: "v1.4.5",
    date: "22 Aug 2026",
    title: "Refined Rubber Stamp Seal (Single Line Header & No Date)",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "🏷️",
        text: "Refined Rubber Stamp Seal",
        desc: "ரப்பர் சீலில் நிறுவனப் பெயர் நட்சத்திரக் குறியீடு அடுத்த வரிக்குச் செல்லாமல் ஒரே வரியில் நேர்த்தியாக அமைக்கப்பட்டதுடன், சீலில் இருந்து தேதி நீக்கப்பட்டு அசல் அதிகாரப்பூர்வ முத்திரை வடிவம் பெறப்பட்டது.",
      },
    ],
  },
  {
    version: "v1.4.4",
    date: "22 Aug 2026",
    title: "Bills Timeline View & Instant Visual Invoice Preview",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "📄",
        text: "Direct Instant Invoice Preview",
        desc: "PDF Bill க்ளிக் செய்தவுடன் 'Open' பொத்தான் தேவையின்றி, அனைத்து மொபைல் மற்றும் கணினிகளிலும் அழகான ஒரிஜினல் Tax Invoice நேரடியாக உடனடியாக திரையில் தெரியும்.",
      },
      {
        emoji: "⏳",
        text: "Monthly Timeline in Bills Register",
        desc: "Bookings பக்கத்தில் இருப்பது போல், Bills Register பக்கத்திலும் மாத வாரியாக Timeline Milestone மற்றும் விரிவான பில் புள்ளிவிவரங்களுடன் கூடிய காலவரிசை அமைப்பு உருவாக்கப்பட்டுள்ளது.",
      },
    ],
  },
  {
    version: "v1.4.3",
    date: "22 Aug 2026",
    title: "Full Payment Booking Fix, Bills Register Card Click & PDF Preview",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "🥻",
        text: "Full Payment Booking Preservation",
        desc: "புதிய புக்கிங்கில் முழுத் தொகையையும் முன்கூட்டியே செலுத்தினாலும் புக்கிங் மறைந்துவிடாமல் ஆக்டிவ் பட்டியலில் இருக்கும்படி சரிசெய்யப்பட்டது.",
      },
      {
        emoji: "👆",
        text: "Bills Register Tap to View & Selection Lock",
        desc: "பில் கார்டை எங்கு தொட்டாலும் View Booking திறக்கும் வசதி மற்றும் தொட்டுப் பிடிக்கும்போது (Touch & Hold) Text Select ஆகாமல் தடுக்கப்பட்டது.",
      },
      {
        emoji: "📄",
        text: "Mobile-Friendly PDF Preview & Open Fullscreen",
        desc: "PDF Preview அனைத்து மொபைல் மற்றும் கணினி உலாவிகளிலும் எளிதாகத் திறக்கும்படி மேம்படுத்தப்பட்டது.",
      },
      {
        emoji: "🔔",
        text: "Accurate Delivery Browser Push Notifications",
        desc: "இன்றைய மற்றும் நாளைய டெலிவரிகள் குறித்த உலாவி நோட்டிபிகேஷன் தேதிகள் துல்லியமாக கணக்கிடப்பட்டு அனுப்பப்படும்.",
      },
    ],
  },
  {
    version: "v1.4.2",
    date: "22 Aug 2026",
    title: "Customer Detail Crash Fix & Full Project Verification",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "👤",
        text: "Individual Customer Page Crash Fix",
        desc: "Individual Customer பக்கம் திறக்கும் போது ஏற்பட்ட 'Can't find variable: Plus' பிழை சரிசெய்யப்பட்டு பக்கங்கள் சீராகத் திறக்கின்றன.",
      },
      {
        emoji: "🛡️",
        text: "Full Project TypeScript & Variable Verification",
        desc: "முழு செயலியில் உள்ள அனைத்து பக்கங்கள், ஐகான்கள், PDF மோடல்கள் மற்றும் ரூட்டிங் மாறிகள் 100% சோதிக்கப்பட்டு சரிசெய்யப்பட்டன.",
      },
    ],
  },
  {
    version: "v1.4.1",
    date: "22 Aug 2026",
    title: "New Booking Save Fix, Bill No Polish & Minimal Ready Message",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "⚡",
        text: "New Booking Save & Preview Modal Fix",
        desc: "New Booking-ல் Confirm & Save கொடுத்தவுடன் உடனடியாக புக்கிங் சேமிக்கப்பட்டு WhatsApp Preview Modal தோன்றும் பிழை சரிசெய்யப்பட்டது.",
      },
      {
        emoji: "🧾",
        text: "Single Hash Bill Number Formatting",
        desc: "WhatsApp செய்திகளில் பில் எண் முன்னால் இரண்டு முறை ## வருவது தவிர்க்கப்பட்டு ஒற்றை # உடன் சீரமைக்கப்பட்டது.",
      },
      {
        emoji: "🥻",
        text: "Clean Collection Message",
        desc: "புடவை எடுக்கும் WhatsApp செய்தியிலிருந்து கூடுதல் துணைத்தலைப்பு நீக்கப்பட்டு சுத்தமான வடிவம் அமைக்கப்பட்டது.",
      },
      {
        emoji: "✨",
        text: "Minimal Ready Notification",
        desc: "புடவை தயாரானதும் அனுப்பப்படும் செய்தியிலிருந்து Payment விவரங்கள் நீக்கப்பட்டு பில் எண் மற்றும் டெலிவரி தேதி மட்டும் கொண்ட எளிய வடிவம்.",
      },
    ],
  },
  {
    version: "v1.4.0",
    date: "22 Aug 2026",
    title: "CheckCircle Fix, Strict Completion Limits & Smart Message Styles",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "🐞",
        text: "CheckCircle Icon Import Fix",
        desc: "New Booking மற்றும் Bookings பக்கத்தில் Confirm/Complete செய்யும்போது ஏற்பட்ட CheckCircle icon பிழை சரிசெய்யப்பட்டது.",
      },
      {
        emoji: "🚫",
        text: "Strict Completion Payment Limits",
        desc: "Order Complete செய்யும்போது பாக்கித் தொகையை (Payable Due) விட கூடுதல் தொகை தவறாக உள்ளிடுவதைத் தடுக்கும் பாதுகாப்பு வசதி.",
      },
      {
        emoji: "🥻",
        text: "Distinct Saree Collection Slip Style",
        desc: "புடவை எடுக்கும் போது அனுப்பப்படும் WhatsApp செய்தி குறுகிய, நேர்த்தியான Booking Details & Payment Summary வடிவத்தில் அமைக்கப்பட்டது.",
      },
      {
        emoji: "🎊",
        text: "Distinct Saree Delivery Celebration Receipt",
        desc: "ஆர்டர் டெலிவரி செய்யும்போது அனுப்பப்படும் WhatsApp செய்தி கொண்டாட்டமான Delivery Receipt & Settlement Breakdown வடிவத்தில் அமைக்கப்பட்டது.",
      },
    ],
  },
  {
    version: "v1.3.9",
    date: "22 Aug 2026",
    title: "Settings Data Fix, Clean Draft Reset & WhatsApp Previews",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "🛡️",
        text: "Settings Data Section Crash Fix",
        desc: "Settings -> Data பகுதியில் உள்ள Recycle Bin & Activity Log பிழையின்றி திறக்கும்படி பாதுகாப்பு சரி செய்யப்பட்டது.",
      },
      {
        emoji: "🧹",
        text: "Clean Booking Draft Reset",
        desc: "புதிய புக்கிங் Confirm செய்து சேமிக்கப்பட்டவுடன் அதன் Draft முழுமையாக அழிக்கப்பட்டு அடுத்த முறை புது படிவமாகத் தொடங்கும்.",
      },
      {
        emoji: "💬",
        text: "New Booking WhatsApp Preview Modal",
        desc: "புக்கிங் சேமிக்கப்பட்டதும் உடனே WhatsApp திறக்காமல், செய்தியை முன்னோட்டம் (Preview) பார்த்து Send அல்லது Skip செய்யும் வசதி.",
      },
      {
        emoji: "🧾",
        text: "Accurate Order Completion WhatsApp Receipt",
        desc: "ஆர்டரை Complete செய்யும்போது வரவு வைக்கப்பட்ட புதிய தொகையுடன் சரியான Total Paid மற்றும் Paid in Full ரசீது அனுப்பும் வசதி.",
      },
    ],
  },
  {
    version: "v1.3.8",
    date: "22 Aug 2026",
    title: "Interactive Bills Widgets, Search Fix & Payment Warnings",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "📊",
        text: "Interactive Bills Register Widgets",
        desc: "Bills Register-ன் தலைப்பில் உள்ள Total Bills, Pending Due மற்றும் Fully Paid கட்டங்களைத் தட்டி உடனே அந்தப் பட்டியலுக்குச் செல்லும் வசதி.",
      },
      {
        emoji: "🔍",
        text: "Global Search Click Navigation Fix",
        desc: "தேடல் பெட்டியில் வாடிக்கையாளர் பெயர் அல்லது புக்கிங் விவரங்களைத் தட்டும்போது ஏற்படும் வழிசெலுத்தல் பிழை சரிசெய்யப்பட்டது.",
      },
      {
        emoji: "⚠️",
        text: "Overpayment Warning Banners",
        desc: "மொத்த பில் அல்லது பாக்கித் தொகையை விட அதிக தொகை வரவு வைக்க முயன்றால் எச்சரிக்கும் பாதுகாப்பு வசதி.",
      },
      {
        emoji: "💵",
        text: "Payments Page Quick Collect Fix",
        desc: "Payments பக்கத்தில் Pending Order-க்கு நேரடி வரவு வைக்கும் (Collect) செயல்பாடு முழுமையாகச் சரிசெய்யப்பட்டது.",
      },
    ],
  },
  {
    version: "v1.3.7",
    date: "22 Aug 2026",
    title: "Enhanced Pending Payments Hub & In-Place Quick Settle",
    badge: "LATEST UPDATE ✨",
    changes: [
      {
        emoji: "💵",
        text: "In-Place Quick Collect & Settle Dialog",
        desc: "Payments பக்கத்தில் இருந்தபடியே முழு பாக்கித் தொகை அல்லது தேவையான தொகையை GPay / Cash மூலம் 1-Tap-ல் வரவு வைக்கும் வசதி.",
      },
      {
        emoji: "📑",
        text: "Full Financial Breakdown Cards",
        desc: "முடிவடைந்த ஆர்டர்களின் புடவை எண்ணிக்கை, ரேட், கூடுதல் கட்டணம், தள்ளுபடி, வரவு மற்றும் பாக்கித் தொகை அனைத்தும் முழுமையாகத் தெரியும்.",
      },
      {
        emoji: "💬",
        text: "Branded WhatsApp Payment Reminders",
        desc: "பில் எண் மற்றும் கணக்கு விவரங்களுடன் 'EYAS SAREE DRAPIST' பிராண்டட் WhatsApp நினைவூட்டல் செய்தி அனுப்பும் வசதி.",
      },
      {
        emoji: "🔍",
        text: "Search & Filter for Pending Orders",
        desc: "வாடிக்கையாளர் பெயர், போன் எண் அல்லது பில் எண் மூலம் பாக்கி உள்ள ஆர்டர்களை எளிதாகத் தேடும் வசதி.",
      },
    ],
  },
  {
    version: "v1.3.6",
    date: "22 Aug 2026",
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
