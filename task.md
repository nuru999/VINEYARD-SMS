# Task Scratchpad

## Goal
Finalize school role model:
- admin: full access
- principal: full read / oversight
- teacher: only assigned class + own subject timetable
- one class teacher per class

## Done
- principal role added
- teacher one-class ownership enforced in class assignment
- teacher dashboard no longer uses staff API
- build passes
- committed/pushed: 1d5ba46

## Next
- audit timetable / exams / results / attendance / subjects routes for teacher scoping
- audit UI for role labels and principal handling
- add principal dashboard or route behavior if needed
- ensure no admin-only endpoint is fetched by teachers
