import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Fees from './pages/Fees';
import Grades from './pages/Grades';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import Attendance from './pages/Attendance';
import ProtectedRoute from './components/ProtectedRoute';

export default function Router() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/grades" element={<Grades />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['principal', 'bursar', 'super_admin']} />}>
        <Route path="/fees" element={<Fees />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['principal', 'super_admin']} />}>
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['principal', 'super_admin', 'teacher']} />}>
        <Route path="/attendance" element={<Attendance />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
