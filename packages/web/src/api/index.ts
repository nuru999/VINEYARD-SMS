import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { authMiddleware } from "./middleware/auth";
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

const app = new Hono()
  .use(cors({ origin: "*" }))
  .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .basePath("api")
  .use("*", authMiddleware)
  .get("/health", (c) => c.json({ status: "ok" }, 200))
  .route("/students", students)
  .route("/staff", staffRoutes)
  .route("/classes", classesRoutes)
  .route("/sections", sectionsRoutes)
  .route("/subjects", subjectsRoutes)
  .route("/attendance", attendanceRoutes)
  .route("/staff-attendance", staffAttendanceRoutes)
  .route("/fee-structures", feeStructuresRoutes)
  .route("/fee-payments", feePaymentsRoutes)
  .route("/exams", examsRoutes)
  .route("/results", resultsRoutes)
  .route("/payroll", payrollRoutes)
  .route("/certificates", certificatesRoutes)
  .route("/accounts", accountsRoutes)
  .route("/dashboard", dashboardRoutes);

export type AppType = typeof app;
export default app;
