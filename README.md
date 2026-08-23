# Vineyard Primary School — Management System

A full-stack school management platform for Vineyard Primary School, built as a Bun workspace with a React web client and a Hono API.

## Core modules

- Dashboard and school KPIs
- Students, classes, sections and subjects
- Staff records and attendance
- Student attendance
- Exams, results and report cards
- Fees, payments, payroll and accounts
- Timetable and certificates
- Communication
- Transport
- Library
- Inventory
- School settings
- User and role management

## Tech stack

- **Web:** React 19, Vite, Wouter
- **API:** Hono
- **Runtime:** Bun
- **Authentication:** Better Auth
- **Database:** Turso / libSQL with Drizzle ORM
- **Monorepo tooling:** Bun workspaces + Turbo
- **Deployment:** Bun/Node-compatible hosting; a Dockerfile is included

## Role system

The application currently supports four school roles:

| Role | Intended access |
|---|---|
| `admin` | Full school administration and user management |
| `principal` | School leadership access, including staff, attendance, timetable and operational modules |
| `teacher` | Student-facing modules scoped to the teacher's assigned class where applicable |
| `accountant` | Finance-focused access to fee structures, payments, payroll and accounts |

Authorization is enforced on the server. A valid Better Auth session alone is **not enough** to use the school API: the account must also have a matching row in `user_profiles`.

This prevents a self-created authentication account from automatically becoming a usable school account.

## Security rules currently enforced

- All school API routes require an authenticated, registered school user.
- Maximum of two admin profiles is enforced by user-management logic.
- Teachers can only read/write attendance for classes assigned to their user account.
- Teachers can only read report cards for their assigned classes.
- Staff operations are limited to admin/principal.
- Finance routes are restricted by finance roles.
- Transport, certificate, library and inventory mutations are restricted to admin/principal.
- User creation validates class assignment before related records are persisted.

## Project structure

```text
VINEYARD-SMS/
├── packages/
│   ├── web/
│   │   ├── src/api/
│   │   │   ├── database/       # Drizzle schema and database client
│   │   │   ├── middleware/     # Authentication and role middleware
│   │   │   ├── routes/         # Hono route modules
│   │   │   ├── auth.ts         # Better Auth configuration
│   │   │   └── index.ts        # API composition
│   │   ├── src/web/            # React application
│   │   └── server.ts           # Production Hono + static server
│   ├── desktop/
│   └── mobile/
├── .env.example
├── Dockerfile
├── package.json
├── bun.lock
└── turbo.json
```

## Local development

### Requirements

- Bun 1.3.x
- A Turso/libSQL database

### Setup

```bash
git clone https://github.com/nuru999/VINEYARD-SMS.git
cd VINEYARD-SMS

bun install
cp .env.example .env
```

Edit `.env` and provide your database and auth values.

### Environment variables

```env
DATABASE_URL=libsql://your-database.turso.io
DATABASE_AUTH_TOKEN=your-turso-auth-token
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
WEBSITE_URL=http://localhost:4200
REMOTE_URL=
PORT=3000
```

`WEBSITE_URL` is the primary application origin used by Better Auth/CORS. `REMOTE_URL` is an optional fallback for hosted environments.

### Database commands

From the repository root:

```bash
bun run db:generate
bun run db:migrate
```

You can also inspect the database with:

```bash
bun run db:studio
```

### Run the web application

```bash
bun run dev
```

### Production build

```bash
cd packages/web
bun run build
bun run start
```

The production server uses `PORT` when supplied by the hosting platform.

## First admin bootstrap

Better Auth email/password signup is still enabled for bootstrap compatibility, but an auth account without a `user_profiles` row cannot access the school API.

For the initial installation:

1. Create the first authentication account.
2. Add its `user.id` to `user_profiles` with role `admin` directly in the database.
3. Sign in as that admin.
4. Create all future school users through the application's User Management module.

For a future hardening pass, public signup can be disabled entirely after migrating user creation to Better Auth's Admin plugin.

## Database overview

Important application tables include:

- `user_profiles`
- `classes`, `sections`, `subjects`
- `staff`, `staff_attendance`
- `students`, `attendance`
- `exams`, `exam_results`
- `fee_structures`, `fee_payments`
- `payroll`, `transactions`
- `timetable_slots`
- `messages`
- `transport_routes`, `transport_assignments`
- `library_books`, `library_borrows`
- `inventory_items`
- `certificates`
- `school_settings`

Better Auth manages `user`, `session`, `account` and `verification`.

## CI

Pull requests to `main` run a GitHub Actions build check for the web package using Bun.

## Current engineering priorities

1. Complete backend authorization hardening.
2. Add systematic request validation with Zod.
3. Add database foreign keys/unique constraints where appropriate and generate migrations.
4. Add API tests for role boundaries and critical flows.
5. Verify deployment configuration and production environment variables.
6. Add screenshots/demo information for portfolio presentation.

## License

Private project for Vineyard Primary School. All rights reserved.
