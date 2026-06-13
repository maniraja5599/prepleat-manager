# Saree PrePleat Manager (Eyas Saree Drapist)

A mobile-first progressive web application (PWA) designed to manage bookings, payments, customers, and expenses for a saree pre-pleating and draping business.

## 🚀 Technology Stack
* **Framework**: React 19 + [TanStack Start](https://tanstack.com/router/latest/docs/start/overview) (SSR meta-framework powered by Nitro)
* **Styling**: Tailwind CSS v4 + shadcn/ui
* **Database & Auth**: Supabase (PostgreSQL with Row Level Security)
* **Local State & Offline-First**: Zustand + LocalStorage sync
* **PDF Utility**: jsPDF (Automatic receipt/invoice generation)

---

## 🛠️ Getting Started

### 1. Prerequisites
Make sure you have Node.js (v18+) and npm installed.

### 2. Installation
Install all dependencies:
```bash
npm install
```

### 3. Setup Environment Variables
1. Copy the example environment variables:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your Supabase connection parameters (URL, Anon key, Project ID).
3. If using server-side booking request capture, add your Supabase `SUPABASE_SERVICE_ROLE_KEY`.

### 4. Running the App
Start the development server:
```bash
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

### 5. Build for Production
To build the application for deployment (e.g., to Cloudflare Workers, Netlify, or Node.js host):
```bash
npm run build
```

---

## 📂 Project Structure
* `/src/routes` — TanStack Router file-based pages (e.g. `/bookings`, `/customers`, `/payments`, `/settings`)
* `/src/components` — Reusable react components
* `/src/components/ui` — shadcn/ui primitives
* `/src/lib/store.ts` — Core state logic, CRUD functions, and auto-migrations (Zustand)
* `/src/lib/pdf-bill.ts` — A5 receipt generation layout
* `/supabase/migrations` — SQL migrations specifying PostgreSQL tables, columns, and RLS security policies
