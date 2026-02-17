# Horse Farm Management System - Frontend Specification

## Project Overview

### What We're Building
A professional dashboard for a horse farm to monitor their horses' participation in equestrian shows. The system syncs with ShowGroundsLive APIs and displays real-time information about schedules, entries, and results.

### Target Users
Farm staff and management who need to:
- See today's schedule at a glance
- Track where each horse is and when they compete
- View results and performance metrics
- Monitor system notifications

### Design Philosophy
- **Clean and minimal** — Show only what's useful
- **Data-driven** — Use graphs and visualizations where appropriate
- **Professional** — Earthy, organic, trustworthy design
- **Mobile-friendly** — Works on phones at the show grounds

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS |
| Components | shadcn/ui + Radix UI |
| State | React Query (TanStack Query) |
| Charts | Recharts or Chart.js |
| Icons | Lucide React |
| Backend | FastAPI (already exists) |
| Database | PostgreSQL via Supabase |

---

## Design System Summary

### Colors (from design-system.json)

```typescript
const colors = {
  // Backgrounds
  background: {
    primary: "#F7F7F7",      // Main page background
    primaryAlt: "#F8F5EE",   // Warm beige alternative
  },
  
  // Cards/Surfaces
  surface: {
    card: "#FFFFFF",         // Card background
    cardAlt: "#FBFBFB",      // Subtle card variation
  },
  
  // Primary Accent (Forest Green)
  accent: {
    green: "#4F6D4F",        // Primary brand
    greenAlt: "#596B5A",     // Hover state
    greenDark: "#5C7B5C",    // Headings
  },
  
  // Text
  text: {
    primary: "#333333",      // Main text
    secondary: "#6B6B6B",    // Muted text
    onDark: "#FFFFFF",       // Text on dark backgrounds
  },
  
  // Warm Accent (Orange-Brown)
  warm: {
    orange: "#B18A5D",       // Labels, accents
    orangeAlt: "#CC8A48",    // Hover
    rust: "#AD6D3F",         // Strong accent
  },
  
  // Semantic
  semantic: {
    success: "#4F6D4F",      // Use green
    warning: "#F4E8D7",      // Soft warm background
    warningText: "#AD6D3F",  // Rust text
    error: "#C53030",        // Red for errors
  },
  
  // Borders
  border: {
    light: "#E8E8E8",
    accent: "#E0E6E0",
  }
}
```

### Typography

```typescript
const typography = {
  heading: "Georgia, Lora, Playfair Display, serif",      // Page titles
  body: "Inter, Open Sans, Lato, sans-serif",             // Everything else
}
```

### Spacing
- Use 8px base unit (8, 16, 24, 32, 40, 48)
- Generous whitespace
- Card padding: 20-24px
- Card gap: 24-32px

### Components Style
- Rounded corners (8-12px for cards, 6px for buttons)
- Subtle shadows on cards
- Icons in circular containers with green/warm fills
- Clean, minimal borders

---

## Application Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with sidebar
│   ├── page.tsx                # Dashboard (home)
│   ├── horses/
│   │   ├── page.tsx            # Horse list
│   │   └── [id]/
│   │       └── page.tsx        # Horse detail
│   ├── results/
│   │   └── page.tsx            # Results & statistics
│   └── notifications/
│       └── page.tsx            # Notification log
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── PageContainer.tsx
│   ├── dashboard/
│   │   ├── TodayOverview.tsx
│   │   ├── UpcomingClasses.tsx
│   │   ├── LiveClassCard.tsx
│   │   ├── QuickStats.tsx
│   │   └── RecentResults.tsx
│   ├── horses/
│   │   ├── HorseCard.tsx
│   │   ├── HorseList.tsx
│   │   ├── HorseSchedule.tsx
│   │   └── HorsePerformance.tsx
│   ├── results/
│   │   ├── ResultsTable.tsx
│   │   ├── PerformanceChart.tsx
│   │   ├── PrizeMoneyChart.tsx
│   │   └── PlacingsChart.tsx
│   ├── notifications/
│   │   ├── NotificationList.tsx
│   │   └── NotificationItem.tsx
│   ├── ui/                     # shadcn components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   └── ...
│   └── shared/
│       ├── StatusBadge.tsx
│       ├── RefreshButton.tsx
│       ├── LoadingState.tsx
│       ├── EmptyState.tsx
│       └── ErrorState.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts           # Axios/fetch setup
│   │   ├── horses.ts           # Horse API calls
│   │   ├── entries.ts          # Entry API calls
│   │   ├── results.ts          # Results API calls
│   │   └── notifications.ts    # Notification API calls
│   ├── hooks/
│   │   ├── useHorses.ts
│   │   ├── useEntries.ts
│   │   ├── useDashboard.ts
│   │   └── useResults.ts
│   └── utils/
│       ├── formatters.ts       # Date, time, currency formatters
│       └── constants.ts        # Static data
├── types/
│   ├── horse.ts
│   ├── entry.ts
│   ├── class.ts
│   ├── result.ts
│   └── notification.ts
└── constants/
    ├── navigation.json
    ├── dashboard.json
    └── labels.json
