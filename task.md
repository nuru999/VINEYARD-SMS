# VINEYARD-SMS Fix & Improvement Plan

## BUGS (Critical)
1. **dashboard.ts** — `studentCount.count` → should be `studentCount[0].count` (drizzle returns array). All dashboard stats show `—`.
2. **CORS origin** — fixed in prev commit (7fae42e)
3. **auth.ts fallback** — fixed in prev commit
4. **desktop .env** — fixed in prev commit

## BUGS (Minor)
5. **index.tsx (dashboard)** — fee defaulters WhatsApp link crashes if `d.student.parentPhone` is null (no null check before `.replace`)
6. **session.ts** — `/api/me` fetch uses relative URL, fine on web but could fail if baseURL ever changes
7. **communication page** — `recipientLabel` uses `s.firstName/s.lastName` but schema has just `name` field — broken display

## UI/UX Improvements
- [ ] Responsive sidebar (collapses on small screens)
- [ ] Toast notifications (success/error) instead of silent failures
- [ ] Loading skeletons instead of plain "Loading..." text
- [ ] Empty states with helpful CTAs
- [ ] Dashboard: "Quick Actions" bar for common tasks
- [ ] Sticky table headers on long lists

## New Features
- [ ] Notification bell in header (unread messages count)
- [ ] Dark mode toggle
- [ ] Export to CSV/PDF on more pages (attendance, exams)
- [ ] SMS/WhatsApp blast from dashboard (not just fees page)

## Performance
- [ ] Add staleTime to all queries (currently refetching on every focus)
- [ ] Paginate student/payment lists (currently loads all)

## STATUS
- [x] Commit 7fae42e — CORS + auth + desktop env fixed
- [ ] This session — fix dashboard count bug + minor bugs + UI improvements
