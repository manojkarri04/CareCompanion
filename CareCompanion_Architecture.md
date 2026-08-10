# CareCompanion Architecture Documentation

This document outlines the architecture, data flow, and state management for each page and component of the CareCompanion application, based on the visual architecture diagrams.

---

## 1. Login Page Architecture

**Dependencies & Setup**
* **Imports:** `react`, `lucide-react`, `./components/supabase`
* **Types:** `LoginPageProps`

**State Management**
* **State Variables:** `email`, `password`, `focused`, `showPassword`, `isRegistering`

**Logic & Data Flow**
* **Form Submission (`handleSubmit`):**
    * If `isRegistering`: Calls `supabase.auth.signUp`
    * Else: Calls `supabase.auth.signInWithPassword`
    * On Success: Triggers `onLogin()` prop callback to the parent component.
* **UI Interactions:**
    * **Email/Password form:** `onChange` events update local state.
    * **Google Button & Guest Button:** `onClick` events bypass standard form submission and directly call `onLogin()`.
    * **Sign Up link:** Toggles the `isRegistering` state.

---

## 2. Home Page Architecture

**Dependencies & Setup**
* **Imports:** `react-router-dom`, `Sidebar`, `lucide-react`, `./supabase`
* **Props:** `isGuestMode` (default: false)

**State Management**
* **State & Refs:** `fileInputRef`, `isUploading`, `aiSummary` (Note: Currently marked as unread by the UI)

**Logic & Data Flow**
* **File Upload Flow:**
    1.  User clicks upload (`handleUploadClick`), which programmatically clicks the hidden file input.
    2.  `handleFileChange` fires on file selection.
    3.  Fetches access token via `supabase.auth.getSession`.
    4.  Makes a `fetch` call to `VITE_API_URL/api/analyze` (Flask backend) passing the Bearer token and file.
    5.  **On Success:** Updates state via `setAiSummary(data.analysis)`.
    6.  **On Failure:** Triggers `alert(data.error)`.
* **UI Sections:** Header/Sidebar, Guest mode banner, Upload card, Chat card.
    * *Architectural Gap:* The `aiSummary` state is updated, but no UI section currently reads or renders this data.

---

## 3. Message Routing (Intent System)

**State Management**
* **State Variables:** `inputMessage`, `activeChat`, `currentChat`

**Logic & Data Flow**
* **Message Dispatch (`handleSendMessage`):** Appends the user message to the UI and fetches the auth session.
* **Intent Router (`detectIntent(message)`):** Uses keyword matching to route the request:
    * **IDP Intent:** Routes to `POST /api/hackathon-analyze`.
    * **DATABASE Intent:** Routes to `POST /api/ask-database` (handles Ghana facility data).
    * **HEALTH Intent:** Routes to `POST /api/chat` (Note: Diagram indicates no auth header is sent here).
* **Response Handling:**
    * A `botResponse` object is built depending on the branch taken (handling anomalies, SQL, agent responses, or raw data).
    * Calls `setChats(prevChats => ...)` to append the bot response to `activeChat.messages`.
    * A generic `catch` block alerts the user if any branch throws an error.

---

## 4. Chat Page Architecture

**Flow Sequence**
1.  **User Input:** User types and submits a chat message.
2.  **Send Handler:** Performs an optimistic UI update (shows user message immediately).
3.  **Intent Router:** Keyword-based routing diverts the message to one of three handlers:
    * Health Chat (General medical Q&A)
    * Database Query (Ghana facility data)
    * Facility Extraction (IDP document parsing)
4.  **State Update:** `setChats` appends the appropriate backend reply.
5.  **Render Message:** The UI updates, rendering `MessageBubble` and associated data cards.

---

## 5. Appointment Scheduler & Alerts Pages (Standard CRUD Flow)

*(Note: Both pages follow an identical 9-step cyclical architecture for handling data).*