```

---

## Page Specifications

### Page 1: Dashboard (Home)

**Route:** `/`

**Purpose:** At-a-glance view of today's activities

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR  │                      MAIN CONTENT                           │
│           │  ┌─────────────────────────────────────────────────────────┐│
│  Dashboard│  │  Header: "Good Morning" + Date + Refresh Button         ││
│  Horses   │  └─────────────────────────────────────────────────────────┘│
│  Results  │  ┌─────────────────────────────────────────────────────────┐│
│  Notifs   │  │  QUICK STATS ROW (4 cards)                              ││
│           │  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    ││
│           │  │  │Horses│ │Classes│ │Next  │ │Results│                   ││
│           │  │  │Today │ │Today │ │Class │ │Today │                    ││
│           │  │  └──────┘ └──────┘ └──────┘ └──────┘                    ││
│           │  └─────────────────────────────────────────────────────────┘│
│           │  ┌───────────────────────┐ ┌───────────────────────────────┐│
│           │  │  LIVE / NEXT CLASS    │ │  TODAY'S SCHEDULE             ││
│           │  │                       │ │                               ││
│           │  │  Class: 1.25m Jumper  │ │  Timeline view of classes     ││
│           │  │  Ring: International  │ │  with horse indicators        ││
│           │  │  Status: In Progress  │ │                               ││
│           │  │  Our horses: 3        │ │  7:15 AM - Class 2401 ✓       ││
│           │  │  Progress: 45/68      │ │  9:00 AM - Class 1095 🔴      ││
│           │  │                       │ │  11:30 AM - Class 2402        ││
│           │  │  OSTWIND #9 of 68     │ │  2:00 PM - Class 3001         ││
│           │  │  KINGDOM #23 of 68    │ │                               ││
│           │  └───────────────────────┘ └───────────────────────────────┘│
│           │  ┌───────────────────────┐ ┌───────────────────────────────┐│
│           │  │  RECENT RESULTS       │ │  HORSE AVAILABILITY           ││
│           │  │                       │ │                               ││
│           │  │  🏆 OSTWIND - 1st     │ │  OSTWIND - Free 2h 15m        ││
│           │  │  🥈 KINGDOM - 2nd     │ │  KINGDOM - In Ring 7          ││
│           │  │  🥉 CAYMAN - 3rd      │ │  CAYMAN - Next at 2:00 PM     ││
│           │  └───────────────────────┘ └───────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

**Components:**

1. **QuickStats Row**
   - 4 stat cards in a row
   - Each card: Icon (in green circle) + Number + Label
   - Stats:
     - Horses competing today (count)
     - Classes today (count)
     - Next class (time)
     - Results today (placings count)

2. **Live/Next Class Card**
   - Shows currently running or next upcoming class
   - Class name, ring, status
   - Progress bar (completed_trips / total_trips)
   - List of our horses in this class with order_of_go
   - Auto-updates or refresh button

3. **Today's Schedule**
   - Vertical timeline of today's classes
   - Each item: Time + Class name + Status badge
   - Status badges: Completed (green), In Progress (orange pulse), Upcoming (gray)
   - Show count of our horses per class

4. **Recent Results**
   - List of today's completed classes with our placings
   - Horse name + Placing + Prize money
   - Emoji or icon for placing (🏆 🥈 🥉)

5. **Horse Availability**
   - Quick view of where each horse is
   - Status: "Free", "In Ring", "Next at X:XX"
   - Free time remaining if applicable

**API Endpoints Needed:**

```python
# FastAPI endpoints to create/modify

