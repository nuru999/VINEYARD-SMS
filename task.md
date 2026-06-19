# VINEYARD-SMS QA Sweep

## Status: COMPLETE ✅

## Commits pushed to main:
- `ab07c1c` — fix: attendance filter bug, marks pre-fill, attendance+results upsert
- `e800d55` — previous fixes (auth, dashboard, etc.)

## All bugs fixed:

### 1. attendance.tsx — filter bug ✅
- `studentsData?.students?.filter(...)` → `(Array.isArray(studentsData) ? studentsData : []).filter(...)`
- `classesData?.classes` → `(Array.isArray(classesData) ? classesData : [])`

### 2. attendance.tsx — marks not pre-filled ✅
- Added `useEffect` that calls `initMarksFromAttendance()` whenever `date`, `classId`, or `attendanceData` changes
- Marks now auto-load from existing DB records

### 3. attendance.ts — duplicate insert ✅
- Before bulk insert: `DELETE WHERE classId = x AND date = y`
- Then fresh insert — no more duplicate rows

### 4. exams.ts — duplicate exam results ✅
- Added per-result upsert: check if `(examId, studentId, subjectId)` exists → UPDATE if yes, INSERT if no
- Works for both array and single-record POST

## Render: auto-deploys from main push
URL: https://vineyard-sms-gq1q.onrender.com
