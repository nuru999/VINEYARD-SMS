import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Nav items filtered by role — matches your routes.jsx exactly
  const allNavItems = [
    { name: 'Dashboard', path: '/', icon: '📊', roles: ['principal', 'super_admin', 'bursar', 'teacher'] },
    { name: 'Students', path: '/students', icon: '🎓', roles: ['principal', 'super_admin', 'bursar', 'teacher'] },
    { name: 'Grades', path: '/grades', icon: '📝', roles: ['principal', 'super_admin', 'bursar', 'teacher'] },
    { name: 'Reports', path: '/reports', icon: '📄', roles: ['principal', 'super_admin', 'bursar', 'teacher'] },
    { name: 'Attendance', path: '/attendance', icon: '📅', roles: ['principal', 'super_admin', 'teacher'] },
    { name: 'Fees', path: '/fees', icon: '💰', roles: ['principal', 'bursar', 'super_admin'] },
    { name: 'Settings', path: '/settings', icon: '⚙️', roles: ['principal', 'super_admin'] },
    { name: 'Admin', path: '/admin', icon: '🛡️', roles: ['principal', 'super_admin'] },
  ];

  const userRole = user?.role || '';
  const navItems = allNavItems.filter((item) => item.roles.includes(userRole));

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-6 border-b border-slate-200">
          <img
            src={user?.school_logo || '/vineyard-school.png'}
            alt="Logo"
            className="h-8 w-8 rounded object-cover"
            onError={(e) => {
              e.target.src = '/vineyard-school.png';
            }}
          />
          <span className="font-bold text-slate-900 truncate text-sm">VINEYARD SMS</span>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* LOGOUT BUTTON ONLY */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <span>🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">
                {user?.first_name && user?.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user?.email || 'User'}
              </p>
              <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ') || 'Admin'}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-lg">
              👤
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}