GET /api/dashboard/today
Response:
{
    "date": "2026-02-11",
    "show": {
        "id": "uuid",
        "name": "2026 WEF 6",
        "api_show_id": 200000050
    },
    "stats": {
        "horses_today": 12,
        "classes_today": 28,
        "completed_classes": 5,
        "placings_today": 8,
        "prize_money_today": 540.00
    },
    "current_class": {
        "id": "uuid",
        "name": "1.25m Schooling Jumper",
        "class_number": "1095",
        "ring_name": "International Ring",
        "status": "In Progress",
        "estimated_start": "11:50:00",
        "total_trips": 68,
        "completed_trips": 45,
        "our_horses": [
            {
                "horse_id": "uuid",
                "horse_name": "OSTWIND 59",
                "order_of_go": 9,
                "status": "completed",
                "placing": null
            }
        ]
    },
    "schedule": [
        {
            "class_id": "uuid",
            "class_name": "$150 Green Hunter",
            "class_number": "2401",
            "ring_name": "International Ring",
            "estimated_start": "07:15:00",
            "status": "Completed",
            "our_horse_count": 2
        }
    ],
    "recent_results": [
        {
            "horse_name": "OSTWIND 59",
            "class_name": "$150 Green Hunter",
            "placing": 1,
            "prize_money": 45.00,
            "completed_at": "2026-02-11T08:30:00Z"
        }
    ],
    "horse_availability": [
        {
            "horse_id": "uuid",
            "horse_name": "OSTWIND 59",
            "status": "free",
            "free_until": "14:00:00",
            "free_minutes": 135,
            "next_class": "Junior Jumper"
        }
    ]
}

