import { Route, Switch, Redirect, useLocation } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { Provider } from "./components/provider";
import { AgentFeedback } from "@runablehq/website-runtime";
import { useRole } from "./lib/use-role";

// Pages
import SignIn from "./pages/sign-in";
const Dashboard = lazy(() => import("./pages/index"));
const PrincipalDashboard = lazy(() => import("./pages/principal-dashboard"));
const TeacherDashboard = lazy(() => import("./pages/teacher-dashboard"));
const AccountantDashboard = lazy(() => import("./pages/accountant-dashboard"));
const StudentsPage = lazy(() => import("./pages/students"));
const StaffPage = lazy(() => import("./pages/staff"));
const ClassesPage = lazy(() => import("./pages/classes"));
const AttendancePage = lazy(() => import("./pages/attendance"));
const FeesPage = lazy(() => import("./pages/fees"));
const ExamsPage = lazy(() => import("./pages/exams"));
const PayrollPage = lazy(() => import("./pages/payroll"));
const CertificatesPage = lazy(() => import("./pages/certificates"));
const ReportCardsPage = lazy(() => import("./pages/reportcards"));
const AccountsPage = lazy(() => import("./pages/accounts"));
const ReportsPage = lazy(() => import("./pages/reports"));
const TimetablePage = lazy(() => import("./pages/timetable"));
const CommunicationPage = lazy(() => import("./pages/communication"));
const TransportPage = lazy(() => import("./pages/transport"));
const LibraryPage = lazy(() => import("./pages/library"));
const InventoryPage = lazy(() => import("./pages/inventory"));
const UserManagementPage = lazy(() => import("./pages/user-management"));
const ProfilePage = lazy(() => import("./pages/profile"));

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useRole();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) navigate("/sign-in");
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #E2E8F0", borderTop: "3px solid #E91E8C", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!user) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC" }}><div style={{ color: "#64748B" }}>Redirecting...</div></div>;

  return <Component />;
}

function ProtectedRoleRoute({
  component: Component,
  allowedRoles,
}: {
  component: React.ComponentType;
  allowedRoles: string[];
}) {
  const { user, role, isLoading: roleLoading } = useRole();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!roleLoading && !user) navigate("/sign-in");
    if (!roleLoading && user && role && !allowedRoles.includes(role)) navigate("/");
  }, [roleLoading, user, role]);

  if (roleLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #E2E8F0", borderTop: "3px solid #E91E8C", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  const allowed = role && allowedRoles.includes(role);
  if (!user || !allowed) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC" }}><div style={{ color: "#64748B" }}>Redirecting...</div></div>;

  return <Component />;
}

function RoleDashboard() {
  const { isAdmin, isPrincipal, isAccountant, isLoading } = useRole();
  if (isLoading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #E2E8F0", borderTop: "3px solid #E91E8C", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
  return isAdmin ? <Dashboard /> : isPrincipal ? <PrincipalDashboard /> : isAccountant ? <AccountantDashboard /> : <TeacherDashboard />;
}

function App() {
  return (
    <Provider>
      <Suspense fallback={<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC" }}><div style={{ width: 32, height: 32, border: "3px solid #E2E8F0", borderTop: "3px solid #E91E8C", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /></div>}>
        <Switch>
        <Route path="/sign-in" component={SignIn} />

        {/* Dashboard — admin sees full dashboard, teacher sees teacher dashboard */}
        <Route path="/" component={() => <ProtectedRoute component={RoleDashboard} />} />
        <Route path="/students" component={() => <ProtectedRoute component={StudentsPage} />} />
        <Route path="/classes" component={() => <ProtectedRoute component={ClassesPage} />} />
        <Route path="/attendance" component={() => <ProtectedRoute component={AttendancePage} />} />
        <Route path="/exams" component={() => <ProtectedRoute component={ExamsPage} />} />
        <Route path="/certificates" component={() => <ProtectedRoute component={CertificatesPage} />} />
        <Route path="/report-cards" component={() => <ProtectedRoute component={ReportCardsPage} />} />
        <Route path="/timetable" component={() => <ProtectedRoute component={TimetablePage} />} />
        <Route path="/communication" component={() => <ProtectedRoute component={CommunicationPage} />} />
        <Route path="/transport" component={() => <ProtectedRoute component={TransportPage} />} />
        <Route path="/library" component={() => <ProtectedRoute component={LibraryPage} />} />
        <Route path="/inventory" component={() => <ProtectedRoute component={InventoryPage} />} />

        {/* Admin + Principal */}
        <Route path="/staff" component={() => <ProtectedRoleRoute component={StaffPage} allowedRoles={["admin", "principal"]} />} />

        {/* Admin + Principal + Accountant */}
        <Route path="/fees" component={() => <ProtectedRoleRoute component={FeesPage} allowedRoles={["admin", "principal", "accountant"]} />} />
        <Route path="/reports" component={() => <ProtectedRoleRoute component={ReportsPage} allowedRoles={["admin", "principal", "accountant"]} />} />

        {/* Admin + Accountant */}
        <Route path="/payroll" component={() => <ProtectedRoleRoute component={PayrollPage} allowedRoles={["admin", "accountant"]} />} />
        <Route path="/accounts" component={() => <ProtectedRoleRoute component={AccountsPage} allowedRoles={["admin", "accountant"]} />} />

        {/* Admin only */}
        <Route path="/user-management" component={() => <ProtectedRoleRoute component={UserManagementPage} allowedRoles={["admin"]} />} />

        {/* All roles — profile page */}
        <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />

        <Route component={() => <Redirect to="/" />} />
        </Switch>
      </Suspense>
      {import.meta.env.DEV && <AgentFeedback />}
    </Provider>
  );
}

export default App;
