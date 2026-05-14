# Vineyard Primary School — Management System

A full-stack School Management System (SMS) for **Vineyard Primary School**, built with React (web), Expo (mobile), Hono (API), and SQLite.

---

## Quick Start (Web)

```bash
bun install
bun run dev          # starts web + API on port 4200
```

Default admin login:
- **Email:** `admin@vineyard.school`
- **Password:** `admin123`

---

## Architecture

```
vineyard-school/
├── packages/
│   ├── web/          ← React frontend + Hono API (port 4200)
│   │   ├── src/
│   │   │   ├── server/       ← Hono API routes + DB
│   │   │   │   ├── routes/   ← all API endpoints
│   │   │   │   └── db/       ← SQLite via Drizzle ORM
│   │   │   └── web/          ← React pages + components
│   │   │       ├── pages/    ← one file per module
│   │   │       ├── components/  ← shared (Layout, Sidebar, etc.)
│   │   │       └── lib/      ← api client, auth client
│   └── mobile/       ← Expo React Native app
└── package.json
```

**Stack:** Bun · TypeScript · React · Wouter · TanStack Query · Hono · Drizzle ORM · SQLite · Better Auth · Expo

---

## Modules

| Module | Status | Notes |
|---|---|---|
| Dashboard | ✅ | Live stats, defaulters, recent payments |
| Students | ✅ | CRUD, admission no, class assignment |
| Staff | ✅ | CRUD, role, salary, subject |
| Classes | ✅ | CRUD, teacher assignment, streams |
| Attendance | ✅ | Daily tracking per student per class |
| Exams & Results | ✅ | Exam creation, result entry, grades |
| Timetable | ✅ | Per-class slot management |
| Report Cards | ✅ | Auto-generated from exam results |
| Certificates | ✅ | Completion/achievement certificates |
| Fees & Payments | ✅ | Fee structures, payment recording, defaulters |
| Payroll | ✅ | Staff salary processing |
| Accounts | ✅ | Income/expense ledger |
| Financial Reports | ✅ | Summary charts and exports |
| Communication | ✅ | Announcements + messages |
| Transport | ✅ | Routes and vehicle management |
| Library | ✅ | Book catalog and borrowing |
| Inventory | ✅ | School assets and stock |

---

## API Routes

All routes require a valid session cookie (set by `/api/auth` via Better Auth).

| Prefix | Resource |
|---|---|
| `/api/students` | Student CRUD |
| `/api/staff` | Staff CRUD |
| `/api/classes` | Class CRUD |
| `/api/attendance` | Attendance records |
| `/api/exams` | Exam records |
| `/api/results` | Exam results |
| `/api/subjects` | Subject list |
| `/api/fee-structures` | Fee structure definitions |
| `/api/fee-payments` | Fee payment records + defaulters |
| `/api/payroll` | Payroll entries |
| `/api/accounts` | Account transactions |
| `/api/certificates` | Certificate records |
| `/api/timetable` | Timetable slots |
| `/api/transport` | Transport routes |
| `/api/library` | Library catalog |
| `/api/inventory` | Inventory items |
| `/api/communication` | Messages/announcements |
| `/api/reports` | Financial report summaries |
| `/api/dashboard/stats` | Aggregated dashboard stats |
| `/api/auth/*` | Auth (Better Auth handles all sign-in/out/session) |

---

## Database

SQLite file: `packages/web/school.db`

Migrations via Drizzle Kit:
```bash
cd packages/web
bun drizzle-kit push
```

---

## Environment Variables

Create `packages/web/.env`:
```
DATABASE_URL=file:school.db
BETTER_AUTH_SECRET=your-secret-here
```

---

## Mobile App

The Expo mobile app mirrors the web app's core features.

```bash
cd packages/mobile
bun start          # Expo dev server
```

To build APK/IPA → use the **Publish** button in the Runable platform dashboard.

---

## Design System

| Token | Value | Use |
|---|---|---|
| `--accent` | `#E91E8C` | Buttons, links, highlights |
| `--teal` / `--sidebar-bg` | `#1B4D4D` | Sidebar, headings |
| `--bg-primary` | `#FFFFFF` | Page background |
| `--bg-secondary` | `#F8FAFC` | Card background |
| Font (headings) | Dancing Script | Vineyard branding |
| Font (body) | Poppins | All UI text |

---

## Deployment

The app is a single Bun server serving both the React SPA and the Hono API.

```bash
bun run build    # builds React → dist/
bun run start    # serves dist/ + API
```

> The **Publish** button in the Runable web dashboard handles domain, SSL, and deployment automatically.

---

*Built with the Runable platform · May 2025*