POST /api/sync/trigger
Description: Manually trigger sync flow
Response:
{
    "status": "started",
    "message": "Sync triggered successfully"
}
```

---

### Page 2: Horse List

**Route:** `/horses`

**Purpose:** View all horses with their status and upcoming classes

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Header: "Horses" + Count Badge + Search + Filter + Refresh            │
├─────────────────────────────────────────────────────────────────────────┤
│  Filter Bar: [All] [Competing Today] [Free] [In Ring]                  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  HORSE CARDS GRID (3 columns on desktop, 1 on mobile)              ││
│  │                                                                     ││
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       ││
│  │  │ 🐴 OSTWIND 59   │ │ 🐴 KINGDOM Z    │ │ 🐴 CAYMAN       │       ││
│  │  │ #1105           │ │ #1113           │ │ #1108           │       ││
│  │  │                 │ │                 │ │                 │       ││
│  │  │ Status: Free    │ │ Status: In Ring │ │ Status: Free    │       ││
│  │  │ Next: 2:00 PM   │ │ Ring: Intl Ring │ │ Next: 3:30 PM   │       ││
│  │  │ Classes: 4      │ │ Order: #23/68   │ │ Classes: 2      │       ││
│  │  │                 │ │                 │ │                 │       ││
│  │  │ Today: 2W 1P    │ │ Today: 1W       │ │ Today: --       │       ││
│  │  │ [View Details]  │ │ [View Details]  │ │ [View Details]  │       ││
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘       ││
│  │                                                                     ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

**Horse Card Components:**

```typescript
interface HorseCardProps {
  id: string;
  name: string;
  backNumber: string;
  status: "free" | "in_ring" | "upcoming" | "done_for_day";
  currentRing?: string;
  orderOfGo?: number;
  totalInClass?: number;
  nextClassTime?: string;
  nextClassName?: string;
  classesToday: number;
  completedToday: number;
  winsToday: number;
  placingsToday: number;
}
```

**Card Design:**
- White card with subtle shadow
- Left accent border (green for competing, gray for inactive)
- Horse icon in green circle
- Horse name (bold) + Back number (muted)
- Status badge (colored pill)
- Next class or current class info
- Mini stats row: "2W 1P" (2 wins, 1 placing)
- Click → Navigate to horse detail

**API Endpoints Needed:**

```python
GET /api/horses
Query params: ?status=all|competing|free|in_ring&date=2026-02-11
Response:
{
    "horses": [
        {
            "id": "uuid",
            "name": "OSTWIND 59",
            "back_number": "1105",
            "status": "free",
            "current_ring": null,
            "order_of_go": null,
            "total_in_class": null,
            "next_class_time": "14:00:00",
            "next_class_name": "Junior Jumper",
            "free_minutes": 135,
            "classes_today": 4,
            "completed_today": 2,
            "wins_today": 1,
            "placings_today": 2,
            "total_prize_money_today": 78.00
        }
    ],
    "total": 12,
    "competing_today": 8,
    "in_ring": 1,
    "free": 7
}
```

---

### Page 3: Horse Detail

**Route:** `/horses/[id]`

**Purpose:** Complete information about a single horse

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Horses > OSTWIND 59                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  HORSE HEADER                                                       ││
│  │  ┌────────┐                                                         ││
│  │  │  🐴    │  OSTWIND 59                                             ││
│  │  │  icon  │  Back Number: #1105                                     ││
│  │  └────────┘  Status: [Free - 2h 15m]                                ││
│  │              Trainer: EMILY SMITH                                   ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌───────────────────────┐ ┌───────────────────────────────────────────┐│
│  │  TODAY'S STATS        │ │  PERFORMANCE CHART                        ││
│  │                       │ │                                           ││
│  │  Classes: 4           │ │  [Line/Bar chart showing placings         ││
│  │  Completed: 2         │ │   over last 10 classes]                   ││
│  │  Wins: 1              │ │                                           ││
│  │  Placings: 2          │ │                                           ││
│  │  Prize Money: $78.00  │ │                                           ││
│  │  Points: 8            │ │                                           ││
│  └───────────────────────┘ └───────────────────────────────────────────┘│
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  TODAY'S SCHEDULE                                                   ││
│  │                                                                     ││
│  │  ┌─────────────────────────────────────────────────────────────────┐││
│  │  │ ✅ 07:15 AM │ $150 Green Hunter │ Intl Ring │ 1st │ $45.00     │││
│  │  ├─────────────────────────────────────────────────────────────────┤││
│  │  │ ✅ 09:00 AM │ 1.25m Jumper      │ Ring 7    │ 3rd │ $22.50     │││
│  │  ├─────────────────────────────────────────────────────────────────┤││
│  │  │ ⏳ 02:00 PM │ Junior Jumper     │ Intl Ring │ --  │ Upcoming   │││
│  │  ├─────────────────────────────────────────────────────────────────┤││
│  │  │ ⏳ 04:30 PM │ Grand Prix        │ Intl Ring │ --  │ Upcoming   │││
│  │  └─────────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  RECENT HISTORY (Last 10 entries)                                   ││
│  │                                                                     ││
│  │  Table: Date | Class | Ring | Rider | Placing | Faults | Time      ││
│  │                                                                     ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

**Components:**

1. **Horse Header**
   - Large horse icon (in green circle)
   - Horse name (serif heading)
   - Back number, status badge, trainer name

2. **Today's Stats Card**
   - Key metrics for today
   - Icon + value + label for each stat

3. **Performance Chart**
   - Line chart or bar chart
   - X-axis: Last 10 classes (or date range)
   - Y-axis: Placing (inverted, so 1st is at top)
   - Optional: Faults trend line

4. **Today's Schedule Table**
   - All classes for today
   - Status icon (✅ completed, 🔴 in progress, ⏳ upcoming)
   - Time, class name, ring, placing, prize money

5. **Recent History Table**
   - Last 10-20 entries across shows
   - Sortable columns
   - Date, show, class, rider, placing, faults, time, prize

**API Endpoints Needed:**

```python
GET /api/horses/{id}
Response:
{
    "horse": {
        "id": "uuid",
        "name": "OSTWIND 59",
        "back_number": "1105",
        "status": "active",
        "trainer_name": "EMILY SMITH"
    },
    "current_show": {
        "id": "uuid",
        "name": "2026 WEF 6",
        "status": "free",
        "free_minutes": 135,
        "next_class_time": "14:00:00"
    },
    "today_stats": {
        "classes": 4,
        "completed": 2,
        "wins": 1,
        "placings": 2,
        "prize_money": 78.00,
        "points": 8
    },
    "today_schedule": [
        {
            "entry_id": "uuid",
            "class_name": "$150 Green Hunter",
            "class_number": "2401",
            "ring_name": "International Ring",
            "estimated_start": "07:15:00",
            "status": "completed",
            "rider_name": "JORDAN GIBBS",
            "placing": 1,
            "prize_money": 45.00,
            "faults_one": 0,
            "time_one": 45.23
        }
    ],
    "performance_chart": [
        {
            "date": "2026-02-11",
            "class_name": "$150 Green Hunter",
            "placing": 1,
            "faults": 0
        }
    ],
    "recent_history": [
        {
            "date": "2026-02-11",
            "show_name": "WEF 6",
            "class_name": "$150 Green Hunter",
            "ring_name": "International Ring",
            "rider_name": "JORDAN GIBBS",
            "placing": 1,
            "faults_one": 0,
            "time_one": 45.23,
            "prize_money": 45.00
        }
    ]
}
```

---

### Page 4: Results

**Route:** `/results`

**Purpose:** View performance statistics and results history

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Header: "Results & Performance" + Date Range Picker + Refresh          │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  SUMMARY STATS ROW                                                  ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               ││
│  │  │ Total    │ │ Wins     │ │ Prize    │ │ Points   │               ││
│  │  │ Classes  │ │ (1st)    │ │ Money    │ │ Earned   │               ││
│  │  │   128    │ │   12     │ │ $3,450   │ │   156    │               ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘               ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌─────────────────────────────┐ ┌─────────────────────────────────────┐│
│  │  PLACINGS DISTRIBUTION     │ │  PRIZE MONEY TREND                  ││
│  │                             │ │                                     ││
│  │  [Pie/Donut Chart]          │ │  [Line Chart]                       ││
│  │                             │ │                                     ││
│  │  1st: 12 (15%)              │ │  Daily prize money over             ││
│  │  2nd: 18 (22%)              │ │  selected date range                ││
│  │  3rd: 15 (19%)              │ │                                     ││
│  │  4th-8th: 25 (31%)          │ │                                     ││
│  │  Unplaced: 10 (13%)         │ │                                     ││
│  └─────────────────────────────┘ └─────────────────────────────────────┘│
│                                                                         │
│  ┌─────────────────────────────┐ ┌─────────────────────────────────────┐│
│  │  TOP PERFORMERS            │ │  PERFORMANCE BY CLASS TYPE          ││
│  │                             │ │                                     ││
│  │  [Bar Chart - Horizontal]   │ │  [Bar Chart]                        ││
│  │                             │ │                                     ││
│  │  OSTWIND: 5 wins            │ │  Hunters: 45% placing rate          ││
│  │  KINGDOM: 3 wins            │ │  Jumpers: 38% placing rate          ││
│  │  CAYMAN: 2 wins             │ │                                     ││
│  └─────────────────────────────┘ └─────────────────────────────────────┘│
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  RESULTS TABLE                                                      ││
│  │                                                                     ││
│  │  [Filters: Horse | Class Type | Placing | Date]                     ││
│  │                                                                     ││
│  │  Date       │ Horse    │ Class          │ Ring  │ Place │ Prize    ││
│  │  ─────────────────────────────────────────────────────────────────  ││
│  │  Feb 11     │ OSTWIND  │ Green Hunter   │ Intl  │ 1st   │ $45.00   ││
│  │  Feb 11     │ KINGDOM  │ 1.25m Jumper   │ Ring7 │ 2nd   │ $33.00   ││
│  │  Feb 10     │ CAYMAN   │ Junior Jumper  │ Intl  │ 3rd   │ $22.50   ││
│  │  ...        │ ...      │ ...            │ ...   │ ...   │ ...      ││
│  │                                                                     ││
│  │  [Pagination: < 1 2 3 4 5 ... 10 >]                                 ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

**Components:**

1. **Summary Stats Row**
   - 4 large stat cards
   - Total classes, wins, prize money, points

2. **Placings Distribution Chart**
   - Pie or donut chart
   - Breakdown by placing (1st, 2nd, 3rd, 4th-8th, Unplaced)
   - Use warm colors for 1st-3rd, muted for rest

3. **Prize Money Trend Chart**
   - Line chart
   - X-axis: Dates
   - Y-axis: Daily/cumulative prize money
   - Hover to see details

4. **Top Performers Chart**
   - Horizontal bar chart
   - Horses ranked by wins or placings
   - Show top 5-10

5. **Performance by Class Type**
   - Bar chart comparing Hunters vs Jumpers
   - Metric: Placing rate (% of entries that placed)

6. **Results Table**
   - Full list of results
   - Filterable, sortable, paginated
   - Export to CSV option

**API Endpoints Needed:**

```python
GET /api/results
Query params: ?from=2026-02-01&to=2026-02-11&horse_id=&class_type=
Response:
{
    "summary": {
        "total_classes": 128,
        "wins": 12,
        "total_placings": 70,
        "prize_money": 3450.00,
        "points": 156
    },
    "placings_distribution": [
        {"place": "1st", "count": 12, "percentage": 15},
        {"place": "2nd", "count": 18, "percentage": 22},
        {"place": "3rd", "count": 15, "percentage": 19},
        {"place": "4th-8th", "count": 25, "percentage": 31},
        {"place": "Unplaced", "count": 10, "percentage": 13}
    ],
    "prize_money_trend": [
        {"date": "2026-02-01", "amount": 250.00},
        {"date": "2026-02-02", "amount": 180.00}
    ],
    "top_performers": [
        {"horse_name": "OSTWIND 59", "wins": 5, "placings": 12, "prize_money": 890.00},
        {"horse_name": "KINGDOM Z", "wins": 3, "placings": 8, "prize_money": 540.00}
    ],
    "class_type_performance": [
        {"type": "Hunters", "entries": 45, "placings": 28, "rate": 62},
        {"type": "Jumpers", "entries": 83, "placings": 42, "rate": 51}
    ],
    "results": [
        {
            "id": "uuid",
            "date": "2026-02-11",
            "horse_name": "OSTWIND 59",
            "class_name": "$150 Green Hunter",
            "class_type": "Hunters",
            "ring_name": "International Ring",
            "rider_name": "JORDAN GIBBS",
            "placing": 1,
            "faults": 0,
            "time": 45.23,
            "prize_money": 45.00,
            "points": 5
        }
    ],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total": 128,
        "total_pages": 7
    }
}
```

---

### Page 5: Notification Log

**Route:** `/notifications`

**Purpose:** View history of system notifications and alerts

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Header: "Notification Log" + Filter + Date Range + Refresh             │
├─────────────────────────────────────────────────────────────────────────┤
│  Filter Pills: [All] [Results] [Time Changes] [Class Status] [System]  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  NOTIFICATION LIST                                                  ││
│  │                                                                     ││
│  │  ┌──────────────────────────────────────────────────────────────┐  ││
│  │  │ 🏆 10:47 AM                                        [Result]  │  ││
│  │  │                                                              │  ││
│  │  │ OSTWIND 59 placed 1st                                        │  ││
│  │  │ Class: $150 Green Hunter • Prize: $45.00                     │  ││
│  │  └──────────────────────────────────────────────────────────────┘  ││
│  │                                                                     ││
│  │  ┌──────────────────────────────────────────────────────────────┐  ││
│  │  │ ⏰ 10:15 AM                                   [Time Change]  │  ││
│  │  │                                                              │  ││
│  │  │ Class 1095 time changed                                      │  ││
│  │  │ 11:30 AM → 11:50 AM • Ring: International                    │  ││
│  │  └──────────────────────────────────────────────────────────────┘  ││
│  │                                                                     ││
│  │  ┌──────────────────────────────────────────────────────────────┐  ││
│  │  │ 🟢 09:00 AM                                  [Class Status]  │  ││
│  │  │                                                              │  ││
│  │  │ Class 2401 started                                           │  ││
│  │  │ $150 Green Hunter • Our horses: OSTWIND, KINGDOM             │  ││
│  │  └──────────────────────────────────────────────────────────────┘  ││
│  │                                                                     ││
│  │  ┌──────────────────────────────────────────────────────────────┐  ││
│  │  │ 📊 06:00 AM                                       [System]   │  ││
│  │  │                                                              │  ││
│  │  │ Morning sync completed                                       │  ││
│  │  │ Loaded 12 horses, 28 classes for today                       │  ││
│  │  └──────────────────────────────────────────────────────────────┘  ││
│  │                                                                     ││
│  │  [Load More]                                                        ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

**Notification Types:**

| Type | Icon | Color | Example |
|------|------|-------|---------|
| Result | 🏆 | Gold/Warm | "OSTWIND placed 1st" |
| Time Change | ⏰ | Orange | "Class 1095 time changed" |
| Class Started | 🟢 | Green | "Class 2401 started" |
| Class Completed | 🏁 | Green | "Class 2401 completed" |
| Horse Completed | ✅ | Green | "OSTWIND finished trip" |
| Scratched | ❌ | Red | "KINGDOM scratched" |
| System | 📊 | Blue/Gray | "Morning sync completed" |
| Reminder | ⏰ | Orange | "OSTWIND class in 30 min" |

**Notification Card Design:**
- Left icon in colored circle
- Timestamp on right
- Type badge/pill
- Main message (bold)
- Secondary details (muted)

**API Endpoints Needed:**

```python
# You'll need a notifications table in the database
# Add this to store sent notifications

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id),
    type VARCHAR(50) NOT NULL,  -- result, time_change, class_status, system, reminder
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,  -- Additional data (horse_id, class_id, etc.)
    sent_to_telegram BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GET /api/notifications
