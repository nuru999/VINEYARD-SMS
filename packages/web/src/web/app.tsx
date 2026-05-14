import { Route, Switch, Redirect, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

// Pages
import SignIn from "./pages/sign-in";
import Dashboard from "./pages/index";
import StudentsPage from "./pages/students";
import StaffPage from "./pages/staff";
import ClassesPage from "./pages/classes";
import AttendancePage from "./pages/attendance";
import FeesPage from "./pages/fees";
import ExamsPage from "./pages/exams";
import PayrollPage from "./pages/payroll";
import CertificatesPage from "./pages/certificates";
import AccountsPage from "./pages/accounts";
import ReportsPage from "./pages/reports";

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

  if (isLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0D1117" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #30363D", borderTop: "3px solid #4ADE80", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!user) {
    navigate("/sign-in");
    return null;
  }

  return <Component />;
}

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/sign-in" component={SignIn} />
        <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/students" component={() => <ProtectedRoute component={StudentsPage} />} />
        <Route path="/staff" component={() => <ProtectedRoute component={StaffPage} />} />
        <Route path="/classes" component={() => <ProtectedRoute component={ClassesPage} />} />
        <Route path="/attendance" component={() => <ProtectedRoute component={AttendancePage} />} />
        <Route path="/fees" component={() => <ProtectedRoute component={FeesPage} />} />
        <Route path="/exams" component={() => <ProtectedRoute component={ExamsPage} />} />
        <Route path="/payroll" component={() => <ProtectedRoute component={PayrollPage} />} />
        <Route path="/certificates" component={() => <ProtectedRoute component={CertificatesPage} />} />
        <Route path="/accounts" component={() => <ProtectedRoute component={AccountsPage} />} />
        <Route path="/reports" component={() => <ProtectedRoute component={ReportsPage} />} />
        <Route component={() => <Redirect to="/" />} />
      </Switch>
      {import.meta.env.DEV && <AgentFeedback />}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
