import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { authMiddleware, requireAdmin } from "./middleware/auth";
import { userManagementRoutes } from "./routes/user-management";
import { students } from "./routes/students";
import { staffRoutes } from "./routes/staff";
import { classesRoutes, sectionsRoutes, subjectsRoutes } from "./routes/classes";
import { attendanceRoutes, staffAttendanceRoutes } from "./routes/attendance";
import { feeStructuresRoutes, feePaymentsRoutes } from "./routes/fees";
import { examsRoutes, resultsRoutes } from "./routes/exams";
import { payrollRoutes } from "./routes/payroll";
import { certificatesRoutes } from "./routes/certificates";
import { accountsRoutes } from "./routes/accounts";
import { dashboardRoutes } from "./routes/dashboard";
import timetableRoutes from "./routes/timetable";
import messagesRoutes from "./routes/messages";
import transportRoutes from "./routes/transport";
import libraryRoutes from "./routes/library";
import inventoryRoutes from "./routes/inventory";
import reportCardsRoutes from "./routes/reportcards";

const app = new Hono()
  .use(cors({ origin: process.env.WEBSITE_URL || "*", credentials: true }))
  .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .basePath("api")
  .use("*", authMiddleware)
  .get("/health", (c) => c.json({ status: "ok" }, 200))

  // ── Routes open to all authenticated users (teachers + admins) ──
  .route("/students", students)
  .route("/classes", classesRoutes)
  .route("/sections", sectionsRoutes)
  .route("/subjects", subjectsRoutes)
  .route("/attendance", attendanceRoutes)
  .route("/staff-attendance", staffAttendanceRoutes)
  .route("/exams", examsRoutes)
  .route("/results", resultsRoutes)
  .route("/certificates", certificatesRoutes)
  .route("/dashboard", dashboardRoutes)
  .route("/timetable", timetableRoutes)
  .route("/messages", messagesRoutes)
  .route("/transport", transportRoutes)
  .route("/library", libraryRoutes)
  .route("/inventory", inventoryRoutes)
  .route("/report-cards", reportCardsRoutes)

  // ── Admin-only routes ──
  .use("/staff/*", requireAdmin)
  .route("/staff", staffRoutes)

  .use("/fee-structures/*", requireAdmin)
  .route("/fee-structures", feeStructuresRoutes)

  .use("/fee-payments/*", requireAdmin)
  .route("/fee-payments", feePaymentsRoutes)

  .use("/payroll/*", requireAdmin)
  .route("/payroll", payrollRoutes)

  .use("/accounts/*", requireAdmin)
  .route("/accounts", accountsRoutes)

  // ── User management (admin only, handled inside the route) ──
  .route("/me", userManagementRoutes);

export type AppType = typeof app;
export default app;