Query params: ?type=all|result|time_change|class_status|system&from=&to=&limit=50&offset=0
Response:
{
    "notifications": [
        {
            "id": "uuid",
            "type": "result",
            "title": "OSTWIND 59 placed 1st",
            "message": "Class: $150 Green Hunter • Prize: $45.00",
            "metadata": {
                "horse_id": "uuid",
                "class_id": "uuid",
                "placing": 1,
                "prize_money": 45.00
            },
            "sent_to_telegram": true,
            "created_at": "2026-02-11T10:47:00Z"
        }
    ],
    "total": 156,
    "has_more": true
}
```

---

## Shared Components

### 1. Sidebar

```typescript
// Navigation items
const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Horses", href: "/horses", icon: Horse },
  { name: "Results", href: "/results", icon: Trophy },
  { name: "Notifications", href: "/notifications", icon: Bell },
];
```

- Fixed left sidebar on desktop
- Bottom navigation on mobile
- Active state: green background
- Farm name/logo at top
- Collapse button optional

### 2. Header

- Page title (serif font, green)
- Breadcrumb on detail pages
- Refresh button (always visible)
- Optional: date picker, filters

### 3. Status Badges

```typescript
const statusColors = {
  completed: "bg-green-100 text-green-800",
  in_progress: "bg-orange-100 text-orange-800",
  upcoming: "bg-gray-100 text-gray-800",
  free: "bg-blue-100 text-blue-800",
  in_ring: "bg-orange-100 text-orange-800",
  scratched: "bg-red-100 text-red-800",
};
```

### 4. Refresh Button

```typescript
interface RefreshButtonProps {
  onClick: () => void;
  loading: boolean;
  lastUpdated?: Date;
}
```

- Shows "Refreshing..." when loading
- Shows "Last updated: X min ago" when idle
- Triggers manual sync

### 5. Empty State

```typescript
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

