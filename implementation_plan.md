# Next.js Frontend Migration Plan for CareCompanion

This document outlines the architectural plan and step-by-step implementation guide to migrate the CareCompanion frontend from a **Vite + React SPA (Single Page Application)** to a **Next.js 15 (App Router)** architecture.

---

## 🎯 Architecture Overview & Why Next.js?

CareCompanion currently runs as a client-side Vite application (`d:\CareCompanion\frontend\carecompanion`). Migrating to Next.js App Router provides significant capabilities:

1. **Hybrid Rendering (SSR / SSG / Client Components)**:
   - Public landing/login pages render instantly with Server-Side Rendering (SSR).
   - Heavy interactive UI components (Chat interface, Mapbox maps, Schedulers) stay interactive with Client Components (`'use client'`).
2. **Built-in Route Optimization & SEO**:
   - File-system based App Router (`app/` directory).
   - Automatic route prefetching and code-splitting per page.
   - Standardized `metadata` API for dynamic SEO titles and OpenGraph tags.
3. **Optimized Asset & Font Delivery**:
   - Automatic image optimization via `next/image`.
   - Zero-CLS font loading using `next/font`.
4. **Backend-Frontend Unified Middleware / API Routes**:
   - Seamless API proxying to Python backend microservices (`http://localhost:8000`).
   - Secure server-side handling of Supabase & secret tokens via Next.js Server Actions or Route Handlers if needed.

---

## ⚠️ User Review Required

> [!IMPORTANT]
> **Migration Approach Options**:
> 1. **In-place Upgrade (Recommended)**: Convert the existing `d:\CareCompanion\frontend\carecompanion` directory by replacing Vite entrypoints (`index.html`, `vite.config.ts`, `src/main.tsx`) with Next.js App Router configuration (`next.config.ts`, `app/` directory structure) while retaining all existing Radix UI, Tailwind CSS, Lucide icons, and feature components in `src/components/`.
> 2. **Parallel Clean Init**: Create a fresh Next.js project folder `frontend/carecompanion-next` alongside the old SPA for side-by-side verification before swapping.

---

## ❓ Open Questions

> [!NOTE]
> 1. **Deployment Target**: Will CareCompanion be deployed on **Vercel**, **Docker container**, or static export (`output: 'export'`)? (Vercel/Docker recommended for full SSR & API proxy features).
> 2. **Authentication Flow**: Should we keep client-side Supabase authentication (`@supabase/supabase-js`), or leverage `@supabase/ssr` with Next.js Middleware for server-side auth guards?

---

## 🏗️ Proposed Changes

### Project Structure Transition

```
frontend/carecompanion/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root Layout (Fonts, Global CSS, Providers)
│   ├── page.tsx                # Index Route (Redirect or Landing)
│   ├── login/
│   │   └── page.tsx            # Login Page
│   ├── home/
│   │   └── page.tsx            # Dashboard / Home
│   ├── chat/
│   │   └── page.tsx            # AI Chat Assistant Interface
│   ├── alerts/
│   │   └── page.tsx            # Emergency & Medical Alerts
│   ├── notepad/
│   │   └── page.tsx            # Patient Notes & Logs
│   ├── saved-docs/
│   │   └── page.tsx            # Saved Documents & Records
│   └── appointments/
│       └── page.tsx            # Appointment Scheduler & Mapbox
├── src/
│   ├── components/             # Reusable UI & Feature components (Marked with 'use client')
│   ├── AuthProvider.tsx        # Client Auth Provider
│   └── lib/                    # Supabase client, utilities
├── public/                     # Static assets
├── next.config.ts              # Next.js Configuration
├── postcss.config.mjs          # PostCSS / Tailwind CSS configuration
├── tailwind.config.ts          # Tailwind setup
└── package.json                # Dependencies updated with next
```

---

### Phase 1: Core Next.js Configuration & Dependencies