**9-Step Data Flow**
1.  **Imports / Dependencies:** React, Sidebar, Icons, Supabase client.
2.  **Declarations / State Variables:** Arrays for data (appointments/alerts), modal flags (`showAddModal`), form fields (`newAlert`/`newAppointment`).
3.  **Functions / Hooks:** `useEffect` (for initial fetch), `add`/`save`, `delete`/`cancel` handlers.
4.  **User Input Handling:** User interacts with form fields and buttons.
5.  **State Management:** Local updates via setters (`setAppointments`, `setAlerts`, `setShowAddModal`).
6.  **API / Backend Communication:** Fetches auth session and communicates with Flask routes.
7.  **Business Logic Processing:** Validates fields, formats dates, checks for guest mode.
8.  **Response Handling:** Parses JSON response, updates lists, logs/shows errors.
9.  **UI Rendering:** Returns JSX (Table rows, empty states, modal forms). Re-renders feed back to Step 4.

---

## 6. Report Analyzer Page

**Layered Architecture**
* **Dependency Layer:** External libraries (React, Supabase client).
* **State Layer:** Local state (`file`, `loading`, `analysis`, `error`).
* **Logic Layer:**
    * `handleFileChange`: Selects file, resets prior result.
    * `handleAnalyze`: Validates file, builds `FormData`.
* **Communication Layer:** API call (`POST` multipart file to `/api/analyze`) -> Response processing (Parse JSON, branch on ok/error) -> State update (`setAnalysis` / `setError` / `setLoading`).
* **Presentation Layer:** Upload section, Error display, Results section (Clinical explanation text). Renders updates based on the Feedback loop to state.

---

## 7. Saved Documents Page

**Layered Architecture**
* **Dependency Layer:** React, Sidebar, icons, Supabase client.
* **State Layer:**
    * Local State: `documents`, `searchQuery`, `sortBy`.
    * Derived State: Filtered by search, sorted by date/name.
* **Logic Layer:** Handlers (`fetchDocuments`, `handleView`, `handleDownload`, `handleDelete`) triggered by mount and button clicks.
* **Communication Layer:**
    * Auth session retrieves Supabase access token.
    * Flask document API (`GET` list, `GET` file blob, `DELETE` - all bearer-authenticated).
    * Response processing (Normalize dates, convert to blob URL) -> State update (`setDocuments`).
* **Presentation Layer:** Search/sort bar, Document grid (Icon, name, date, actions), Empty state.

---

## 8. Sidebar Component

**Layered Architecture**
* **Dependency Layer:** `react-router-dom`, `lucide` icons.
* **Props / Config Layer:**
    * `activePage` prop (Passed in by parent page).
    * `navItems` config (Static list: label, icon, path).
* **Logic Layer:** Derived state (`isActive` comparison per nav item).
* **Communication Layer:** Router navigation (`Link` triggers client-side route change).
* **Presentation Layer:** Nav list rendering (Icon + label, highlighted if active).
    * Triggers Route change, which swaps the parent page and passes a new `activePage` prop down.

---

## 9. App.tsx (Main Application Router)

**Layered Architecture**
* **Dependency Layer:** `react-router-dom`, `AuthProvider`.
    * `AuthProvider` wraps the `Router` (Browser history + `AppRoutes`).
* **State Layer:** `AppRoutes` state (`session` from context, `isGuestMode` local state).
* **Logic Layer:** Auth handlers (`handleLogin`, `handleGuestLogin`).
* **Communication Layer:**
    * Route resolution (Matches path, evaluates session + guard).
    * `ProtectedRoute` guard (Checks session or guest mode). Denied paths redirect.
* **Presentation Layer:** Splits between the unauthenticated Login page and authenticated Feature pages (Home, Chat, Alerts, Notepad, Saved Docs, Appointments).

---

## 10. Authentication Provider (`AuthProvider`)

**Layered Architecture**
* **Dependency Layer:** React context API, Supabase client.
* **State Layer:** Local state (`session`, `loading`).
* **Logic Layer:** Mount effect (`useEffect` runs `loadSession` once).
* **Communication Layer:**
    * Supabase auth call (`supabase.auth.getSession()`).
    * Response processing (Extracts session, marks `loading: false`).
    * State update (`setSession`, `setLoading`).
* **Exposure Layer:** `AuthContext.Provider` (Publishes `{session, loading}` value).
* **Presentation Layer:**
    * `useAuth` consumers (`AppRoutes`, `ProtectedRoute`, pages).
    * Render update: Renders children, consumers re-render when context changes.
