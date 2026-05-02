import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

const navItems = [
  { label: 'Dashboard', path: '/', icon: '📊', roles: ['principal', 'teacher', 'super_admin', 'bursar'] },
  { label: 'Students', path: '/students', icon: '👥', roles: ['principal', 'teacher', 'super_admin'] },
  { label: 'Fees', path: '/fees', icon: '💰', roles: ['principal', 'super_admin', 'bursar'] },
  { label: 'Grades', path: '/grades', icon: '📝', roles: ['principal', 'teacher', 'super_admin'] },
  { label: 'Reports', path: '/reports', icon: '📈', roles: ['principal', 'teacher', 'super_admin'] },
  { label: 'Settings', path: '/settings', icon: '⚙️', roles: ['principal', 'super_admin'] }
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const logoUrl = user?.school_logo || '/vineyard-school.png';
  const schoolName = user?.school_name || user?.schoolName || 'VINEYARD';

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleNavItems = navItems.filter((item) => !user?.role || item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white p-6 shadow-soft border border-slate-100 transition-transform lg:static lg:translate-x-0 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMenuOpen(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 lg:hidden"
          >
            ✕
          </button>

          {/* Logo Section */}
          <div className="mb-10 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <img
                src={logoUrl}
                alt="School logo"
                className="h-10 w-10 rounded-lg object-cover border border-slate-200"
              />
              <div>
                <h1 className="text-xl font-bold text-slate-900">{schoolName}</h1>
                <p className="text-xs text-slate-500">SMS</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 ml-0">School management system</p>
          </div>

          {/* User Info */}
          {user && (
            <div className="mb-8 rounded-lg bg-gradient-soft border border-slate-200 p-4 text-sm">
              <p className="text-xs text-slate-600 uppercase font-semibold">Logged in as</p>
              <p className="mt-2 font-semibold text-slate-900">
                {user.first_name} {user.last_name}
              </p>
              <p className="mt-1 text-xs text-slate-500 capitalize">
                <span className="inline-block rounded-full bg-primary-100 text-primary-700 px-2 py-1 mt-2 font-medium">
                  {user.role?.replace('_', ' ')}
                </span>
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-gradient-primary text-white shadow-soft'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
                end={item.path === '/'}
              >
                <span className="flex items-center gap-3">
                  {item.icon}
                  {item.label}
                </span>
              </NavLink>
            ))}
          </nav>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-full rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 border border-red-200 mt-6"
          >
            Sign out
          </button>
        </aside>

        {/* Mobile overlay */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        <main className="flex-1 rounded-2xl bg-white p-8 shadow-soft border border-slate-100">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Hamburger button */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <img
                  src={logoUrl}
                  alt="School logo"
                  className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                />
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">School Management</h2>
                  <p className="mt-1 text-slate-600">Manage students, fees, grades and reports.</p>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm text-primary-700 font-medium">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              Live Data
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
