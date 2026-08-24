# VINEYARD-SMS — Owner Presentation Readiness

Use this checklist on production before presenting the system to the school owner. Do not use real student financial or academic data for destructive tests; create clearly named demo records where a write test is needed.

## 1. Presentation blockers — must be green

- [ ] Production `/api/health` returns HTTP 200 with `{ "status": "ok" }`.
- [ ] Homepage loads without a blank screen or console-breaking error.
- [ ] Principal password has been rotated away from the historical seeded credential.
- [ ] Teacher password has been rotated away from the historical seeded credential.
- [ ] Accountant historical credential has been checked and rotated if necessary.
- [ ] After each password change, confirm the old password no longer signs in.
- [ ] Web CI is green: fee regression tests, TypeScript and production build.
- [ ] Mobile CI is green.

## 2. Admin acceptance test

Sign in as an Admin account that uses a private password.

- [ ] Dashboard loads student, staff, class and finance totals.
- [ ] Students: create a DEMO student, edit it, confirm class/section details, then delete it only if it has no linked history.
- [ ] Staff: create/edit a DEMO staff record and confirm invalid records are rejected.
- [ ] User Management: create a DEMO teacher login with a strong unique password; assign and unassign a class; change the role and confirm class assignment is cleared when leaving Teacher.
- [ ] Classes / Sections / Subjects: create or edit a DEMO academic structure and verify duplicate/invalid relationships are rejected.
- [ ] Settings: update a harmless presentation value if appropriate, save, refresh and confirm it persists.
- [ ] Fees: create/inspect a fee structure and verify amount/frequency/class rules.
- [ ] Accounts: create a small clearly labelled DEMO income or expense transaction, edit it, then delete it.
- [ ] Payroll: inspect current payroll and verify duplicate staff/month/year periods do not create duplicate obligations.
- [ ] Library / Transport / Inventory: open each module and verify data loads and actions are available to Admin.

## 3. Principal acceptance test

- [ ] Dashboard loads.
- [ ] Students are readable across the school.
- [ ] Staff directory is readable.
- [ ] Classes, timetable, attendance, exams and report cards are readable.
- [ ] Fee payments / finance read views are accessible.
- [ ] Accounts summary is readable.
- [ ] User Management is forbidden (HTTP 403 / no Admin controls).
- [ ] Principal cannot use Admin-only academic-structure or user-management controls.

## 4. Teacher acceptance test

Use a Teacher account assigned to one class.

- [ ] Dashboard loads without finance totals being exposed.
- [ ] Student list contains only students the teacher is allowed to see.
- [ ] Attendance opens for the assigned class and requires a class/date before saving.
- [ ] A student from another class cannot be submitted into the teacher's attendance class through direct API behavior.
- [ ] Exams/results visible to the teacher belong only to assigned classes.
- [ ] Timetable shows assigned-class slots.
- [ ] Staff directory is forbidden.
- [ ] Fee payments and Accounts are forbidden.
- [ ] Admin User Management is forbidden.

## 5. Accountant acceptance test

- [ ] Accountant dashboard loads finance information.
- [ ] Fee payment list, outstanding balances and collection totals load.
- [ ] Partial payments reconcile to the remaining obligation balance rather than summing historical row balances.
- [ ] Accounts income/expense view loads and transactions can be created/edited/deleted according to Accountant permissions.
- [ ] Payroll loads and can be generated/marked paid according to Accountant permissions.
- [ ] Student academic administration and Admin user management remain unavailable.

## 6. Academic workflow demo

Use a DEMO student/class where possible.

1. Open Classes and show class/teacher assignment.
2. Open Students and show admission/class/parent information.
3. Open Attendance and show one class/date attendance register.
4. Open Exams & Results and show an exam for that class.
5. Enter or inspect subject marks. Confirm marks cannot exceed max marks.
6. Open Report Cards. Confirm:
   - students with no results show `No results entered` / `Not ranked`;
   - ties share the same position;
   - class size and ranked student count are distinct;
   - an ungraded report card cannot be printed as a completed academic result.
7. Open Certificates and show official certificate history/issuance controls.

## 7. Finance workflow demo

1. Open Fee Structures and explain class/frequency configuration.
2. Open Fee Payments and show a student's obligation.
3. Demonstrate or explain a partial payment: the remaining balance must decrease from the current obligation rather than double-counting past balances.
4. Open Reports/Dashboard and confirm fee collection totals match money actually received (`paidAmount`).
5. Open Accounts and show income vs expenses and net balance.
6. Open Payroll and show basic salary + allowances - deductions = net salary.
7. Print one safe example report/receipt/payslip if appropriate.

## 8. Operations / records demo

- [ ] Timetable: no duplicate class day/period slots and no teacher double-booking.
- [ ] Library: borrowing/return quantities remain consistent.
- [ ] Transport: assignments reference valid students/routes.
- [ ] Inventory: quantities/conditions validate correctly.
- [ ] Messages: teacher/principal visibility respects role/class scope.

## 9. Security checks

- [ ] Old shared seed password is rejected for every production role account.
- [ ] Password change requires at least 12 characters and revokes other sessions.
- [ ] Unauthenticated `/api/students` returns HTTP 401.
- [ ] Teacher finance/admin endpoints return HTTP 403.
- [ ] Principal Admin User Management returns HTTP 403.
- [ ] No hard-coded production password exists in the current repository tree.
- [ ] `.env` files and Render secrets are not committed to Git.

## 10. Suggested owner demo order

Keep the first owner walkthrough focused on outcomes rather than implementation details:

1. **Dashboard** — school at a glance.
2. **Students + Staff + Classes** — central records.
3. **Attendance** — daily school operations.
4. **Exams + Report Cards** — academic workflow.
5. **Fees + Accounts + Reports** — finance visibility and reconciliation.
6. **Payroll** — staff payment management.
7. **Library + Transport + Inventory + Timetable** — operational modules.
8. **Role-based access** — briefly show Teacher/Principal/Accountant differences.
9. **Settings / Profile security** — school configuration and password management.

## 11. Demo-data discipline

- Prefix temporary records with `DEMO` so they are easy to identify.
- Never delete a real student/staff member to demonstrate deletion.
- Do not enter fake fee payments against a real student's account.
- Prefer reading existing real records and performing writes only on dedicated DEMO records.
- Remove DEMO records after the presentation if they are no longer useful.
