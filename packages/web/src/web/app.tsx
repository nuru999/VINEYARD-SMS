import { Route, Switch, Redirect, useLocation } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { Provider } from "./components/provider";
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
const PrincipalFeesPage = lazy(() => import("./pages/principal-fees"));
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
const AdminSecurityPage = lazy(() => import("./pages/admin-security"));
const ProfilePage = lazy(() => import("./pages/profile"));
const StudentProfilePage = lazy(() => import("./pages/student-profile"));
const SettingsPage = lazy(() => import("./pages/settings"));

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

function RoleFeesPage() {
  const { isPrincipal } = useRole();
  return isPrincipal ? <PrincipalFeesPage /> : <FeesPage />;
}

function App() {
  return (
    <Provider>
      <Suspense fallback={<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC" }}><div style={{ width: 32, height: 32, border: "3px solid #E2E8F0", borderTop: "3px solid #E91E8C", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /></div>}>
        <Switch>
        <Route path="/sign-in" component={SignIn} />

        <Route path="/" component={() => <ProtectedRoute component={RoleDashboard} />} />

        {/* School operations: Accountant is finance-only and cannot enter these routes directly. */}
        <Route path="/students" component={() => <ProtectedRoleRoute component={StudentsPage} allowedRoles={["admin", "principal", "teacher"]} />} />
        <Route path="/students/:id" component={() => <ProtectedRoleRoute component={StudentProfilePage} allowedRoles={["admin", "principal", "teacher"]} />} />
        <Route path="/classes" component={() => <ProtectedRoleRoute component={ClassesPage} allowedRoles={["admin", "principal", "teacher"]} />} />
        <Route path="/attendance" component={() => <ProtectedRoleRoute component={AttendancePage} allowedRoles={["admin", "principal", "teacher"]} />} />
        <Route path="/exams" component={() => <ProtectedRoleRoute component={ExamsPage} allowedRoles={["admin", "principal", "teacher"]} />} />
        <Route path="/timetable" component={() => <ProtectedRoleRoute component={TimetablePage} allowedRoles={["admin", "principal", "teacher"]} />} />
        <Route path="/communication" component={() => <ProtectedRoleRoute component={CommunicationPage} allowedRoles={["admin", "principal", "teacher"]} />} />
        <Route path="/transport" component={() => <ProtectedRoleRoute component={TransportPage} allowedRoles={["admin", "principal", "teacher"]} />} />
        <Route path="/library" component={() => <ProtectedRoleRoute component={LibraryPage} allowedRoles={["admin", "principal", "teacher"]} />} />
        <Route path="/inventory" component={() => <ProtectedRoleRoute component={InventoryPage} allowedRoles={["admin", "principal", "teacher"]} />} />

        {/* Academic records: admin + principal + teacher */}
        <Route path="/certificates" component={() => <ProtectedRoleRoute component={CertificatesPage} allowedRoles={["admin", "principal", "teacher"]} />} />
        <Route path="/report-cards" component={() => <ProtectedRoleRoute component={ReportCardsPage} allowedRoles={["admin", "principal", "teacher"]} />} />

        {/* Admin + Principal */}
        <Route path="/staff" component={() => <ProtectedRoleRoute component={StaffPage} allowedRoles={["admin", "principal"]} />} />

        {/* Finance: Principal receives read-only fee oversight; Admin/Accountant receive operational fee controls. */}
        <Route path="/fees" component={() => <ProtectedRoleRoute component={RoleFeesPage} allowedRoles={["admin", "principal", "accountant"]} />} />
        <Route path="/reports" component={() => <ProtectedRoleRoute component={ReportsPage} allowedRoles={["admin", "principal", "accountant"]} />} />
        <Route path="/payroll" component={() => <ProtectedRoleRoute component={PayrollPage} allowedRoles={["admin", "principal", "accountant"]} />} />
        <Route path="/accounts" component={() => <ProtectedRoleRoute component={AccountsPage} allowedRoles={["admin", "principal", "accountant"]} />} />

        {/* Admin only */}
        <Route path="/user-management" component={() => <ProtectedRoleRoute component={UserManagementPage} allowedRoles={["admin"]} />} />
        <Route path="/admin-security" component={() => <ProtectedRoleRoute component={AdminSecurityPage} allowedRoles={["admin"]} />} />
        <Route path="/settings" component={() => <ProtectedRoleRoute component={SettingsPage} allowedRoles={["admin"]} />} />

        {/* All roles — personal profile/password management */}
        <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />

        <Route component={() => <Redirect to="/" />} />
        </Switch>
      </Suspense>
    </Provider>
  );
}

export default App;