### 6. Loading State

- Skeleton loaders matching card layouts
- Subtle animation
- Never block entire page

### 7. Error State

- Friendly error message
- Retry button
- Contact support link if persistent

---

## API Client Setup

```typescript
// lib/api/client.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors globally
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);
```

---

## React Query Hooks

```typescript
// lib/hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query';
import { getDashboardData } from '@/lib/api/dashboard';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardData,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

// lib/hooks/useHorses.ts
export function useHorses(filters?: HorseFilters) {
  return useQuery({
    queryKey: ['horses', filters],
    queryFn: () => getHorses(filters),
  });
}

// lib/hooks/useHorse.ts
export function useHorse(id: string) {
  return useQuery({
    queryKey: ['horse', id],
    queryFn: () => getHorse(id),
    enabled: !!id,
  });
}
```

---

## TypeScript Types

```typescript
// types/horse.ts
export interface Horse {
  id: string;
  name: string;
  backNumber: string;
  status: 'active' | 'inactive';
  metadata?: Record<string, unknown>;
}

// types/entry.ts
export interface Entry {
  id: string;
  horseId: string;
  horseName: string;
  riderId: string;
  riderName: string;
  showId: string;
  eventId: string;
  classId: string;
  className: string;
  ringName: string;
  backNumber: string;
  scheduledDate: string;
  estimatedStart: string;
  classStatus: 'Not Started' | 'In Progress' | 'Completed';
  status: 'active' | 'scratched' | 'completed';
  orderOfGo: number;
  totalTrips: number;
  completedTrips: number;
  placing: number | null;
  prizeMoney: number | null;
  faultsOne: number | null;
  timeOne: number | null;
}

// types/notification.ts
export interface Notification {
  id: string;
  type: 'result' | 'time_change' | 'class_status' | 'system' | 'reminder';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  sentToTelegram: boolean;
  createdAt: string;
}
```

