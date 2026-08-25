# Vineyard Primary School — Management System

A full-stack school management platform for Vineyard Primary School, with web, mobile, and desktop clients.

**Production:** https://vineyard-sms-gq1q.onrender.com

## Core modules

- Dashboard and role-specific dashboards
- Students, staff, classes, subjects, and teacher assignment
- Attendance, exams, results, timetables, report cards, and certificates
- Fees, payments, payroll, accounts, and reports
- Communication, transport, library, and inventory
- User management, profile/settings, and admin security tools

## Roles

The application currently supports four roles:

| Role | Main access |
| --- | --- |
| `admin` | Full system access, user management, security, academics, and finance |
| `principal` | School oversight, staff, academics, fees, and reports |
| `teacher` | Class/student academic workflows assigned to the teacher |
| `accountant` | Fees, payroll, accounts, and finance reports |

Authorization is enforced server-side; the UI also hides or redirects users from pages outside their role.

## Tech stack

- **Web:** React 19, Vite, Wouter, TanStack Query
- **API:** Hono on Bun
- **Authentication:** Better Auth
- **Database:** Turso/libSQL with Drizzle ORM
- **Mobile:** Expo / React Native
- **Desktop:** Electron
- **Deployment:** Render
- **CI:** GitHub Actions for web and mobile checks

## Repository structure

```text
.github/workflows/        CI workflows
docs/                     Presentation/readiness documentation
packages/
  web/                    React web app + Hono API
  mobile/                 Expo mobile client
  desktop/                Electron desktop client
Dockerfile                Production container build
nixpacks.toml              Render/Nixpacks build configuration
package.json               Bun workspace configuration
turbo.json                 Turborepo task configuration
```

## Local development

### Requirements

- Bun 1.3.5 (matches the repository package manager and CI)
- A Turso/libSQL database

### Install

```bash
git clone https://github.com/nuru999/VINEYARD-SMS.git
cd VINEYARD-SMS
bun install
```

Create a root `.env` file locally. Do **not** commit it.

```env
DATABASE_URL=libsql://your-database.turso.io
DATABASE_AUTH_TOKEN=your-token
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
WEBSITE_URL=http://localhost:4200
```

### Web app

```bash
bun run dev
```

The Vite development server uses port `4200`.

### Database commands

From the repository root:

```bash
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:studio
```

Use the command appropriate for the database change you are making; do not run destructive schema operations against production without a backup.

### Mobile app

```bash
bun run dev:mobile
```

The checked-in Expo configuration points to the production API. For development builds, use the supported Expo environment configuration when you need to target another API.

### Desktop app

```bash
bun run dev:desktop
```

The Electron client defaults to the production Render service and can be overridden by `REMOTE_URL` or `WEBSITE_URL`.

## Quality checks

Web CI installs dependencies with the frozen Bun lockfile, runs the Bun regression tests, type-checks the web package, and builds the production web bundle. Mobile CI provides a separate TypeScript gate.

Before merging application changes, keep both workflows green.

## Security notes

- Secrets belong in environment variables, never source control.
- Passwords are handled through Better Auth and are not stored in plaintext.
- Protected API routes enforce role permissions server-side.
- Admin credential recovery/rotation tooling is intended for controlled operational use.
- The public health endpoint is for liveness/deployment verification and should not expose secrets.

## Presentation readiness

See `docs/PRESENTATION-READINESS.md` for the production/demo checklist, role checks, and acceptance guidance.

## License

No open-source license file is currently included in this repository. Unless a license is added, normal copyright restrictions apply.
