import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { authMiddleware, requireAdminOrPrincipal, requireFinanceAccess } from "./middleware/auth";
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
        if (!requestOrigin || requestOrigin === "null" || requestOrigin.startsWith("file://")) {
          return requestOrigin || "null";
        }
        return allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
      },
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    })
  )
  .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .basePath("api")
  .get("/health", (c) => c.json({ status: "ok", commit: deployedCommit() }, 200))
  .use("*", authMiddleware)

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

  .use("/staff/*", requireAdminOrPrincipal)
  .route("/staff", staffRoutes)

  .route("/fee-structures", feeStructuresRoutes)

  .use("/fee-payments/*", requireFinanceAccess)
  .route("/fee-payments", feePaymentsRoutes)

  .route("/payroll", payrollRoutes)
  .route("/accounts", accountsRoutes)

  .route("/me", userManagementRoutes)
  .route("/admin-security", adminSecurityRoutes)
  .route("/settings", settingsRoutes);

export type AppType = typeof app;
export default app;
