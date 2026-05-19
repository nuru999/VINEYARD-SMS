import { Route, Switch, Redirect, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Provider } from "./components/provider";
import { AgentFeedback } from "@runablehq/website-runtime";
import { useRole } from "./lib/use-role";

// Pages
import SignIn from "./pages/sign-in";
import Dashboard from "./pages/index";
import TeacherDashboard from "./pages/teacher-dashboard";
import StudentsPage from "./pages/students";
import StaffPage from "./pages/staff";
import ClassesPage from "./pages/classes";
import AttendancePage from "./pages/attendance";
import FeesPage from "./pages/fees";
import ExamsPage from "./pages/exams";
import PayrollPage from "./pages/payroll";
import CertificatesPage from "./pages/certificates";
import ReportCardsPage from "./pages/reportcards";
import AccountsPage from "./pages/accounts";
import ReportsPage from "./pages/reports";
import TimetablePage from "./pages/timetable";
import CommunicationPage from "./pages/communication";
import TransportPage from "./pages/transport";
import LibraryPage from "./pages/library";
import InventoryPage from "./pages/inventory";
import UserManagementPage from "./pages/user-management";

function useAuth() {
  const { data, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const r = await fetch("/api/auth/get-session", { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
  return { user: data?.user ?? null, isLoading };
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
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

  if (!user) return null;

  return <Component />;
}

// Admin/principal-only wrapper: redirects teachers to home
function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isPrincipal, role, isLoading: roleLoading } = useRole();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) navigate("/sign-in");
    if (!authLoading && !roleLoading && user && !(isAdmin || isPrincipal)) navigate("/");
  }, [authLoading, roleLoading, user, isAdmin]);

  if (authLoading || roleLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #E2E8F0", borderTop: "3px solid #E91E8C", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!user || !(isAdmin || isPrincipal)) return null;

  return <Component />;
}

function RoleDashboard() {
  const { isAdmin, isLoading } = useRole();
  if (isLoading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #E2E8F0", borderTop: "3px solid #E91E8C", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
  return isAdmin ? <Dashboard /> : <TeacherDashboard />;
}

function App() {
  return (
    <Provider>
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

        {/* Admin only */}
        <Route path="/staff" component={() => <AdminRoute component={StaffPage} />} />
        <Route path="/fees" component={() => <AdminRoute component={FeesPage} />} />
        <Route path="/payroll" component={() => <AdminRoute component={PayrollPage} />} />
        <Route path="/accounts" component={() => <AdminRoute component={AccountsPage} />} />
        <Route path="/reports" component={() => <AdminRoute component={ReportsPage} />} />
        <Route path="/user-management" component={() => <AdminRoute component={UserManagementPage} />} />

        <Route component={() => <Redirect to="/" />} />
      </Switch>
      {import.meta.env.DEV && <AgentFeedback />}
    </Provider>
  );
}

export default App;
