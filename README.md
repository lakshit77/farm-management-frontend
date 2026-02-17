# ShowGroundsLive — Frontend

React frontend for **ShowGroundsLive**, a live schedule viewer for equestrian shows. View daily schedules by date, filter by horse, rider, status, and class type, and see events, rings, classes, and entries with order-of-go and status.

---

## Tech stack

- **React 18** with **TypeScript**
- **Vite 5** for build and dev server
- **Tailwind CSS** for styling
- **Lucide React** for icons

---

## Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **npm** or **yarn**

---

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment (optional)

Copy the example env file and set your API secret if you use the real backend:

```bash
cp .env.example .env
```

Edit `.env` and set:

- **`VITE_API_SECRET`** — Secret sent as `Authorization: Bearer <value>` to the backend. Required when `USE_MOCK_DATA` is `false`. Example: `n8n-secret` or your backend secret.

If you omit `.env`, the app uses the default API secret from `src/config.ts` (see [Configuration](#configuration)).

### 3. Run the app

**Development (with hot reload):**

```bash
npm run dev
```

Then open the URL shown in the terminal (e.g. `http://localhost:5173`).

**Production build:**

```bash
npm run build
```

**Preview production build locally:**

```bash
npm run preview
```

---

## Configuration

Configuration lives in **`src/config.ts`**.

| Setting | Description |
|--------|-------------|
| **`CURRENT_ENVIRONMENT`** | `'production'` or `'uat'`. Chooses which API base URL is used. |
| **`API_BASE_URLS`** | `uat`: `http://localhost:8000`, `production`: `http://44.197.122.197:8000`. |
| **`USE_MOCK_DATA`** | `true` = use inline mock schedule data; `false` = call the real backend. |
| **`API_SECRET`** | From `VITE_API_SECRET` in `.env`, or fallback to `DEFAULT_API_SECRET` in config. Sent as `Authorization: Bearer <value>` on all API requests. |

To point at your local backend:

1. Set `CURRENT_ENVIRONMENT` to `'uat'` in `src/config.ts`.
2. Set `USE_MOCK_DATA` to `false`.
3. Ensure `VITE_API_SECRET` in `.env` matches your backend’s expected secret (or rely on the default in config).

---

## Project structure

```
showgroundlive_frontend/
├── public/                 # Static assets (e.g. favicon.svg)
├── src/
│   ├── api/                 # API layer
│   │   ├── api.ts           # Endpoints (schedule view), getApiHeaders()
│   │   ├── types.ts         # Response types (ScheduleViewData, ScheduleEvent, etc.)
│   │   ├── index.ts         # Re-exports
│   │   └── README.md        # API layer notes
│   ├── components/          # Reusable UI (Header, Button, Input, Badge, cards, etc.)
│   ├── config.ts            # Environment, base URLs, USE_MOCK_DATA, API_SECRET
│   ├── branding.ts          # Brand/theme
│   ├── applyBranding.ts     # Applies branding to DOM
│   ├── App.tsx              # Main schedule view and filters
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles (Tailwind)
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── .env.example             # Example env (VITE_API_SECRET)
```

---

## API

The app talks to a single backend endpoint when `USE_MOCK_DATA` is `false`:

- **Schedule view:** `GET /api/v1/schedule/view?date=YYYY-MM-DD`
  - All requests use `getApiHeaders()` so `Authorization: Bearer <API_SECRET>` is sent.
  - Response: `{ status, message, data: { date, show_name, show_id, events[] } }`.

See **`src/api/README.md`** and **`src/api/api.ts`** for types and mock data shape.

---

## Scripts

| Script | Command | Description |
|--------|--------|-------------|
| **dev** | `npm run dev` | Start Vite dev server with HMR |
| **build** | `npm run build` | TypeScript check + production build |
| **preview** | `npm run preview` | Serve the production build locally |

---

## Browser support

Targets modern browsers that support ES modules and the features used by React 18 and Vite (e.g. recent Chrome, Firefox, Safari, Edge).

---

## License

Private. See project/repository terms.
