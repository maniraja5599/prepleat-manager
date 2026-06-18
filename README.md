# Saree PrePleat & Drape Manager

A full-stack, offline-first web application designed specifically for Saree Draping & Pre-pleating artists to manage their bookings, customers, and finances. 

Built with modern web technologies, this app provides a fast, app-like experience with complete offline support and seamless cloud synchronization.

## 🚀 Key Features

*   **Interactive Calendar Dashboard:** Manage all bookings with an intuitive monthly and daily calendar view. Includes fast swiping, long-press peeking, and double-tap booking.
*   **Booking Management:** Track Pre-pleating and Direct Draping services. Record customer details, saree counts, delivery dates, measurements, and add custom quick-note tags.
*   **Advanced Customer Tracking:** Auto-saving customer profiles with call and WhatsApp integration. Support for B2B Artist connections.
*   **Pick Location via Google Maps:** Integrated Google Maps API with places autocomplete to accurately drop delivery pins and save Google Maps URLs.
*   **Financial Tracking:** Comprehensive income and expense tracking. Calculates dues automatically and categorizes extra incomes/expenses with custom headers.
*   **PDF Invoicing:** Generate and download professional PDF bills containing your logo, business details, customer info, items, payment history, and dynamic PAID/DUE stamps.
*   **100% Offline-First:** Powered by a robust local-first architecture. All data is saved instantly to your device.
*   **Cloud Synchronization:** Sign in with Google (via Firebase) to automatically sync data securely across multiple devices.
*   **Theming & Branding:** Customize the app's look and feel with 12 distinct color palettes (including Midnight, Rose Pink, Gold, etc.). Upload your business logo and configure your business name, slogan, and contact info.
*   **PWA Ready:** Installable as a standalone app on iOS and Android straight from the browser (Add to Home Screen).

## 🛠 Tech Stack

*   **Frontend Framework:** React 18, Vite, TanStack Router
*   **Styling & UI:** Tailwind CSS v4, Radix UI primitives, Lucide Icons, Custom CSS animations
*   **State Management:** Zustand (with custom persistence and undo/redo history)
*   **Data Sync & Auth:** Firebase Authentication (Google OAuth), Firebase Firestore
*   **PDF Generation:** jsPDF, html2canvas
*   **Maps & Geolocation:** Google Maps JavaScript API, Places API, `@react-google-maps/api`
*   **Date Handling:** `date-fns`

## ⚙️ Project Setup & Configuration

### Prerequisites
*   Node.js (v18+)
*   NPM or Yarn
*   A Firebase Project
*   A Google Cloud Project (with Maps & Places APIs enabled)

### Environment Variables
Create a `.env` file in the root directory and add your configuration:

```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="sender-id"
VITE_FIREBASE_APP_ID="app-id"
VITE_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

### Installation

1.  Clone the repository and install dependencies:
    ```bash
    npm install
    ```
2.  Start the local development server:
    ```bash
    npm run dev
    ```
3.  To build for production (e.g., deploying to Vercel):
    ```bash
    npm run build
    ```

## 📖 App Usage Guide (Available in Settings -> Help)

*   **Navigation:** Use the bottom navigation bar to switch between Calendar, Bookings, Customers, Payments, and Settings.
*   **Calendar Shortcuts:** Double-tap a date to book. Long-press to peek at the day's schedule. Double-tap the Calendar tab icon to reset the view to "Today".
*   **Theme & Pricing:** Visit the **Settings** page to configure your default PrePleat and Drape pricing, default measurement templates, payment modes, and custom color themes.
*   **Backup & Restore:** Easily export all your data as a JSON backup or CSV spreadsheet from the Settings page. You can also view a detailed activity log to undo accidental edits or deletions.

## 📝 License

This project is proprietary.
