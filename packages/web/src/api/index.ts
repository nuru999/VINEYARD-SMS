import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { authMiddleware, requireAdminOrPrincipal, requireFinanceAccess, requireSchoolOperationsAccess } from "./middleware/auth";
import { userManagementRoutes } from "./routes/user-management";
import { adminSecurityRoutes } from "./routes/admin-security";
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
import { settingsRoutes } from "./routes/settings";

const PRODUCTION_URL = "https://vineyard-sms-gq1q.onrender.com";
const OLD_PRODUCTION_URL = "https://vineyard-sms.onrender.com";

// Build allowed origins list — always include production + localhost variants
const allowedOrigins = [
  PRODUCTION_URL,
  OLD_PRODUCTION_URL,
  process.env.WEBSITE_URL,
  process.env.REMOTE_URL,
  "http://localhost:3000",
  "http://localhost:4200",
  "http://localhost:5173",
].filter(Boolean) as string[];

function deployedCommit() {
  const sha = String(process.env.RENDER_GIT_COMMIT || "").trim();
  return sha ? sha.slice(0, 12) : null;
}

const app = new Hono()
  .onError((err, c) => {
    console.error("[API Error]", err);
    return c.json({ message: err.message || "Internal server error" }, 500);
  })
  .use(
    cors({
      origin: (requestOrigin) => {
        // Electron sends null or file:// — allow it
        if (!requestOrigin || requestOrigin === "null" || requestOrigin.startsWith("file://")) {
          return requestOrigin || "null";
        }
        // Allow any listed origin. An unlisted browser origin receives a non-matching
        // Access-Control-Allow-Origin value and is therefore rejected by the browser.
        return allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
      },
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    })
  )
  .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .basePath("api")

  // Public liveness endpoint for Render/uptime probes. Keep this before the
  // authentication middleware so infrastructure can verify the process without
  // receiving a 401. The commit is a public Git SHA only; no secrets or school
  // data are exposed.
  .get("/health", (c) => c.json({ status: "ok", commit: deployedCommit() }, 200))

  // Every application route below this point requires an authenticated session.
  .use("*", authMiddleware)

  // School operations are available to Admin, Principal and Teacher only.
  // Guard both collection roots and nested resource paths so Accountant cannot
  // bypass the finance-only UI by calling an academic/operations API directly.
  .use("/students", requireSchoolOperationsAccess)
  .use("/students/*", requireSchoolOperationsAccess)
  // The rich student profile includes fee/payment data, so it is intentionally
  // restricted to Admin/Principal. Teachers can still access their scoped
  // student list and basic student detail without receiving financial records.
  .use("/students/:id/profile", requireAdminOrPrincipal)
  .use("/classes", requireSchoolOperationsAccess)
  .use("/classes/*", requireSchoolOperationsAccess)
  .use("/sections", requireSchoolOperationsAccess)
  .use("/sections/*", requireSchoolOperationsAccess)
  .use("/subjects", requireSchoolOperationsAccess)
  .use("/subjects/*", requireSchoolOperationsAccess)
  .use("/attendance", requireSchoolOperationsAccess)
  .use("/attendance/*", requireSchoolOperationsAccess)
  .use("/staff-attendance", requireSchoolOperationsAccess)
  .use("/staff-attendance/*", requireSchoolOperationsAccess)
  .use("/exams", requireSchoolOperationsAccess)
  .use("/exams/*", requireSchoolOperationsAccess)
  .use("/results", requireSchoolOperationsAccess)
  .use("/results/*", requireSchoolOperationsAccess)
  .use("/certificates", requireSchoolOperationsAccess)
  .use("/certificates/*", requireSchoolOperationsAccess)
  .use("/timetable", requireSchoolOperationsAccess)
  .use("/timetable/*", requireSchoolOperationsAccess)
  .use("/messages", requireSchoolOperationsAccess)
  .use("/messages/*", requireSchoolOperationsAccess)
  .use("/transport", requireSchoolOperationsAccess)
  .use("/transport/*", requireSchoolOperationsAccess)
  .use("/library", requireSchoolOperationsAccess)
  .use("/library/*", requireSchoolOperationsAccess)
  .use("/inventory", requireSchoolOperationsAccess)
  .use("/inventory/*", requireSchoolOperationsAccess)
  .use("/report-cards", requireSchoolOperationsAccess)
  .use("/report-cards/*", requireSchoolOperationsAccess)

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

  // Staff: admin + principal only
  .use("/staff/*", requireAdminOrPrincipal)
  .route("/staff", staffRoutes)

  // Fee structures: finance roles can read; admin/accountant writes are enforced inside the route.
  .route("/fee-structures", feeStructuresRoutes)

  // Fee payments: all finance roles can read; admin/accountant writes are enforced inside the route.
  .use("/fee-payments/*", requireFinanceAccess)
  .route("/fee-payments", feePaymentsRoutes)

  // Payroll: finance roles can read; admin/accountant writes are enforced inside the route.
  .route("/payroll", payrollRoutes)

  // Accounts/transactions: finance roles can read; admin/accountant writes are enforced inside the route.
  .route("/accounts", accountsRoutes)

  // User management and security are role-restricted inside their routes.
  .route("/me", userManagementRoutes)
  .route("/admin-security", adminSecurityRoutes)
  .route("/settings", settingsRoutes);

export type AppType = typeof app;
export default app;