---

## Implementation Order

### Phase 1: Foundation
1. Set up Next.js project with TypeScript
2. Configure TailwindCSS with design system colors/fonts
3. Install and configure shadcn/ui components
4. Create layout components (Sidebar, Header, PageContainer)
5. Set up API client and React Query

### Phase 2: Dashboard
1. Create QuickStats component
2. Create LiveClassCard component
3. Create TodaySchedule component
4. Create RecentResults component
5. Create HorseAvailability component
6. Assemble Dashboard page

### Phase 3: Horses
1. Create HorseCard component
2. Create HorseList page with filters
3. Create HorseDetail page
4. Create HorseSchedule component
5. Create PerformanceChart component

### Phase 4: Results
1. Create summary stats components
2. Create charts (Placings, PrizeMoney, TopPerformers)
3. Create ResultsTable with filters/pagination
4. Assemble Results page

### Phase 5: Notifications
1. Create NotificationItem component
2. Create NotificationList with filters
3. Create Notifications page

### Phase 6: Polish
1. Add loading states everywhere
2. Add error handling
3. Add empty states
4. Test responsive design
5. Performance optimization

---

## Important Notes for AI Agent

1. **Backend Access:** You have access to the FastAPI backend. Create or modify API endpoints as needed to support the frontend.

2. **Database:** The database schema is already defined. Add new tables (like notifications) if needed.

3. **Design System:** Strictly follow the design system JSON. Do not invent new colors or styles.

4. **Constants:** All text labels should come from constant files, not hardcoded.

5. **Reusability:** Check for existing components before creating new ones.

6. **Mobile First:** Build responsive from the start.

7. **TypeScript:** Use proper types everywhere. No `any`.

8. **Error Handling:** Every API call needs loading, error, and empty states.

9. **Charts:** Use Recharts. Keep them simple and readable.

10. **Performance:** Use React Query for caching. Lazy load heavy components.

---

## Getting Started Command

```bash
# Create Next.js project
npx create-next-app@latest horse-farm-dashboard --typescript --tailwind --eslint --app --src-dir

# Install dependencies
cd horse-farm-dashboard
npm install @tanstack/react-query axios recharts lucide-react

# Add shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card badge table tabs input

# Start development
npm run dev
```