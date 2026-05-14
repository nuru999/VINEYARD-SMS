# Vineyard Primary School — Management System

A full-stack school management platform built for **Vineyard Primary School, Kenya**.  
Live: [https://tev9r78fiuvrwtmm0bicj-preview-4200.runable.site/](https://tev9r78fiuvrwtmm0bicj-preview-4200.runable.site/)

---

## Features

| Module | What it does |
|--------|-------------|
| **Dashboard** | KPI overview — students, fees collected, attendance, payroll |
| **Students** | Enrol, edit, archive students; class assignment |
| **Staff** | Staff records, contact details (admin-only) |
| **Classes & Subjects** | Create classes, assign subjects per class |
| **Attendance** | Daily mark-in by class; weekly summary |
| **Exams & Results** | Create exams, record scores per student per subject |
| **Timetable** | Weekly schedule builder by class |
| **Report Cards** | Auto-generated from exam data; printable |
| **Certificates** | Issue achievement/completion certificates |
| **Fees & Payments** | Fee structure per class; record payments; outstanding balance |
| **Payroll** | Generate monthly payroll for staff |
| **Accounts** | Income & expense ledger |
| **Reports** | Aggregate analytics across all modules |
| **Communication** | Compose notices to parents / staff |
| **Transport** | Route & vehicle management |
| **Library** | Book inventory tracking |
| **Inventory** | School assets management |
| **User Management** | Add/remove admin & teacher login accounts (max 2 admins) |

---

## Tech Stack

- **Frontend**: React 19 + Vite + Wouter (SPA routing)
- **Backend**: Hono API (Bun runtime)
- **Auth**: better-auth (email/password, session-based)
- **Database**: Turso (libSQL / SQLite edge)
- **Styling**: Inline styles (no CSS framework dependency)
- **Deployment**: Runable platform (Node/Bun serverless)

---

## Role System

| Role | Access |
|------|--------|
| `admin` | All modules including Staff, Fees, Payroll, Accounts, Reports, User Management |
| `teacher` | All student-facing modules: Students, Classes, Attendance, Exams, Timetable, Report Cards, Certificates, Communication, Transport, Library, Inventory |

- Maximum **2 admin accounts** enforced at signup
- Role stored in `user_profiles` table; checked server-side on every protected API call

---

## Local Development

### Prerequisites
- [Bun](https://bun.sh) ≥ 1.1
- A [Turso](https://turso.tech) database (free tier works)

### Setup

```bash
git clone https://github.com/nuru999/VINEYARD-SMS.git
cd VINEYARD-SMS

# Install dependencies
bun install

# Copy env template
cp .env.example .env
# Fill in your Turso DATABASE_URL and DATABASE_AUTH_TOKEN

# Run database migrations
cd packages/web
bun src/api/database/migrate.ts

# Start dev server (port 4200)
bun dev
```

### Environment Variables

```
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-token-here
BETTER_AUTH_SECRET=any-long-random-string
BASE_URL=http://localhost:4200
```

---

## First-Time Setup (Production)

1. Deploy to your hosting platform
2. Set the environment variables above
3. Run migrations once: `bun src/api/database/migrate.ts`
4. Create the first admin account via the sign-up API:
   ```bash
   curl -X POST https://your-domain.com/api/auth/sign-up/email \
     -H "Content-Type: application/json" \
     -d '{"name":"School Admin","email":"admin@yourschool.com","password":"YourSecurePassword"}'
   ```
5. Manually set that user as admin in the database:
   ```sql
   INSERT INTO user_profiles (user_id, role) VALUES ('<userId-from-above>', 'admin');
   ```
6. Sign in at `/sign-in`

---

## Project Structure

```
packages/
  web/
    src/
      api/
        database/       # Schema, migrations, DB client
        middleware/      # Auth, requireAdmin middleware
        routes/          # All API route handlers
        auth.ts          # better-auth configuration
        index.ts         # Hono app entry
      web/
        components/      # Sidebar, shared UI
        lib/             # Auth client
        pages/           # All 18 page components
        app.tsx          # Router + ProtectedRoute/AdminRoute
        main.tsx         # React entry
```

---

## Database Schema (key tables)

- `user` / `session` / `account` / `verification` — better-auth managed
- `user_profiles` — `user_id`, `role` (admin|teacher)
- `students` — full student records
- `staff` — staff records
- `classes` — class definitions
- `subjects` — subjects per class
- `attendance` / `attendance_records` — daily attendance
- `exams` / `exam_results` — exam scores
- `timetable_entries` — weekly schedule
- `fee_structures` / `fee_payments` — fees
- `payroll_records` — payroll
- `transactions` — accounts ledger
- `messages` — communication
- `transport_routes` / `vehicles` — transport
- `books` — library
- `inventory_items` — inventory
- `certificates` — issued certificates

---

## Handover Notes (for school IT supervisor)

- **Login URL**: `/sign-in`  
- **Admin credentials**: Contact the person who set up the system — passwords are not stored in plain text  
- **Backups**: Turso provides automatic cloud backups; export via Turso dashboard  
- **Adding teachers**: Go to **User Management** → **Add User** → select role "Teacher"  
- **Max admins**: System enforces maximum 2 admin accounts  
- **Support**: Raise issues on [GitHub](https://github.com/nuru999/VINEYARD-SMS/issues)

---

## License

Private — Vineyard Primary School, Kenya. All rights reserved.