#### [MODIFY] [package.json](file:///d:/CareCompanion/frontend/carecompanion/package.json)
- Add `next@latest` dependency.
- Remove `vite`, `@vitejs/plugin-react`, `react-router-dom`.
- Update scripts:
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
  ```

#### [NEW] [next.config.ts](file:///d:/CareCompanion/frontend/carecompanion/next.config.ts)
- Configure Next.js compiler settings, image domains, and dynamic client library handling for packages like `mapbox-gl`.

#### [NEW] [postcss.config.mjs](file:///d:/CareCompanion/frontend/carecompanion/postcss.config.mjs)
- Configure Tailwind CSS v4 / PostCSS plugins for Next.js build pipeline.

---

### Phase 2: App Router Layouts & Route Mapping

#### [NEW] [app/layout.tsx](file:///d:/CareCompanion/frontend/carecompanion/app/layout.tsx)
- Create root layout containing `html`, `body`, global font declaration (Inter/Outfit), metadata export, and client `AuthProvider` wrapper.

#### [NEW] [app/login/page.tsx](file:///d:/CareCompanion/frontend/carecompanion/app/login/page.tsx)
- Render `LoginPage` component with client-side guest/user login handlers.

#### [NEW] [app/home/page.tsx](file:///d:/CareCompanion/frontend/carecompanion/app/home/page.tsx)
- Main dashboard view wrapping existing `HomePage` component.

#### [NEW] [app/chat/page.tsx](file:///d:/CareCompanion/frontend/carecompanion/app/chat/page.tsx)
- AI Health Companion interactive chat interface (`ChatPage`).

#### [NEW] [app/alerts/page.tsx](file:///d:/CareCompanion/frontend/carecompanion/app/alerts/page.tsx)
- Health alerts view (`AlertsPage`).

#### [NEW] [app/notepad/page.tsx](file:///d:/CareCompanion/frontend/carecompanion/app/notepad/page.tsx)
- Patient notebook view (`NotepadPage`).

#### [NEW] [app/saved-docs/page.tsx](file:///d:/CareCompanion/frontend/carecompanion/app/saved-docs/page.tsx)
- Medical records repository (`SavedDocumentsPage`).

#### [NEW] [app/appointments/page.tsx](file:///d:/CareCompanion/frontend/carecompanion/app/appointments/page.tsx)
- Appointment scheduling & location finder (`AppointmentSchedulerPage`). Note: Mapbox component will use `dynamic(() => import(...), { ssr: false })` to avoid window/document SSR errors.

---

### Phase 3: Component Adaptations & Refactoring

#### [MODIFY] [src/AuthProvider.tsx](file:///d:/CareCompanion/frontend/carecompanion/src/AuthProvider.tsx)
- Add `'use client'` directive at top of file. Ensure browser-only window overrides (like window.fetch patch) execute safely in browser environment.

#### [MODIFY] [src/components UI files](file:///d:/CareCompanion/frontend/carecompanion/src/components)
- Add `'use client'` directive to interactive stateful components (Radix UI accordions/dialogs, Recharts graphs, Lucide icon wrappers).

#### [DELETE] [index.html](file:///d:/CareCompanion/frontend/carecompanion/index.html)
- Replaced by Next.js `app/layout.tsx`.

#### [DELETE] [vite.config.ts](file:///d:/CareCompanion/frontend/carecompanion/vite.config.ts)
- Replaced by Next.js configuration.

---

## 🧪 Verification Plan

### Automated Tests & Builds
- Execute dependency setup in `d:\CareCompanion\frontend\carecompanion`:
  `npm install`
- Verify Next.js development server builds clean:
  `npm run dev`
- Run production build check to ensure no SSR window errors or TypeScript breakages:
  `npm run build`

### Manual Verification
- Test all core routes (`/login`, `/home`, `/chat`, `/alerts`, `/notepad`, `/saved-docs`, `/appointments`).
- Verify guest mode and Supabase Auth session persistence across page refreshes.
- Verify Mapbox interactive maps load without SSR reference errors.
