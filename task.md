# VINEYARD-SMS QA Sweep

## Status: FIXING

## Bugs to Fix

### CRITICAL
1. **Attendance page** — `studentsData?.students?.filter(...)` wrong. Query already unwraps to array. Should be `studentsData?.filter(...)`.
2. **Attendance duplicate insert** — POST just inserts without checking. Need upsert (delete+insert for same classId+date combo).
3. **Attendance pre-fill** — existing attendance for selected date/class not pre-loaded into marks state.

### MINOR
4. **Exams results `saveResult`** — if user tries to POST a result that already exists (same exam+student+subject), it silently creates a duplicate. Add upsert logic in route.
5. **classes route returns `{classes:[]}` but some pages expect raw array** — already handled with `(r as any).classes ?? r` pattern. Consistent ✓

## Already Good
- index.ts role guards: correct (uses requireAdminOrAccountant, requireFinanceAccess etc.)
- dashboard count Number() cast: done
- middleware: all 5 middlewares present and correct
- /api/me: returns role correctly
- fees page: full featured, correct
- schema: all tables present
- CORS: fixed

## Fixes to Push
1. Fix attendance.tsx filter bug
2. Add attendance upsert in route (DELETE existing for same students+date, then INSERT)
3. Pre-fill attendance marks from existing data
4. Add upsert to exam results route

## Done
- [ ] Fix attendance.tsx
- [ ] Fix attendance route upsert
- [ ] Fix exam results upsert  
- [ ] Build + push
